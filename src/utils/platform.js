/**
 * @module platform
 * @description Platform and device detection utilities.
 * All checks are performed lazily and results are cached for performance.
 */

/** @type {string|null} Cached OS result */
let cachedOS = null;

/**
 * Detect the current operating system.
 * @returns {'android'|'ios'|'windows'|'macos'|'linux'|'unknown'}
 */
export function getOS() {
  if (cachedOS !== null) {
    return cachedOS;
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  if (/Android/i.test(ua)) {
    cachedOS = 'android';
  } else if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    cachedOS = 'ios';
  } else if (/Win/.test(platform)) {
    cachedOS = 'windows';
  } else if (/Mac/.test(platform)) {
    cachedOS = 'macos';
  } else if (/Linux/.test(platform)) {
    cachedOS = 'linux';
  } else {
    cachedOS = 'unknown';
  }

  return cachedOS;
}

/**
 * Detect if the device is running Android.
 * @returns {boolean}
 */
export function isAndroid() {
  return getOS() === 'android';
}

/**
 * Detect if the device supports touch input.
 * @returns {boolean}
 */
export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator.msMaxTouchPoints !== undefined && navigator.msMaxTouchPoints > 0)
  );
}

/**
 * Detect if the device is likely a tablet.
 * Heuristic: touch-capable device with a screen wider than 600px.
 * @returns {boolean}
 */
export function isTablet() {
  return isTouchDevice() && Math.min(window.screen.width, window.screen.height) > 600;
}

/**
 * Detect if the device is a mobile phone or small-screen device.
 * Heuristic: touch-capable device with screen width ≤ 600px, or
 * Android/iOS detected with small viewport.
 * @returns {boolean}
 */
export function isMobile() {
  const os = getOS();
  const mobileOS = os === 'android' || os === 'ios';

  if (!mobileOS) {
    return false;
  }

  // On mobile OS, consider it mobile if it's NOT a tablet
  return !isTablet();
}

/**
 * Check whether the File System Access API is available.
 * This API enables direct read/write to the local filesystem and
 * is supported in Chromium-based browsers.
 * @returns {boolean}
 */
export function hasFileSystemAccess() {
  return (
    typeof window.showOpenFilePicker === 'function' &&
    typeof window.showSaveFilePicker === 'function'
  );
}
