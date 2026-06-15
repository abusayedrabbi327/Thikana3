const pool = require('../config/db');
const { createVerification, sanitizeVerification } = require('../services/identityVerificationService');
const { enqueueIdentityVerification } = require('../services/identityVerificationQueue');

async function getNidStatus(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, nid_number, full_name, dob, ocr_confidence, face_match_score,
              confidence_score, fraud_flags, verification_status, review_source,
              review_note, created_at, updated_at, reviewed_at, processed_at
       FROM identity_verifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    return res.json({ success: true, submission: sanitizeVerification(rows[0]) });
  } catch (err) {
    console.error('[getNidStatus error]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function submitNid(req, res) {
  const { nid_front_base64, nid_selfie_base64 } = req.body;
  if (!nid_front_base64 || !nid_selfie_base64) {
    return res.status(400).json({ success: false, message: 'NID front image and selfie are required.' });
  }

  try {
    const { rows: pending } = await pool.query(
      `SELECT id FROM identity_verifications
       WHERE user_id = $1 AND verification_status IN ('pending', 'processing', 'review')
       LIMIT 1`,
      [req.user.id]
    );

    if (pending.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a verification request pending review.' });
    }

    const { verification } = await createVerification({
      userId: req.user.id,
      nidFrontBase64: nid_front_base64,
      selfieBase64: nid_selfie_base64,
    });

    enqueueIdentityVerification(verification.id);

    return res.status(202).json({
      success: true,
      message: 'Identity verification submitted. Automated checks are processing now.',
      submission: sanitizeVerification(verification),
    });
  } catch (err) {
    console.error('[submitNid error]', err);
    const status = err.status || (err.message?.includes('Invalid') || err.message?.includes('Unsupported') ? 400 : 500);
    return res.status(status).json({
      success: false,
      message: status === 500 ? 'Server error while uploading NID.' : err.message,
    });
  }
}

module.exports = { getNidStatus, submitNid };
