const fs = require('fs');
const config = require('../config/identityVerification');
const { normalizeNid } = require('../utils/kycCrypto');

let tesseract = null;
try {
  tesseract = require('tesseract.js');
} catch (_err) {
  tesseract = null;
}

const KEYWORDS = [
  '\u099c\u09be\u09a4\u09c0\u09af\u09bc \u09aa\u09b0\u09bf\u099a\u09af\u09bc\u09aa\u09a4\u09cd\u09b0',
  'national id card',
  'nid',
  'date of birth',
  'dob',
];

const BANGLA_TO_ENGLISH_DIGITS = {
  '\u09e6': '0',
  '\u09e7': '1',
  '\u09e8': '2',
  '\u09e9': '3',
  '\u09ea': '4',
  '\u09eb': '5',
  '\u09ec': '6',
  '\u09ed': '7',
  '\u09ee': '8',
  '\u09ef': '9',
};

const MONTHS = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

function normalizeOcrDigits(text) {
  return String(text || '').replace(/[\u09e6-\u09ef]/g, char => BANGLA_TO_ENGLISH_DIGITS[char] || char);
}

function hasBangladeshNidKeyword(text) {
  const normalized = normalizeOcrDigits(text).toLowerCase();
  return KEYWORDS.some(keyword => normalized.includes(keyword.toLowerCase()));
}

function cleanName(value) {
  return String(value || '')
    .replace(/[|_[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || null;
}

function extractNidNumber(text, submittedNid) {
  const normalizedSubmitted = normalizeNid(submittedNid);
  const normalizedText = normalizeOcrDigits(text);
  const directMatches = normalizedText.match(/\b\d{10}\b|\b\d{13}\b|\b\d{17}\b/g) || [];

  const segmentedMatches = (normalizedText.match(/(?:\d[\s\-./]*){10,17}/g) || [])
    .map(part => normalizeNid(part))
    .filter(part => /^\d{10}$|^\d{13}$|^\d{17}$/.test(part));

  const matches = [...directMatches, ...segmentedMatches]
    .map(candidate => normalizeNid(candidate))
    .filter(candidate => /^\d{10}$|^\d{13}$|^\d{17}$/.test(candidate));

  if (normalizedSubmitted && matches.includes(normalizedSubmitted)) return normalizedSubmitted;
  return matches[0] || normalizedSubmitted || '';
}

function extractDob(text) {
  const source = normalizeOcrDigits(String(text || ''));
  const numericMatch = source.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (numericMatch) {
    const [, dd, mm, yyyy] = numericMatch;
    const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }

  const monthMatch = source.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (!monthMatch) return null;
  const [, dd, monthName, yyyy] = monthMatch;
  const mm = MONTHS[monthName.toLowerCase()];
  if (!mm) return null;
  const iso = `${yyyy}-${mm}-${String(dd).padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function extractName(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^name\s*[:\-]\s*(.+)$/i);
    const name = cleanName(match?.[1]);
    if (name && /[A-Za-z]/.test(name)) return name;
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (/^name\s*[:\-]?$/i.test(lines[i]) && lines[i + 1]) {
      const name = cleanName(lines[i + 1]);
      if (name && /[A-Za-z]/.test(name)) return name;
    }
  }

  for (const line of lines) {
    const match = line.match(/^\u09a8\u09be\u09ae\s*[:\-]?\s*(.+)$/i);
    const name = cleanName(match?.[1]);
    if (name) return name;
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (/^\u09a8\u09be\u09ae\s*[:\-]?$/i.test(lines[i]) && lines[i + 1]) {
      const name = cleanName(lines[i + 1]);
      if (name) return name;
    }
  }

  const englishFallback = lines.find(line => /^[A-Z][A-Z.\s]{5,}$/.test(line));
  if (englishFallback) return cleanName(englishFallback);

  const banglaFallback = lines.find(line => /[\u0980-\u09ff]{3,}/.test(line));
  return banglaFallback ? cleanName(banglaFallback) : null;
}

function effectiveOcrConfidence({ rawConfidence, layoutDetected, extracted }) {
  let signalScore = 0;
  if (layoutDetected) signalScore += 25;
  if (extracted.nidNumber) signalScore += 30;
  if (extracted.fullName) signalScore += 20;
  if (extracted.dob) signalScore += 20;
  if (extracted.nidNumber && extracted.fullName && extracted.dob) signalScore = Math.max(signalScore, 90);

  const boosted = Math.min(98, signalScore + 5);
  return Math.max(rawConfidence, boosted);
}

function heuristicConfidence(metadata, submittedNid) {
  let confidence = 15;
  if (metadata.width && metadata.height) {
    const ratio = metadata.width / metadata.height;
    if (ratio >= 1.35 && ratio <= 1.8) confidence += 25;
    if (metadata.width >= 700 && metadata.height >= 400) confidence += 15;
  }
  if (/^\d{10}$|^\d{13}$|^\d{17}$/.test(normalizeNid(submittedNid))) confidence += 15;
  return Math.min(confidence, config.allowHeuristicApproval ? 65 : 55);
}

async function runOcr({ imagePath, metadata, submittedNid }) {
  console.log(`[ocrService] Starting OCR for image: ${imagePath}`);

  if (!tesseract) {
    console.warn('[ocrService] Tesseract not available, using heuristic mode');
    return {
      provider: 'heuristic',
      text: '',
      confidence: heuristicConfidence(metadata || {}, submittedNid),
      layoutDetected: false,
      extracted: {
        nidNumber: normalizeNid(submittedNid),
        fullName: null,
        dob: null,
      },
      warnings: ['OCR_ENGINE_NOT_INSTALLED'],
    };
  }

  console.log('[ocrService] Creating tesseract worker...');
  const worker = await tesseract.createWorker('eng+ben');
  try {
    console.log('[ocrService] Running recognition on image...');
    const result = await worker.recognize(fs.readFileSync(imagePath));
    const text = result?.data?.text || '';
    const rawConfidence = Math.max(0, Math.min(100, Number(result?.data?.confidence) || 0));
    const layoutDetected = hasBangladeshNidKeyword(text);
    const extracted = {
      nidNumber: extractNidNumber(text, submittedNid),
      fullName: extractName(text),
      dob: extractDob(text),
    };
    const confidence = effectiveOcrConfidence({ rawConfidence, layoutDetected, extracted });
    console.log(`[ocrService] OCR completed - raw: ${rawConfidence}, effective: ${confidence}, text length: ${text.length}`);

    return {
      provider: 'tesseract.js',
      text,
      rawConfidence,
      confidence,
      layoutDetected,
      extracted,
      warnings: confidence < config.minOcrConfidence ? ['LOW_OCR_CONFIDENCE'] : [],
    };
  } finally {
    await worker.terminate();
  }
}

module.exports = {
  runOcr,
  hasBangladeshNidKeyword,
  extractNidNumber,
  extractName,
  extractDob,
  effectiveOcrConfidence,
};
