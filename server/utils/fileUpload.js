const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['jpg', 'png', 'webp'];

function parseBase64Image(base64Str, options = {}) {
  const maxBytes = Number(options.maxBytes) > 0 ? Number(options.maxBytes) : MAX_IMAGE_BYTES;
  const matches = String(base64Str || '').match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid image format. Must be a base64 data URL.');
  }

  let type = matches[1].toLowerCase();
  if (type === 'jpeg') type = 'jpg';
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    throw new Error(`Unsupported file type: ${type}. Allowed: jpg, png, webp.`);
  }

  const buffer = Buffer.from(matches[2], 'base64');
  if (buffer.length > maxBytes) {
    throw new Error(`Image exceeds maximum size of ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }
  if (buffer.length < 1024) {
    throw new Error('Image is too small or blank.');
  }

  return { type, buffer, bytes: buffer.length, metadata: getImageMetadata(buffer, type) };
}

function getImageMetadata(buffer, type) {
  if (type === 'png' && buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), type };
  }

  if (type === 'jpg' && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), type };
      }
      offset += 2 + length;
    }
  }

  if (type === 'webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X' && buffer.length >= 30) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height, type };
    }
  }

  return { width: null, height: null, type };
}

function ensureImageDimensions(metadata, { minWidth = 240, minHeight = 180, maxRatio = 6 } = {}) {
  if (!metadata.width || !metadata.height) return;
  if (metadata.width < minWidth || metadata.height < minHeight) {
    throw new Error(`Image dimensions must be at least ${minWidth}x${minHeight}px.`);
  }
  const ratio = Math.max(metadata.width / metadata.height, metadata.height / metadata.width);
  if (ratio > maxRatio) {
    throw new Error('Image dimensions look invalid. Please upload a clear uncropped photo.');
  }
}

/**
 * Saves a base64 encoded image to the specified directory.
 * @param {string} base64Str - The base64 data URL string.
 * @param {string} dir - The directory inside server/uploads/.
 * @param {string} filenamePrefix - Prefix for the generated filename.
 * @returns {string} The public URL path of the saved image.
 */
function saveBase64Image(base64Str, dir, filenamePrefix, options = {}) {
  const { type, buffer, metadata } = parseBase64Image(base64Str, options);
  ensureImageDimensions(metadata);

  const filename = `${filenamePrefix}-${Date.now()}.${type}`;
  const dirPath = path.join(__dirname, '..', 'uploads', dir);
  
  // Ensure the directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  const filepath = path.join(dirPath, filename);
  fs.writeFileSync(filepath, buffer);
  return `/uploads/${dir}/${filename}`;
}

function saveSecureBase64Image(base64Str, dir, filenamePrefix, options = {}) {
  const { type, buffer, metadata } = parseBase64Image(base64Str, options);
  ensureImageDimensions(metadata);

  const safePrefix = String(filenamePrefix || 'upload').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const filename = `${safePrefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${type}`;
  const dirPath = path.join(__dirname, '..', 'secure_uploads', dir);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filepath = path.join(dirPath, filename);
  fs.writeFileSync(filepath, buffer, { mode: 0o600 });
  return { path: filepath, filename, type, bytes: buffer.length, metadata };
}

/**
 * Deletes a file from the filesystem given its public URL path.
 * @param {string} publicUrl - The public URL path of the image (e.g., /uploads/products/file.jpg).
 */
function deleteImage(publicUrl) {
  if (!publicUrl) return;
  const filename = publicUrl.split('/').pop();
  const dir = publicUrl.split('/')[2];
  const filepath = path.join(__dirname, '..', 'uploads', dir, filename);
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.error(`[deleteImage error] Could not delete ${filepath}:`, err);
  }
}

module.exports = {
  saveBase64Image,
  saveSecureBase64Image,
  parseBase64Image,
  getImageMetadata,
  deleteImage,
};
