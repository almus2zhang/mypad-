/**
 * @module encoding-converter
 * @description Converts between byte arrays (Uint8Array) and JavaScript
 * strings using the appropriate character encoding.
 *
 * Uses ONLY native browser APIs (TextDecoder / TextEncoder).
 * No Node.js dependencies (no iconv-lite).
 *
 * - Decode: TextDecoder (supports all WHATWG encodings)
 * - Encode: TextEncoder for UTF-8; manual for UTF-16; fallback to UTF-8 for others
 */

/* ------------------------------------------------------------------ */
/*  Internal: Encoding value → TextDecoder label mapping               */
/* ------------------------------------------------------------------ */

/**
 * Map our internal encoding value to the WHATWG encoding label accepted
 * by `TextDecoder`.
 *
 * @param {string} encoding
 * @returns {string}
 */
function toTextDecoderLabel(encoding) {
  /** @type {Record<string, string>} */
  const map = {
    'utf-8':       'utf-8',
    'utf-8-bom':   'utf-8',
    'utf-16le':    'utf-16le',
    'utf-16be':    'utf-16be',
    'iso-8859-1':  'iso-8859-1',
    'iso-8859-2':  'iso-8859-2',
    'iso-8859-15': 'iso-8859-15',
    'windows-1252':'windows-1252',
    'windows-1251':'windows-1251',
    'koi8-r':      'koi8-r',
    'gb2312':      'gb2312',
    'gbk':         'gbk',
    'gb18030':     'gb18030',
    'big5':        'big5',
    'shift-jis':   'shift-jis',
    'euc-jp':      'euc-jp',
    'iso-2022-jp': 'iso-2022-jp',
    'euc-kr':      'euc-kr',
  };

  return map[encoding] ?? encoding;
}

/* ------------------------------------------------------------------ */
/*  Internal: BOM helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Determine the BOM length to strip from the front of a byte buffer.
 * @param {Uint8Array} bytes
 * @param {string} encoding
 * @returns {number}
 */
function bomStripLength(bytes, encoding) {
  if (encoding === 'utf-8-bom' || encoding === 'utf-8') {
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return 3;
    }
  }
  if (encoding === 'utf-16le') {
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return 2;
    }
  }
  if (encoding === 'utf-16be') {
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return 2;
    }
  }
  return 0;
}

/**
 * Return the BOM bytes that should be prepended when encoding.
 * @param {string} encoding
 * @returns {number[]}
 */
function bomBytesForEncoding(encoding) {
  switch (encoding) {
    case 'utf-8-bom':  return [0xEF, 0xBB, 0xBF];
    case 'utf-16le':   return [0xFF, 0xFE];
    case 'utf-16be':   return [0xFE, 0xFF];
    default:           return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Internal: UTF-16 encoder (no native API for this)                  */
/* ------------------------------------------------------------------ */

/**
 * Encode a string as UTF-16 LE bytes.
 * @param {string} text
 * @returns {Uint8Array}
 */
function encodeUTF16LE(text) {
  const buf = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    buf[i * 2] = code & 0xFF;
    buf[i * 2 + 1] = (code >> 8) & 0xFF;
  }
  return buf;
}

/**
 * Encode a string as UTF-16 BE bytes.
 * @param {string} text
 * @returns {Uint8Array}
 */
function encodeUTF16BE(text) {
  const buf = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    buf[i * 2] = (code >> 8) & 0xFF;
    buf[i * 2 + 1] = code & 0xFF;
  }
  return buf;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Decode a byte buffer into a JavaScript string using the specified encoding.
 *
 * BOM bytes are automatically stripped regardless of encoding.
 *
 * @param {Uint8Array} uint8Array - Raw file bytes.
 * @param {string} encoding - Encoding value (e.g. 'utf-8', 'shift-jis').
 * @returns {string} The decoded text.
 */
export function decode(uint8Array, encoding) {
  if (!uint8Array || uint8Array.length === 0) {
    return '';
  }

  // Strip BOM if present
  const stripLen = bomStripLength(uint8Array, encoding);
  const data = stripLen > 0 ? uint8Array.subarray(stripLen) : uint8Array;

  const label = toTextDecoderLabel(encoding);
  try {
    const decoder = new TextDecoder(label, { fatal: false });
    return decoder.decode(data);
  } catch {
    // Unknown encoding label — fall back to UTF-8
    console.warn(`[encoding-converter] TextDecoder does not support "${encoding}", falling back to UTF-8`);
    return new TextDecoder('utf-8', { fatal: false }).decode(data);
  }
}

/**
 * Encode a JavaScript string into a byte buffer using the specified encoding.
 *
 * A BOM is prepended for `utf-8-bom`, `utf-16le`, and `utf-16be`.
 *
 * Note: Browser's TextEncoder only supports UTF-8.
 * For UTF-16, a manual encoder is used.
 * For CJK encodings (GBK, Big5, Shift-JIS etc.), we fall back to UTF-8
 * since there is no native browser API for encoding to these formats.
 *
 * @param {string} text - The text to encode.
 * @param {string} encoding - Target encoding value.
 * @returns {Uint8Array} The encoded bytes (including BOM if applicable).
 */
export function encode(text, encoding) {
  const bom = bomBytesForEncoding(encoding);
  let encoded;

  switch (encoding) {
    case 'utf-8':
    case 'utf-8-bom':
      encoded = new TextEncoder().encode(text);
      break;

    case 'utf-16le':
      encoded = encodeUTF16LE(text);
      break;

    case 'utf-16be':
      encoded = encodeUTF16BE(text);
      break;

    default:
      // For all other encodings (GBK, Big5, Shift-JIS, ISO-8859, etc.),
      // browser has no native encoding API beyond UTF-8.
      // Save as UTF-8 — this is the safest universal encoding.
      console.warn(`[encoding-converter] Cannot encode to "${encoding}" in browser, saving as UTF-8`);
      encoded = new TextEncoder().encode(text);
      break;
  }

  // Prepend BOM if needed
  if (bom.length > 0) {
    const result = new Uint8Array(bom.length + encoded.length);
    result.set(bom, 0);
    result.set(encoded, bom.length);
    return result;
  }

  return encoded;
}
