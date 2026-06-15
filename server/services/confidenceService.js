const config = require('../config/identityVerification');
const { normalizeNid } = require('../utils/kycCrypto');
const { getAdminRuntimeSettings } = require('./adminSettingsService');

function isValidNidFormat(value) {
  return /^\d{10}$|^\d{13}$|^\d{17}$/.test(normalizeNid(value));
}

async function calculateConfidence({ ocrResult, faceResult, duplicateDetected }) {
  const runtime = await getAdminRuntimeSettings();
  const thresholds = runtime.verification_thresholds || {};
  const parts = [];
  const scoring = config.scoring;

  if (ocrResult.layoutDetected || (ocrResult.provider === 'heuristic' && ocrResult.confidence >= 45)) {
    parts.push({ key: 'validLayout', points: scoring.validLayout });
  }

  const minOcrConfidence = Number(thresholds.min_ocr_confidence ?? config.minOcrConfidence);
  if (ocrResult.confidence >= minOcrConfidence && ocrResult.extracted?.nidNumber) {
    parts.push({ key: 'ocrExtracted', points: scoring.ocrExtracted });
  }

  if (isValidNidFormat(ocrResult.extracted?.nidNumber)) {
    parts.push({ key: 'validNidFormat', points: scoring.validNidFormat });
  }

  const minFaceMatchScore = Number(thresholds.min_face_match_score ?? config.minFaceMatchScore);
  if (faceResult.score >= minFaceMatchScore && faceResult.faceDetectedOnNid && faceResult.faceDetectedOnSelfie) {
    parts.push({ key: 'faceMatch', points: scoring.faceMatch });
  }

  if (!duplicateDetected) {
    parts.push({ key: 'noDuplicate', points: scoring.noDuplicate });
  }

  return {
    score: Math.max(0, Math.min(100, parts.reduce((sum, part) => sum + part.points, 0))),
    parts,
  };
}

async function decide({ score, fraudFlags, hardReject }) {
  const runtime = await getAdminRuntimeSettings();
  const thresholds = runtime.verification_thresholds || {};
  const reviewThreshold = Number(thresholds.manual_review_score ?? thresholds.min_manual_review_score ?? config.reviewThreshold);
  const autoApproveThreshold = Number(thresholds.auto_approve_score ?? config.autoApproveThreshold);
  const blockingFlags = new Set([
    'BLOCKED_NID',
    'DUPLICATE_NID',
    'NO_FACE_ON_SELFIE',
    'NO_FACE_ON_NID',
    'MISSING_NID_NUMBER',
    'INVALID_DOCUMENT_STRUCTURE',
  ]);
  const hasBlockingFlags = (fraudFlags || []).some(flag => blockingFlags.has(String(flag).toUpperCase()));
  if (hardReject || score < reviewThreshold) return 'rejected';
  if (score >= autoApproveThreshold && !hasBlockingFlags) return 'approved';
  return 'review';
}

module.exports = {
  calculateConfidence,
  decide,
  isValidNidFormat,
};
