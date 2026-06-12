/**
 * @module storage
 * @description Utility functions for interacting with localStorage.
 * Provides safe read/write with JSON serialization and error recovery.
 */

/**
 * Load and parse a JSON value from localStorage.
 * Returns the default value if the key doesn't exist or parsing fails.
 * @param {string} key - The localStorage key.
 * @param {*} defaultValue - Value to return on miss or error.
 * @returns {*} The parsed value or the default.
 */
export function loadJSON(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[storage] Failed to parse JSON for key "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Serialize a value to JSON and store it in localStorage.
 * @param {string} key - The localStorage key.
 * @param {*} value - The value to serialize and store.
 */
export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[storage] Failed to save JSON for key "${key}":`, err);
  }
}

/**
 * Load a raw string from localStorage.
 * @param {string} key - The localStorage key.
 * @param {string} defaultValue - Value to return if the key doesn't exist.
 * @returns {string} The stored string or the default.
 */
export function loadString(key, defaultValue = '') {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? raw : defaultValue;
  } catch (err) {
    console.warn(`[storage] Failed to load string for key "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Store a raw string in localStorage.
 * @param {string} key - The localStorage key.
 * @param {string} value - The string to store.
 */
export function saveString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.error(`[storage] Failed to save string for key "${key}":`, err);
  }
}

/**
 * Remove an item from localStorage.
 * @param {string} key - The localStorage key to remove.
 */
export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storage] Failed to remove key "${key}":`, err);
  }
}
