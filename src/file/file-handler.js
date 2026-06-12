/**
 * @module file-handler
 * @description Handles opening and saving files using the File System Access
 * API (Chromium) with graceful fallback to `<input type="file">` and
 * download links for other browsers.
 */

import { detectEncoding } from '../encoding/encoding-detector.js';
import { decode, encode } from '../encoding/encoding-converter.js';
import { hasFileSystemAccess } from '../utils/platform.js';

/* ------------------------------------------------------------------ */
/*  File type filters for the native file picker                      */
/* ------------------------------------------------------------------ */

/** @type {Array<{ description: string, accept: Record<string, string[]> }>} */
const FILE_TYPES = [
  { description: 'All Files', accept: { '*/*': [] } },
  {
    description: 'Text Files',
    accept: { 'text/plain': ['.txt', '.log', '.ini', '.cfg'] },
  },
  {
    description: 'Source Code',
    accept: {
      'text/*': ['.c', '.cpp', '.h', '.py', '.js', '.ts', '.java', '.go', '.rs'],
    },
  },
  {
    description: 'Web Files',
    accept: {
      'text/html': ['.html', '.htm', '.css', '.json', '.xml', '.svg'],
    },
  },
  {
    description: 'Script Files',
    accept: { 'text/*': ['.sh', '.bash', '.ps1', '.bat', '.cmd'] },
  },
];

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Read a File/Blob into an ArrayBuffer.
 * @param {File|Blob} file
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(/** @type {ArrayBuffer} */ (reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Create a temporary hidden `<input type="file">` and wait for the user
 * to pick a file.  This is the fallback when the File System Access API
 * is not available.
 * @returns {Promise<File>}
 */
function pickFileViaInput() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    // Accept everything
    input.accept = '*';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
        resolve(file);
      } else {
        reject(new DOMException('No file selected', 'AbortError'));
      }
      input.remove();
    });

    input.addEventListener('cancel', () => {
      reject(new DOMException('File picker cancelled', 'AbortError'));
      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Trigger a browser download of a Uint8Array blob.
 * @param {Uint8Array} data
 * @param {string} filename
 */
function downloadBlob(data, filename) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Clean up after a short delay to allow the download to start
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

/* ------------------------------------------------------------------ */
/*  FileHandler class                                                  */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} FileInfo
 * @property {string} name - The filename.
 * @property {string} content - Decoded text content.
 * @property {string} encoding - Detected or specified encoding value.
 * @property {ArrayBuffer} arrayBuffer - The raw file bytes.
 * @property {FileSystemFileHandle|null} fileHandle - Native file handle (if available).
 */

/**
 * @typedef {Object} FileHandlerCallbacks
 * @property {function(FileInfo): void} [onFileOpened] - Called after a file is opened.
 * @property {function(FileInfo): void} [onFileSaved] - Called after a file is saved.
 */

/**
 * Manages opening and saving files with encoding-aware decode/encode.
 */
export class FileHandler {
  /**
   * @param {FileHandlerCallbacks} [callbacks]
   */
  constructor(callbacks = {}) {
    /** @type {function(FileInfo): void} */
    this.onFileOpened = callbacks.onFileOpened || (() => {});
    /** @type {function(FileInfo): void} */
    this.onFileSaved = callbacks.onFileSaved || (() => {});
  }

  /* ---------------------------------------------------------------- */
  /*  Open                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Show a file picker and open the selected file.
   * Uses the File System Access API when available, falling back
   * to an `<input type="file">` element.
   *
   * @returns {Promise<FileInfo>}
   * @throws {DOMException} If the user cancels the picker (name === 'AbortError').
   */
  async openFile() {
    /** @type {File} */
    let file;
    /** @type {FileSystemFileHandle|null} */
    let fileHandle = null;

    if (hasFileSystemAccess()) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: FILE_TYPES,
          excludeAcceptAllOption: false,
        });
        fileHandle = handle;
        file = await handle.getFile();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err; // user cancelled — let caller handle
        }
        throw err;
      }
    } else {
      file = await pickFileViaInput();
    }

    const arrayBuffer = await readFileAsArrayBuffer(file);
    const uint8 = new Uint8Array(arrayBuffer);
    const detection = detectEncoding(uint8);
    const content = decode(uint8, detection.encoding);

    /** @type {FileInfo} */
    const fileInfo = {
      name: file.name,
      content,
      encoding: detection.encoding,
      arrayBuffer,
      fileHandle,
    };

    this.onFileOpened(fileInfo);
    return fileInfo;
  }

  /**
   * Open a file from a raw ArrayBuffer (e.g. received via WebDAV).
   *
   * @param {ArrayBuffer} arrayBuffer - The raw bytes.
   * @param {string} filename - Display name for the file.
   * @param {string} [encoding] - Force a specific encoding.  If omitted
   *   the encoding is auto-detected.
   * @returns {FileInfo}
   */
  openFileFromBuffer(arrayBuffer, filename, encoding) {
    const uint8 = new Uint8Array(arrayBuffer);

    if (!encoding) {
      const detection = detectEncoding(uint8);
      encoding = detection.encoding;
    }

    const content = decode(uint8, encoding);

    /** @type {FileInfo} */
    const fileInfo = {
      name: filename,
      content,
      encoding,
      arrayBuffer,
      fileHandle: null,
    };

    this.onFileOpened(fileInfo);
    return fileInfo;
  }

  /* ---------------------------------------------------------------- */
  /*  Save                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Save content to an existing file handle.
   * Falls back to download if the handle is missing or write fails.
   *
   * @param {string} content - The text to save.
   * @param {string} encoding - Target encoding value.
   * @param {FileSystemFileHandle|null} fileHandle - The file handle obtained from a previous open.
   * @returns {Promise<FileInfo>}
   */
  async saveFile(content, encoding, fileHandle) {
    const encoded = encode(content, encoding);

    if (fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(encoded);
        await writable.close();

        /** @type {FileInfo} */
        const fileInfo = {
          name: fileHandle.name,
          content,
          encoding,
          arrayBuffer: encoded.buffer,
          fileHandle,
        };

        this.onFileSaved(fileInfo);
        return fileInfo;
      } catch (err) {
        console.warn('[file-handler] Write via handle failed, falling back to download:', err);
      }
    }

    // Fallback: trigger download
    const name = fileHandle?.name || 'untitled.txt';
    downloadBlob(encoded, name);

    /** @type {FileInfo} */
    const fileInfo = {
      name,
      content,
      encoding,
      arrayBuffer: encoded.buffer,
      fileHandle: null,
    };

    this.onFileSaved(fileInfo);
    return fileInfo;
  }

  /**
   * Show a "Save As" picker and write the file.
   * Uses the File System Access API when available, falling back
   * to a download link.
   *
   * @param {string} content - The text to save.
   * @param {string} encoding - Target encoding value.
   * @param {string} [filename='untitled.txt'] - Suggested filename.
   * @returns {Promise<FileInfo>}
   */
  async saveFileAs(content, encoding, filename = 'untitled.txt') {
    const encoded = encode(content, encoding);

    if (hasFileSystemAccess()) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: FILE_TYPES,
          excludeAcceptAllOption: false,
        });

        const writable = await handle.createWritable();
        await writable.write(encoded);
        await writable.close();

        /** @type {FileInfo} */
        const fileInfo = {
          name: handle.name,
          content,
          encoding,
          arrayBuffer: encoded.buffer,
          fileHandle: handle,
        };

        this.onFileSaved(fileInfo);
        return fileInfo;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        console.warn('[file-handler] Save picker failed, falling back to download:', err);
      }
    }

    // Fallback: download
    downloadBlob(encoded, filename);

    /** @type {FileInfo} */
    const fileInfo = {
      name: filename,
      content,
      encoding,
      arrayBuffer: encoded.buffer,
      fileHandle: null,
    };

    this.onFileSaved(fileInfo);
    return fileInfo;
  }

  /**
   * Force-download the file content (no picker, no file handle).
   *
   * @param {string} content - The text to download.
   * @param {string} encoding - Target encoding value.
   * @param {string} [filename='untitled.txt'] - Filename for the download.
   * @returns {FileInfo}
   */
  downloadFile(content, encoding, filename = 'untitled.txt') {
    const encoded = encode(content, encoding);
    downloadBlob(encoded, filename);

    /** @type {FileInfo} */
    const fileInfo = {
      name: filename,
      content,
      encoding,
      arrayBuffer: encoded.buffer,
      fileHandle: null,
    };

    this.onFileSaved(fileInfo);
    return fileInfo;
  }
}
