const { cleanupRejectedImages, processVerification } = require('./identityVerificationService');
const { isTransientError, getBackoffDelay } = require('../utils/queryRetry');

const queue = [];
let active = false;

async function drain() {
  if (active) return;
  active = true;
  console.log(`[identityVerificationQueue] Starting drain with ${queue.length} jobs`);
  while (queue.length > 0) {
    const job = queue.shift();
    const attemptNum = (job.attempts || 0) + 1;
    console.log(`[identityVerificationQueue] Processing verification #${job.verificationId} (attempt ${attemptNum})`);
    try {
      const result = await processVerification(job.verificationId);
      console.log(`[identityVerificationQueue] ✓ Verification #${job.verificationId} completed with status: ${result?.verification_status}`);
    } catch (err) {
      console.error(`[identityVerificationQueue] ✗ Verification #${job.verificationId} failed (${err.code || 'ERROR'}):`, err.message);
      const isTransient = isTransientError(err);
      const maxAttempts = 3;
      if (isTransient && attemptNum < maxAttempts) {
        const delay = getBackoffDelay(attemptNum);
        console.log(`[identityVerificationQueue] Transient error — retrying in ${delay}ms (attempt ${attemptNum + 1}/${maxAttempts})...`);
        queue.push({ ...job, attempts: attemptNum });
        // Insert small delay before next attempt
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 500)));
      } else if (!isTransient) {
        console.error(`[identityVerificationQueue] Non-transient error — giving up on verification #${job.verificationId}`);
      } else {
        console.error(`[identityVerificationQueue] Max retries exceeded for verification #${job.verificationId}`);
      }
    }
  }
  console.log(`[identityVerificationQueue] Drain complete, running cleanup...`);
  cleanupRejectedImages().catch(err => console.error('[identityVerificationCleanup]', err));
  active = false;
}

function enqueueIdentityVerification(verificationId) {
  console.log(`[identityVerificationQueue] Enqueued verification #${verificationId}`);
  queue.push({ verificationId, attempts: 0 });
  setImmediate(drain);
}

module.exports = {
  enqueueIdentityVerification,
};
