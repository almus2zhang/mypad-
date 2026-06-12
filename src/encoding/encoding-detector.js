/**
 * @module encoding-detector
 * @description Detects the character encoding of a byte buffer.
 *
 * Uses ONLY browser-native logic — no Node.js dependencies.
 *
 * Detection pipeline:
 * 1. BOM sniffing (instant, 100% confidence)
 * 2. Manual UTF-8 byte-sequence validation (works offline)
 * 3. Heuristic byte-frequency analysis for CJK / legacy encodings
 */

/* ------------------------------------------------------------------ */
/*  Internal: BOM detection                                           */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} BOMResult
 * @property {string} encoding - Detected encoding value.
 * @property {number} bomLength - Length of the BOM in bytes.
 */

/**
 * Check the first bytes for a Byte Order Mark.
 * @param {Uint8Array} bytes
 * @returns {BOMResult|null} BOM info or null if no BOM found.
 */
function detectBOM(bytes) {
  if (bytes.length < 2) return null;

  // UTF-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { encoding: 'utf-8-bom', bomLength: 3 };
  }

  // UTF-16 BE
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return { encoding: 'utf-16be', bomLength: 2 };
  }

  // UTF-16 LE
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return { encoding: 'utf-16le', bomLength: 2 };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Internal: Manual UTF-8 validation                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate whether a byte buffer is well-formed UTF-8.
 *
 * @param {Uint8Array} bytes
 * @returns {{ valid: boolean, confidence: number }}
 */
function validateUTF8(bytes) {
  const len = bytes.length;
  let i = 0;
  let asciiCount = 0;
  let multiByteCount = 0;
  let invalidCount = 0;

  while (i < len) {
    const b = bytes[i];

    if (b <= 0x7F) {
      asciiCount++;
      i++;
      continue;
    }

    let continuationBytes = 0;

    if ((b & 0xE0) === 0xC0) {
      continuationBytes = 1;
      if (b < 0xC2) { invalidCount++; i++; continue; }
    } else if ((b & 0xF0) === 0xE0) {
      continuationBytes = 2;
    } else if ((b & 0xF8) === 0xF0) {
      continuationBytes = 3;
      if (b > 0xF4) { invalidCount++; i++; continue; }
    } else {
      invalidCount++;
      i++;
      continue;
    }

    if (i + continuationBytes >= len) {
      invalidCount++;
      break;
    }

    let sequenceValid = true;
    for (let j = 1; j <= continuationBytes; j++) {
      if ((bytes[i + j] & 0xC0) !== 0x80) {
        sequenceValid = false;
        break;
      }
    }

    if (!sequenceValid) {
      invalidCount++;
      i++;
      continue;
    }

    // Overlong and surrogate checks for 3-byte sequences
    if (continuationBytes === 2) {
      const cp = ((b & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F);
      if (cp < 0x0800 || (cp >= 0xD800 && cp <= 0xDFFF)) {
        invalidCount++;
        i++;
        continue;
      }
    }

    // Overlong and max-codepoint checks for 4-byte sequences
    if (continuationBytes === 3) {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3F) << 12) |
        ((bytes[i + 2] & 0x3F) << 6) |
        (bytes[i + 3] & 0x3F);
      if (cp < 0x10000 || cp > 0x10FFFF) {
        invalidCount++;
        i++;
        continue;
      }
    }

    multiByteCount++;
    i += 1 + continuationBytes;
  }

  const totalChars = asciiCount + multiByteCount + invalidCount;
  if (totalChars === 0) {
    return { valid: true, confidence: 1.0 };
  }

  const valid = invalidCount === 0;

  let confidence;
  if (!valid) {
    confidence = 0;
  } else if (multiByteCount > 0) {
    confidence = 0.95;
  } else {
    // Pure ASCII
    confidence = 0.8;
  }

  return { valid, confidence };
}

/* ------------------------------------------------------------------ */
/*  Internal: CJK / legacy encoding heuristics                        */
/* ------------------------------------------------------------------ */

/**
 * Simple heuristic to guess non-UTF-8 encoding based on byte patterns.
 *
 * @param {Uint8Array} bytes
 * @returns {{ encoding: string, confidence: number }}
 */
function guessLegacyEncoding(bytes) {
  const len = Math.min(bytes.length, 65536);

  // Count high-byte patterns typical of various encodings
  let gbkPairs = 0;    // GBK: lead 0x81-0xFE, trail 0x40-0xFE (not 0x7F)
  let big5Pairs = 0;   // Big5: lead 0xA1-0xF9, trail 0x40-0x7E or 0xA1-0xFE
  let sjisSeq = 0;     // Shift-JIS: lead 0x81-0x9F or 0xE0-0xEF, trail 0x40-0xFC (not 0x7F)
  let eucjpSeq = 0;    // EUC-JP: lead 0xA1-0xFE, trail 0xA1-0xFE
  let highBytes = 0;

  for (let i = 0; i < len - 1; i++) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];

    if (b1 < 0x80) continue;
    highBytes++;

    // GBK check
    if (b1 >= 0x81 && b1 <= 0xFE && b2 >= 0x40 && b2 <= 0xFE && b2 !== 0x7F) {
      gbkPairs++;
    }

    // Big5 check
    if (b1 >= 0xA1 && b1 <= 0xF9 &&
        ((b2 >= 0x40 && b2 <= 0x7E) || (b2 >= 0xA1 && b2 <= 0xFE))) {
      big5Pairs++;
    }

    // Shift-JIS check
    if (((b1 >= 0x81 && b1 <= 0x9F) || (b1 >= 0xE0 && b1 <= 0xEF)) &&
        b2 >= 0x40 && b2 <= 0xFC && b2 !== 0x7F) {
      sjisSeq++;
    }

    // EUC-JP check
    if (b1 >= 0xA1 && b1 <= 0xFE && b2 >= 0xA1 && b2 <= 0xFE) {
      eucjpSeq++;
    }
  }

  if (highBytes === 0) {
    return { encoding: 'windows-1252', confidence: 0.5 };
  }

  // Find the best match
  const candidates = [
    { encoding: 'gbk', score: gbkPairs },
    { encoding: 'big5', score: big5Pairs },
    { encoding: 'shift-jis', score: sjisSeq },
    { encoding: 'euc-jp', score: eucjpSeq },
  ];

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (best.score > 10) {
    // GBK is a superset of GB2312, so GBK match could be either
    const confidence = Math.min(0.85, best.score / highBytes);
    return { encoding: best.encoding, confidence };
  }

  // No strong CJK signal — likely a Western single-byte encoding
  return { encoding: 'windows-1252', confidence: 0.5 };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} DetectionResult
 * @property {string} encoding - Detected encoding value (e.g. 'utf-8').
 * @property {number} confidence - Confidence from 0 to 1.
 * @property {boolean} hasBOM - Whether a BOM was found.
 */

/**
 * Detect the character encoding of a byte buffer.
 *
 * @param {Uint8Array} uint8Array - The raw file bytes.
 * @returns {DetectionResult}
 */
export function detectEncoding(uint8Array) {
  if (!uint8Array || uint8Array.length === 0) {
    return { encoding: 'utf-8', confidence: 1.0, hasBOM: false };
  }

  // --- Step 1: BOM check ---
  const bom = detectBOM(uint8Array);
  if (bom) {
    return {
      encoding: bom.encoding,
      confidence: 1.0,
      hasBOM: true,
    };
  }

  // --- Step 2: Manual UTF-8 validation ---
  const utf8 = validateUTF8(uint8Array);
  if (utf8.valid && utf8.confidence >= 0.9) {
    return {
      encoding: 'utf-8',
      confidence: utf8.confidence,
      hasBOM: false,
    };
  }

  // --- Step 3: Heuristic-based legacy encoding detection ---
  const legacy = guessLegacyEncoding(uint8Array);

  if (legacy.confidence > 0.5) {
    return {
      encoding: legacy.encoding,
      confidence: legacy.confidence,
      hasBOM: false,
    };
  }

  // --- Step 4: Fallback ---
  if (utf8.valid) {
    return {
      encoding: 'utf-8',
      confidence: utf8.confidence,
      hasBOM: false,
    };
  }

  return {
    encoding: 'windows-1252',
    confidence: 0.5,
    hasBOM: false,
  };
}
