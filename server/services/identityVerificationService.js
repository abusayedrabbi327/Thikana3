const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const config = require('../config/identityVerification');
const { createNotification } = require('../controllers/notificationController');
const { runOcr, extractNidNumber, extractName, extractDob, effectiveOcrConfidence } = require('./ocrService');
const { compareFaces } = require('./faceMatchService');
const { collectFraudFlags, isHardReject } = require('./identityFraudService');
const { calculateConfidence, decide, isValidNidFormat } = require('./confidenceService');
const { encryptText, decryptText, hashNid, normalizeNid, maskNid } = require('../utils/kycCrypto');
const { saveSecureBase64Image } = require('../utils/fileUpload');
const { withRetry } = require('../utils/queryRetry');
const { getAdminRuntimeSettings } = require('./adminSettingsService');

function publicStatus(status) {
  return ['pending', 'processing', 'review'].includes(status) ? 'pending' : status;
}

function hasLatinText(value) {
  return /[A-Za-z]/.test(String(value || ''));
}

function pickExtractedFullName(row, ocrText) {
  const ocrName = extractName(ocrText);
  const storedName = row.extracted_full_name || (row.full_name && !row.email ? row.full_name : null);

  if (hasLatinText(ocrName)) return ocrName;
  if (hasLatinText(storedName)) return storedName;
  return ocrName || storedName || null;
}

function sanitizeVerification(row, options = {}) {
  const { maskSensitive = true } = options;
  if (!row) return null;
  let nidNumber = '';
  try {
    nidNumber = decryptText(row.nid_number);
  } catch (_err) {
    nidNumber = '';
  }
  const ocrText = row.ai_result?.ocr?.text || row.ai_result?.text || '';
  const extractedFullName = pickExtractedFullName(row, ocrText);
  const extractedDob = row.dob || extractDob(ocrText);
  const extractedNid = nidNumber || extractNidNumber(ocrText, '');
  const derivedOcrConfidence = ocrText
    ? effectiveOcrConfidence({
        rawConfidence: Number(row.ocr_confidence) || 0,
        layoutDetected: !!row.ai_result?.ocr?.layoutDetected,
        extracted: {
          nidNumber: extractedNid,
          fullName: extractedFullName,
          dob: extractedDob,
        },
      })
    : row.ocr_confidence;
  return {
    ...row,
    extracted_full_name: extractedFullName,
    dob: extractedDob,
    ocr_confidence: derivedOcrConfidence,
    status: publicStatus(row.verification_status),
    nid_number: maskSensitive ? maskNid(extractedNid) : extractedNid,
    nid_number_preview: maskSensitive ? maskNid(extractedNid) : extractedNid,
    nid_front_url: row.id ? `/api/admin/nid/${row.id}/image/nid` : null,
    nid_selfie_url: row.id ? `/api/admin/nid/${row.id}/image/selfie` : null,
  };
}

async function createVerification({ userId, nidFrontBase64, selfieBase64 }) {
  const runtimeSettings = await getAdminRuntimeSettings();
  const uploadLimits = runtimeSettings.upload_limits || {};
  const maxKycSizeMb = Number(uploadLimits.max_kyc_image_size_mb || 10);

  const existing = await pool.query(
    `SELECT id, verification_status FROM identity_verifications
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (existing.rows.length > 0 && ['pending', 'processing', 'review', 'approved'].includes(existing.rows[0].verification_status)) {
    throw Object.assign(
      new Error(existing.rows[0].verification_status === 'approved'
        ? 'Your identity is already verified.'
        : 'You already have a verification request being processed.'),
      { status: 400 }
    );
  }

  const nidImage = saveSecureBase64Image(nidFrontBase64, 'identity', `nid-front-${userId}`, { maxBytes: maxKycSizeMb * 1024 * 1024 });
  const selfieImage = saveSecureBase64Image(selfieBase64, 'identity', `selfie-${userId}`, { maxBytes: maxKycSizeMb * 1024 * 1024 });

  const ocrPreview = await runOcr({
    imagePath: nidImage.path,
    metadata: nidImage.metadata,
    submittedNid: '',
  });
  if ((ocrPreview.warnings || []).includes('OCR_ENGINE_NOT_INSTALLED')) {
    throw Object.assign(new Error('OCR engine is not available on the server. Please contact support.'), { status: 503 });
  }
  const normalizedNid = normalizeNid(ocrPreview.extracted?.nidNumber || '');
  if (!isValidNidFormat(normalizedNid)) {
    throw Object.assign(new Error('Could not detect a valid NID number from the uploaded NID front image.'), { status: 400 });
  }

  const nidHash = hashNid(normalizedNid);
  const blocked = await pool.query('SELECT id FROM blocked_nids WHERE nid_number_hash = $1 LIMIT 1', [nidHash]);
  if (blocked.rows.length > 0) {
    throw Object.assign(new Error('This NID cannot be used for verification.'), { status: 403 });
  }

  const duplicate = await pool.query(
    `SELECT id FROM identity_verifications
     WHERE nid_number_hash = $1
       AND user_id <> $2
       AND verification_status IN ('pending','processing','review','approved')
     LIMIT 1`,
    [nidHash, userId]
  );
  if (duplicate.rows.length > 0) {
    throw Object.assign(new Error('This NID is already linked to another account.'), { status: 409 });
  }

  const inserted = await pool.query(
    `INSERT INTO identity_verifications
      (user_id, nid_number, nid_number_hash, nid_image_path, selfie_image_path, verification_status, review_source, ai_result)
     VALUES ($1, $2, $3, $4, $5, 'pending', 'auto', $6)
     RETURNING *`,
    [
      userId,
      encryptText(normalizedNid),
      nidHash,
      nidImage.path,
      selfieImage.path,
      JSON.stringify({
        uploads: {
          nid: { type: nidImage.type, bytes: nidImage.bytes, metadata: nidImage.metadata },
          selfie: { type: selfieImage.type, bytes: selfieImage.bytes, metadata: selfieImage.metadata },
        },
      }),
    ]
  );

  return {
    verification: inserted.rows[0],
    imageMeta: { nid: nidImage.metadata, selfie: selfieImage.metadata },
  };
}

async function processVerification(verificationId) {
  const { rows } = await pool.query('SELECT * FROM identity_verifications WHERE id = $1 LIMIT 1', [verificationId]);
  if (rows.length === 0) {
    console.log(`[processVerification] Verification #${verificationId} not found`);
    return null;
  }
  const verification = rows[0];
  if (!['pending', 'processing'].includes(verification.verification_status)) {
    console.log(`[processVerification] Verification #${verificationId} already in status: ${verification.verification_status}`);
    return verification;
  }

  console.log(`[processVerification] Starting OCR & face match for verification #${verificationId}`);
  await pool.query('UPDATE identity_verifications SET verification_status = $1 WHERE id = $2', ['processing', verificationId]);

  const submittedNid = decryptText(verification.nid_number);
  const aiResult = verification.ai_result || {};
  const imageMeta = aiResult.uploads
    ? { nid: aiResult.uploads.nid.metadata, selfie: aiResult.uploads.selfie.metadata }
    : { nid: {}, selfie: {} };

  console.log(`[processVerification] Running OCR on verification #${verificationId}`);
  const ocrResult = await runOcr({
    imagePath: verification.nid_image_path,
    metadata: imageMeta.nid,
    submittedNid,
  });
  console.log(`[processVerification] OCR result for #${verificationId}:`, { confidence: ocrResult.confidence, extractedNid: ocrResult.extracted?.nidNumber, warnings: ocrResult.warnings });
  
  const extractedNid = normalizeNid(ocrResult.extracted?.nidNumber || submittedNid);
  const nidHash = hashNid(extractedNid);

  console.log(`[processVerification] Running face match for verification #${verificationId}`);
  const faceResult = await compareFaces({
    nidImagePath: verification.nid_image_path,
    selfieImagePath: verification.selfie_image_path,
    nidMetadata: imageMeta.nid,
    selfieMetadata: imageMeta.selfie,
  });
  console.log(`[processVerification] Face match result for #${verificationId}:`, { score: faceResult.score, warnings: faceResult.warnings });

  const fraudFlags = await collectFraudFlags(pool, {
    userId: verification.user_id,
    nidHash,
    ocrResult,
    faceResult,
    imageMeta,
  });
  console.log(`[processVerification] Fraud flags for #${verificationId}:`, fraudFlags);
  
  const duplicateDetected = fraudFlags.includes('DUPLICATE_NID');
  const confidence = await calculateConfidence({ ocrResult, faceResult, duplicateDetected });
  const hardReject = isHardReject(fraudFlags);
  const status = await decide({ score: confidence.score, fraudFlags, hardReject });
  console.log(`[processVerification] Final decision for #${verificationId}: ${status} (score: ${confidence.score})`);

  const purgeAfter = status === 'rejected'
    ? new Date(Date.now() + config.rejectedImageRetentionDays * 24 * 60 * 60 * 1000)
    : null;

  const fullName = ocrResult.extracted?.fullName || null;
  const dob = ocrResult.extracted?.dob || null;
  const reviewNote = status === 'review'
    ? 'AI verification needs admin review.'
    : status === 'rejected'
      ? 'Rejected by automated verification checks.'
      : 'Approved by automated verification checks.';

  const updated = await withRetry(
    () => pool.query(
      `UPDATE identity_verifications
       SET nid_number = $1,
           nid_number_hash = $2,
           full_name = $3,
           dob = $4,
           ocr_confidence = $5,
           face_match_score = $6,
           confidence_score = $7,
           fraud_flags = $8::jsonb,
           verification_status = $9::varchar,
           review_source = 'auto',
           review_note = $10,
           ai_result = $11,
           processed_at = NOW(),
          reviewed_at = CASE WHEN $9::varchar IN ('approved','rejected') THEN NOW() ELSE reviewed_at END,
           purge_after = $12
       WHERE id = $13
       RETURNING *`,
      [
        encryptText(extractedNid || submittedNid),
        nidHash,
        fullName,
        dob,
        ocrResult.confidence,
        faceResult.score,
        confidence.score,
        JSON.stringify(fraudFlags),
        status,
        reviewNote,
        JSON.stringify({ ...aiResult, ocr: ocrResult, face: faceResult, confidence }),
        purgeAfter,
        verificationId,
      ]
    ),
    `processVerification UPDATE for verification #${verificationId}`,
    3
  );

  await withRetry(
    () => pool.query('UPDATE users SET nid_verified = $1 WHERE id = $2', [status === 'approved', verification.user_id]),
    `Update user nid_verified for user #${verification.user_id}`,
    3
  );

  const notificationType = status === 'approved' ? 'nid_approved' : status === 'rejected' ? 'nid_rejected' : 'nid_review';
  const title = status === 'approved'
    ? 'Identity verification approved'
    : status === 'rejected'
      ? 'Identity verification rejected'
      : 'Identity verification needs review';
  const body = status === 'review'
    ? 'Your documents are being reviewed by an admin.'
    : reviewNote;
  createNotification(verification.user_id, notificationType, title, body, '/profile');

  return updated.rows[0];
}

async function manualReview({ verificationId, status, adminId, note }) {
  const { rows } = await pool.query('SELECT * FROM identity_verifications WHERE id = $1 LIMIT 1', [verificationId]);
  if (rows.length === 0) {
    throw Object.assign(new Error('Verification request not found.'), { status: 404 });
  }

  const purgeAfter = status === 'rejected'
    ? new Date(Date.now() + config.rejectedImageRetentionDays * 24 * 60 * 60 * 1000)
    : null;

  const updated = await withRetry(
    () => pool.query(
      `UPDATE identity_verifications
       SET verification_status = $1,
           review_source = 'manual',
           reviewed_by = $2,
           review_note = $3,
           reviewed_at = NOW(),
           purge_after = $4
       WHERE id = $5
       RETURNING *`,
      [status, adminId, note || null, purgeAfter, verificationId]
    ),
    `manualReview UPDATE for verification #${verificationId}`,
    3
  );

  await withRetry(
    () => pool.query('UPDATE users SET nid_verified = $1 WHERE id = $2', [status === 'approved', rows[0].user_id]),
    `Update user nid_verified for user #${rows[0].user_id} (manual)`,
    3
  );

  createNotification(
    rows[0].user_id,
    status === 'approved' ? 'nid_approved' : 'nid_rejected',
    `Identity verification ${status}`,
    `Your identity verification has been ${status}.${note ? ' Admin note: ' + note : ''}`,
    '/profile'
  );

  return updated.rows[0];
}

async function blockNidForVerification({ verificationId, adminId, reason }) {
  const { rows } = await pool.query('SELECT nid_number, nid_number_hash FROM identity_verifications WHERE id = $1 LIMIT 1', [verificationId]);
  if (rows.length === 0) {
    throw Object.assign(new Error('Verification request not found.'), { status: 404 });
  }

  await pool.query(
    `INSERT INTO blocked_nids (nid_number, nid_number_hash, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (nid_number_hash) DO UPDATE SET reason = EXCLUDED.reason`,
    [rows[0].nid_number, rows[0].nid_number_hash, reason || `Blocked by admin ${adminId}`]
  );

  return true;
}

function getSecureImagePath(row, type) {
  const selected = type === 'selfie' ? row.selfie_image_path : row.nid_image_path;
  const root = path.resolve(__dirname, '..', 'secure_uploads');
  const resolved = path.resolve(selected);
  if (!resolved.startsWith(root) || !fs.existsSync(resolved)) return null;
  return resolved;
}

async function cleanupRejectedImages() {
  try {
    const { rows } = await withRetry(
      () => pool.query(
        `SELECT id, nid_image_path, selfie_image_path, ai_result
         FROM identity_verifications
         WHERE verification_status = 'rejected'
           AND purge_after IS NOT NULL
           AND purge_after < NOW()
         LIMIT 50`
      ),
      'cleanupRejectedImages SELECT',
      2
    );

    for (const row of rows) {
      for (const imagePath of [row.nid_image_path, row.selfie_image_path]) {
        const securePath = getSecureImagePath({
          nid_image_path: imagePath,
          selfie_image_path: imagePath,
        }, 'nid');
        if (securePath) fs.unlinkSync(securePath);
      }
      await withRetry(
        () => pool.query(
          `UPDATE identity_verifications
           SET ai_result = $1, purge_after = NULL
           WHERE id = $2`,
          [JSON.stringify({ ...(row.ai_result || {}), images_purged_at: new Date().toISOString() }), row.id]
        ),
        `cleanupRejectedImages UPDATE for id=${row.id}`,
        2
      );
    }
  } catch (err) {
    console.error('[cleanupRejectedImages] Error:', err.message);
    // Don't throw, allow cleanup to fail gracefully
  }
}

module.exports = {
  createVerification,
  processVerification,
  manualReview,
  blockNidForVerification,
  sanitizeVerification,
  getSecureImagePath,
  cleanupRejectedImages,
  publicStatus,
};
