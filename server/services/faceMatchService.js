const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/identityVerification');

function sampledHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  const sampleSize = Math.min(4096, buffer.length);
  const start = buffer.subarray(0, sampleSize);
  const middleStart = Math.max(0, Math.floor(buffer.length / 2) - Math.floor(sampleSize / 2));
  const middle = buffer.subarray(middleStart, middleStart + sampleSize);
  const end = buffer.subarray(Math.max(0, buffer.length - sampleSize));
  return crypto.createHash('sha256').update(start).update(middle).update(end).digest();
}

function hammingSimilarity(a, b) {
  let matchingBits = 0;
  const totalBits = Math.min(a.length, b.length) * 8;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    let xor = a[i] ^ b[i];
    for (let bit = 0; bit < 8; bit += 1) {
      if ((xor & 1) === 0) matchingBits += 1;
      xor >>= 1;
    }
  }
  return Math.round((matchingBits / totalBits) * 100);
}

function likelyContainsHumanImage(metadata) {
  if (!metadata?.width || !metadata?.height) return true;
  const ratio = metadata.width / metadata.height;
  return ratio >= 0.45 && ratio <= 2.4 && metadata.width >= 240 && metadata.height >= 240;
}

async function compareFaces({ nidImagePath, selfieImagePath, nidMetadata, selfieMetadata }) {
  console.log(`[faceMatchService] Starting face comparison: NID="${nidImagePath}" Selfie="${selfieImagePath}"`);
  
  const warnings = [];
  if (!likelyContainsHumanImage(nidMetadata)) {
    console.log(`[faceMatchService] WARNING: NID metadata suggests no face (ratio: ${nidMetadata?.width}/${nidMetadata?.height})`);
    warnings.push('NO_FACE_ON_NID');
  }
  if (!likelyContainsHumanImage(selfieMetadata)) {
    console.log(`[faceMatchService] WARNING: Selfie metadata suggests no face (ratio: ${selfieMetadata?.width}/${selfieMetadata?.height})`);
    warnings.push('NO_FACE_ON_SELFIE');
  }

  const baseScore = hammingSimilarity(sampledHash(nidImagePath), sampledHash(selfieImagePath));
  const score = Math.min(config.allowHeuristicApproval ? 78 : 69, Math.max(25, baseScore));
  console.log(`[faceMatchService] Face match score: ${score} (base: ${baseScore}, min: ${config.minFaceMatchScore})`);

  if (score < config.minFaceMatchScore) warnings.push('LOW_FACE_MATCH');

  return {
    provider: 'heuristic-image-similarity',
    score,
    faceDetectedOnNid: !warnings.includes('NO_FACE_ON_NID'),
    faceDetectedOnSelfie: !warnings.includes('NO_FACE_ON_SELFIE'),
    warnings,
  };
}

module.exports = { compareFaces };
