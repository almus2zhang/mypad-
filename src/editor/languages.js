/**
 * @module languages
 * @description Language registry for MyPad++ with lazy-loaded CodeMirror 6
 * language support. Languages are loaded on demand via dynamic imports and
 * cached to avoid redundant network requests.
 */

/* ------------------------------------------------------------------ */
/*  Language Definitions                                                */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} LanguageDefinition
 * @property {string} name - Human-readable language name
 * @property {string[]} extensions - File extensions (without dot)
 * @property {() => Promise<import('@codemirror/language').LanguageSupport>} load
 */

/** @type {LanguageDefinition[]} */
const LANGUAGE_DEFINITIONS = [
  {
    name: 'C',
    extensions: ['c', 'h'],
    load: async () => {
      const { cpp } = await import('@codemirror/lang-cpp');
      return cpp();
    },
  },
  {
    name: 'C++',
    extensions: ['cpp', 'cc', 'cxx', 'hpp', 'hxx'],
    load: async () => {
      const { cpp } = await import('@codemirror/lang-cpp');
      return cpp();
    },
  },
  {
    name: 'Python',
    extensions: ['py', 'pyw'],
    load: async () => {
      const { python } = await import('@codemirror/lang-python');
      return python();
    },
  },
  {
    name: 'HTML',
    extensions: ['html', 'htm', 'svg'],
    load: async () => {
      const { html } = await import('@codemirror/lang-html');
      return html();
    },
  },
  {
    name: 'JSON',
    extensions: ['json'],
    load: async () => {
      const { json } = await import('@codemirror/lang-json');
      return json();
    },
  },
  {
    name: 'JavaScript',
    extensions: ['js', 'mjs', 'cjs'],
    load: async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript();
    },
  },
  {
    name: 'TypeScript',
    extensions: ['ts'],
    load: async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ typescript: true });
    },
  },
  {
    name: 'TSX',
    extensions: ['tsx'],
    load: async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ typescript: true, jsx: true });
    },
  },
  {
    name: 'JSX',
    extensions: ['jsx'],
    load: async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ jsx: true });
    },
  },
  {
    name: 'CSS',
    extensions: ['css', 'scss', 'less'],
    load: async () => {
      const { css } = await import('@codemirror/lang-css');
      return css();
    },
  },
  {
    name: 'Java',
    extensions: ['java'],
    load: async () => {
      const { java } = await import('@codemirror/lang-java');
      return java();
    },
  },
  {
    name: 'XML',
    extensions: ['xml', 'xsl', 'xsd'],
    load: async () => {
      const { xml } = await import('@codemirror/lang-xml');
      return xml();
    },
  },
  {
    name: 'Markdown',
    extensions: ['md', 'markdown'],
    load: async () => {
      const { markdown } = await import('@codemirror/lang-markdown');
      return markdown();
    },
  },
  {
    name: 'SQL',
    extensions: ['sql'],
    load: async () => {
      const { sql } = await import('@codemirror/lang-sql');
      return sql();
    },
  },
  {
    name: 'YAML',
    extensions: ['yaml', 'yml'],
    load: async () => {
      const { yaml } = await import('@codemirror/lang-yaml');
      return yaml();
    },
  },
  {
    name: 'Rust',
    extensions: ['rs'],
    load: async () => {
      const { rust } = await import('@codemirror/lang-rust');
      return rust();
    },
  },
  {
    name: 'Go',
    extensions: ['go'],
    load: async () => {
      const { go } = await import('@codemirror/lang-go');
      return go();
    },
  },
  {
    name: 'PHP',
    extensions: ['php'],
    load: async () => {
      const { php } = await import('@codemirror/lang-php');
      return php();
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Extension → Language lookup table                                   */
/* ------------------------------------------------------------------ */

/**
 * Map from file extension (without dot) to LanguageDefinition.
 * @type {Map<string, LanguageDefinition>}
 */
const extensionMap = new Map();
for (const def of LANGUAGE_DEFINITIONS) {
  for (const ext of def.extensions) {
    extensionMap.set(ext, def);
  }
}

/**
 * Map from language name (lowercase) to LanguageDefinition.
 * @type {Map<string, LanguageDefinition>}
 */
const nameMap = new Map();
for (const def of LANGUAGE_DEFINITIONS) {
  nameMap.set(def.name.toLowerCase(), def);
}

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

/**
 * Cache for loaded language support instances, keyed by language name.
 * @type {Map<string, import('@codemirror/language').LanguageSupport>}
 */
const loadCache = new Map();

/**
 * In-flight loading promises to prevent duplicate imports for the same language.
 * @type {Map<string, Promise<import('@codemirror/language').LanguageSupport>>}
 */
const loadingPromises = new Map();

/**
 * Load a language definition and cache the result.
 * @param {LanguageDefinition} def
 * @returns {Promise<import('@codemirror/language').LanguageSupport>}
 */
async function loadLanguage(def) {
  const key = def.name;

  /* Return from cache if available */
  if (loadCache.has(key)) {
    return loadCache.get(key);
  }

  /* Deduplicate in-flight requests */
  if (loadingPromises.has(key)) {
    return loadingPromises.get(key);
  }

  const promise = def.load().then((langSupport) => {
    loadCache.set(key, langSupport);
    loadingPromises.delete(key);
    return langSupport;
  });

  loadingPromises.set(key, promise);
  return promise;
}

/* ------------------------------------------------------------------ */
/*  Helper: extract extension from filename                            */
/* ------------------------------------------------------------------ */

/**
 * Extract the file extension from a filename or path.
 * @param {string} filename - Filename or full path
 * @returns {string} Lowercase extension without dot, or empty string
 */
function extractExtension(filename) {
  const base = filename.split(/[\\/]/).pop() || '';
  const dotIndex = base.lastIndexOf('.');
  if (dotIndex <= 0) return '';
  return base.slice(dotIndex + 1).toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Flat list of available languages with their extensions, suitable for UI display.
 * @type {Array<{name: string, extensions: string[]}>}
 */
export const LANGUAGE_LIST = LANGUAGE_DEFINITIONS.map((def) => ({
  name: def.name,
  extensions: [...def.extensions],
}));

/**
 * Get a LanguageSupport instance by filename.
 * The language module is dynamically imported on first use and cached.
 *
 * @param {string} filename - Filename or full path (e.g. "main.py" or "/src/app.tsx")
 * @returns {Promise<import('@codemirror/language').LanguageSupport | null>}
 *   Resolves to the LanguageSupport extension, or null if no language matches.
 */
export async function getLanguageByFilename(filename) {
  const ext = extractExtension(filename);
  if (!ext) return null;

  const def = extensionMap.get(ext);
  if (!def) return null;

  return loadLanguage(def);
}

/**
 * Get a LanguageSupport instance by language name (case-insensitive).
 * The language module is dynamically imported on first use and cached.
 *
 * @param {string} name - Language name (e.g. "JavaScript", "python")
 * @returns {Promise<import('@codemirror/language').LanguageSupport | null>}
 *   Resolves to the LanguageSupport extension, or null if the name is unknown.
 */
export async function getLanguageByName(name) {
  const def = nameMap.get(name.toLowerCase());
  if (!def) return null;

  return loadLanguage(def);
}

/**
 * Synchronously determine the language name for a given filename.
 * Does NOT load the language module — use this for display purposes only.
 *
 * @param {string} filename - Filename or full path
 * @returns {string} Language name (e.g. "JavaScript") or "Plain Text" if unknown
 */
export function getLanguageNameByFilename(filename) {
  const ext = extractExtension(filename);
  if (!ext) return 'Plain Text';

  const def = extensionMap.get(ext);
  return def ? def.name : 'Plain Text';
}
