/**
 * PreviewManager — Manages in-app embedded file viewing for PDF, Office, media, archives
 * Powered by @open-file-viewer/core with lazy loading
 * @module viewer/preview-manager
 */

let coreModule = null;
let pdfWorkerSrc = null;
let enhancedImagePluginFn = null;
let enhancedPdfPluginFn = null;

async function loadViewerDeps() {
  if (!coreModule) {
    await import('@open-file-viewer/core/style.css');
    const [core, worker, imgPlugin, pdfPlugin] = await Promise.all([
      import('@open-file-viewer/core'),
      import('pdfjs-dist/build/pdf.worker.mjs?url'),
      import('./enhanced-image-plugin.js'),
      import('./enhanced-pdf-plugin.js')
    ]);
    coreModule = core;
    pdfWorkerSrc = worker.default;
    enhancedImagePluginFn = imgPlugin.enhancedImagePlugin;
    enhancedPdfPluginFn = pdfPlugin.enhancedPdfPlugin;
  }
  return {
    core: coreModule,
    workerSrc: pdfWorkerSrc,
    enhancedImagePlugin: enhancedImagePluginFn,
    enhancedPdfPlugin: enhancedPdfPluginFn
  };
}

export const PREVIEW_EXTENSIONS = new Set([
  // Documents
  'pdf', 'docx', 'xlsx', 'xls', 'pptx', 'ppt', 'ofd', 'epub', 'xps',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif', 'tiff', 'tif',
  // Audio & Video
  'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a', 'flac',
  // Archives
  'zip', 'tar', 'gz', '7z',
  // Mindmaps
  'xmind'
]);

export function isPreviewable(filename) {
  if (!filename) return false;
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return PREVIEW_EXTENSIONS.has(ext);
}

export class PreviewManager {
  constructor() {
    this.viewer = null;
    this.container = null;
    this.currentTabId = null;
  }

  get isActive() {
    return this.viewer !== null;
  }

  /**
   * Render file preview inside container
   * @param {HTMLElement} container
   * @param {import('../tabs/tab-manager.js').Tab} tab
   * @param {'light'|'dark'|'auto'} theme
   */
  async render(container, tab, theme = 'auto') {
    this.container = container;
    this.destroy();

    this.currentTabId = tab.id;
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);font-size:14px;gap:8px;">
        <div class="preview-spinner" style="width:18px;height:18px;border:2px solid var(--border-color);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <span>Loading preview for ${tab.filename}...</span>
      </div>
    `;

    try {
      const { core, workerSrc, enhancedImagePlugin, enhancedPdfPlugin } = await loadViewerDeps();

      // Ensure tab hasn't switched while loading
      if (this.currentTabId !== tab.id) return;

      container.innerHTML = '';

      const plugins = [
        enhancedImagePlugin(),
        enhancedPdfPlugin({ workerSrc }),
        core.videoPlugin(),
        core.audioPlugin(),
        core.officePlugin(),
        core.archivePlugin(),
        core.xmindPlugin(),
        core.epubPlugin(),
        core.xpsPlugin(),
        core.fallbackPlugin()
      ];

      const currentTheme = theme === 'dark' ? 'dark' : 'light';

      this.viewer = core.createViewer({
        container,
        file: tab.previewBuffer,
        fileName: tab.filename,
        width: '100%',
        height: '100%',
        fit: 'contain',
        toolbar: true,
        theme: currentTheme,
        plugins
      });
    } catch (err) {
      console.error('Failed to render file preview:', err);
      if (this.currentTabId !== tab.id) return;

      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--danger);gap:12px;padding:2rem;text-align:center;">
          <div style="font-size:32px;">📄</div>
          <div style="font-weight:600;">Failed to render preview</div>
          <div style="font-size:12px;color:var(--text-tertiary);max-width:400px;word-break:break-all;">${err.message || 'Unsupported format or corrupted file'}</div>
          <button id="btn-download-preview-fallback" style="margin-top:8px;padding:8px 16px;background:var(--primary);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;">Download File</button>
        </div>
      `;

      const btn = container.querySelector('#btn-download-preview-fallback');
      if (btn) {
        btn.onclick = () => {
          if (!tab.previewBuffer) return;
          const blob = new Blob([tab.previewBuffer]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = tab.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };
      }
    }
  }

  setTheme(theme) {
    if (this.viewer && typeof this.viewer.setTheme === 'function') {
      this.viewer.setTheme(theme === 'dark' ? 'dark' : 'light');
    }
  }

  resize() {
    if (this.viewer && typeof this.viewer.resize === 'function') {
      this.viewer.resize();
    }
  }

  destroy() {
    if (this.viewer) {
      try {
        this.viewer.destroy();
      } catch (e) {
        console.warn('Error destroying viewer:', e);
      }
      this.viewer = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.currentTabId = null;
  }
}

export const previewManager = new PreviewManager();
