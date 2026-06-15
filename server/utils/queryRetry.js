/**
 * Query retry utility with exponential backoff and jitter.
 * Handles transient DB errors: ECONNRESET, ENOTFOUND, timeout.
 */

const TRANSIENT_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH'];
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 100;
const MAX_DELAY_MS = 3000;
const JITTER_FACTOR = 0.1; // 10% jitter

function isTransientError(err) {
  if (!err) return false;
  if (TRANSIENT_ERRORS.includes(err.code)) return true;
  if (err.message && TRANSIENT_ERRORS.some(code => err.message.includes(code))) return true;
  // PostgreSQL error codes for connection issues
  if (err.code === '42P08' && err.detail && err.detail.includes('text versus character varying')) {
    // Type coercion error — not transient, fail immediately
    return false;
  }
  return false;
}

function getBackoffDelay(attemptNumber) {
  // exponential: 100ms, 200ms, 400ms with jitter
  const exponentialDelay = INITIAL_DELAY_MS * Math.pow(2, attemptNumber - 1);
  const cappedDelay = Math.min(exponentialDelay, MAX_DELAY_MS);
  const jitter = cappedDelay * JITTER_FACTOR * (Math.random() - 0.5) * 2;
  return Math.round(cappedDelay + jitter);
}

async function withRetry(queryFn, operationName = 'query', maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) {
        // Non-transient error, fail immediately
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt);
        console.warn(`[queryRetry] ${operationName} failed (attempt ${attempt}/${maxRetries}): ${err.code || err.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[queryRetry] ${operationName} failed after ${maxRetries} attempts: ${err.code || err.message}`);
      }
    }
  }
  throw lastError;
}

module.exports = { withRetry, isTransientError, getBackoffDelay };
