/**
 * @module encoding-list
 * @description Central registry of supported character encodings, grouped
 * by language/region category.  Provides lookup utilities used by the
 * encoding detector, converter, and status-bar UI.
 */

/**
 * @typedef {Object} EncodingEntry
 * @property {string} name - Human-readable display name.
 * @property {string} value - Internal identifier (lowercase, used in APIs).
 * @property {number[]} [bom] - Optional byte-order-mark sequence.
 */

/**
 * @typedef {Object} EncodingCategory
 * @property {string} category - Category label.
 * @property {EncodingEntry[]} encodings - Encodings in this category.
 */

/**
 * Master list of supported encodings, grouped by category.
 * @type {EncodingCategory[]}
 */
export const ENCODINGS = [
  {
    category: 'Unicode',
    encodings: [
      { name: 'UTF-8', value: 'utf-8', bom: [0xEF, 0xBB, 0xBF] },
      { name: 'UTF-8 with BOM', value: 'utf-8-bom', bom: [0xEF, 0xBB, 0xBF] },
      { name: 'UTF-16 LE', value: 'utf-16le', bom: [0xFF, 0xFE] },
      { name: 'UTF-16 BE', value: 'utf-16be', bom: [0xFE, 0xFF] },
    ],
  },
  {
    category: 'Chinese (Simplified)',
    encodings: [
      { name: 'GB2312', value: 'gb2312' },
      { name: 'GBK', value: 'gbk' },
      { name: 'GB18030', value: 'gb18030' },
    ],
  },
  {
    category: 'Chinese (Traditional)',
    encodings: [
      { name: 'Big5', value: 'big5' },
    ],
  },
  {
    category: 'Japanese',
    encodings: [
      { name: 'Shift-JIS', value: 'shift-jis' },
      { name: 'EUC-JP', value: 'euc-jp' },
      { name: 'ISO-2022-JP', value: 'iso-2022-jp' },
    ],
  },
  {
    category: 'Korean',
    encodings: [
      { name: 'EUC-KR', value: 'euc-kr' },
    ],
  },
  {
    category: 'Western',
    encodings: [
      { name: 'ISO-8859-1 (Latin-1)', value: 'iso-8859-1' },
      { name: 'Windows-1252', value: 'windows-1252' },
      { name: 'ISO-8859-15', value: 'iso-8859-15' },
    ],
  },
  {
    category: 'Other',
    encodings: [
      { name: 'ISO-8859-2 (Central European)', value: 'iso-8859-2' },
      { name: 'Windows-1251 (Cyrillic)', value: 'windows-1251' },
      { name: 'KOI8-R (Russian)', value: 'koi8-r' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Pre-built lookup maps (created once at module load)               */
/* ------------------------------------------------------------------ */

/** @type {Map<string, EncodingEntry>} */
const byValue = new Map();

/** @type {EncodingEntry[]} */
const flatList = [];

for (const group of ENCODINGS) {
  for (const enc of group.encodings) {
    byValue.set(enc.value, enc);
    flatList.push(enc);
  }
}

/* ------------------------------------------------------------------ */
/*  Public helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Find an encoding entry by its value identifier.
 * @param {string} value - Encoding value (e.g. 'utf-8', 'shift-jis').
 * @returns {EncodingEntry|undefined}
 */
export function getEncodingByValue(value) {
  return byValue.get(value);
}

/**
 * Get the human-readable display name for an encoding value.
 * Falls back to the raw value if no match is found.
 * @param {string} value - Encoding value.
 * @returns {string}
 */
export function getEncodingDisplayName(value) {
  const entry = byValue.get(value);
  return entry ? entry.name : value;
}

/**
 * Return a flat array of every encoding entry across all categories.
 * The returned array is a shallow copy so callers cannot mutate the registry.
 * @returns {EncodingEntry[]}
 */
export function getAllEncodings() {
  return flatList.slice();
}
