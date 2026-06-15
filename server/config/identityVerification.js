function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

module.exports = {
  autoApproveThreshold: numberFromEnv('KYC_AUTO_APPROVE_THRESHOLD', 71),
  reviewThreshold: numberFromEnv('KYC_REVIEW_THRESHOLD', 50),
  minOcrConfidence: numberFromEnv('KYC_MIN_OCR_CONFIDENCE', 45),
  minFaceMatchScore: numberFromEnv('KYC_MIN_FACE_MATCH_SCORE', 55),
  rejectedImageRetentionDays: numberFromEnv('KYC_REJECTED_IMAGE_RETENTION_DAYS', 30),
  failedAttemptWindowHours: numberFromEnv('KYC_FAILED_ATTEMPT_WINDOW_HOURS', 24),
  maxFailedAttempts: numberFromEnv('KYC_MAX_FAILED_ATTEMPTS', 3),
  allowHeuristicApproval: process.env.KYC_ALLOW_HEURISTIC_APPROVAL === 'true',
  scoring: {
    validLayout: numberFromEnv('KYC_SCORE_LAYOUT', 20),
    ocrExtracted: numberFromEnv('KYC_SCORE_OCR', 20),
    validNidFormat: numberFromEnv('KYC_SCORE_NID_FORMAT', 15),
    faceMatch: numberFromEnv('KYC_SCORE_FACE_MATCH', 35),
    noDuplicate: numberFromEnv('KYC_SCORE_NO_DUPLICATE', 10),
  },
};
