const crypto = require('crypto');

const FALLBACK_SECRET = 'thikana-local-kyc-development-key-change-me';

function secret() {
  return process.env.KYC_ENCRYPTION_KEY || process.env.JWT_SECRET || FALLBACK_SECRET;
}

function key() {
  return crypto.createHash('sha256').update(secret()).digest();
}

function encryptText(value) {
  const text = String(value || '');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptText(value) {
  const text = String(value || '');
  if (!text.startsWith('v1:')) return text;
  const [, ivB64, tagB64, encryptedB64] = text.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function hashNid(nidNumber) {
  const normalized = normalizeNid(nidNumber);
  return crypto.createHmac('sha256', secret()).update(normalized).digest('hex');
}

function normalizeNid(value) {
  return String(value || '').replace(/\D/g, '');
}

function maskNid(value) {
  const normalized = normalizeNid(value);
  if (normalized.length <= 4) return normalized ? '****' : '';
  return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

module.exports = {
  encryptText,
  decryptText,
  hashNid,
  normalizeNid,
  maskNid,
};
