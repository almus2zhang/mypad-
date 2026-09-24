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
    this.container = null;
    this.currentTabId = null;
    /** @type {Map<string, { viewer: any, subContainer: HTMLElement, tab: any }>} */
    this.tabInstances = new Map();
  }

  get isActive() {
    return this.currentTabId !== null && this.tabInstances.has(this.currentTabId);
  }

  /**
   * Render file preview inside container (or switch to existing preview instance)
   * @param {HTMLElement} container
   * @param {import('../tabs/tab-manager.js').Tab} tab
   * @param {'light'|'dark'|'auto'} theme
   */
  async render(container, tab, theme = 'auto') {
    this.container = container;
    this.currentTabId = tab.id;

    // 1. If an instance already exists for this tab, simply show it and keep its state/scroll position intact!
    const existing = this.tabInstances.get(tab.id);
    if (existing) {
      for (const [id, item] of this.tabInstances) {
        if (item.subContainer) {
          item.subContainer.style.display = (id === tab.id ? 'block' : 'none');
        }
      }
      existing.viewer?.resize?.();
      return;
    }

    // 2. Hide other tabs' sub-containers
    for (const [, item] of this.tabInstances) {
      if (item.subContainer) {
        item.subContainer.style.display = 'none';
      }
    }

    // 3. Create a dedicated sub-container for this tab
    const subContainer = document.createElement('div');
    subContainer.className = 'preview-tab-pane';
    subContainer.dataset.tabId = tab.id;
    subContainer.style.cssText = 'width:100%;height:100%;display:block;position:relative;overflow:hidden;';

    subContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);font-size:14px;gap:8px;">
        <div class="preview-spinner" style="width:18px;height:18px;border:2px solid var(--border-color);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <span>Loading preview for ${tab.filename}...</span>
      </div>
    `;
    container.appendChild(subContainer);

    try {
      const { core, workerSrc, enhancedImagePlugin, enhancedPdfPlugin } = await loadViewerDeps();

      // Ensure tab hasn't switched while loading
      if (this.currentTabId !== tab.id) {
        subContainer.style.display = 'none';
      }

      subContainer.innerHTML = '';

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

      // Always pass a sliced copy of buffer so original tab.previewBuffer is NEVER detached!
      const safeBuffer = tab.previewBuffer ? tab.previewBuffer.slice(0) : null;

      const viewer = core.createViewer({
        container: subContainer,
        file: safeBuffer,
        fileName: tab.filename,
        width: '100%',
        height: '100%',
        fit: 'contain',
        toolbar: true,
        theme: currentTheme,
        plugins
      });

      this.tabInstances.set(tab.id, { viewer, subContainer, tab });
    } catch (err) {
      console.error('Failed to render file preview:', err);
      if (this.currentTabId !== tab.id) return;

      subContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--danger);gap:12px;padding:2rem;text-align:center;">
          <div style="font-size:32px;">📄</div>
          <div style="font-weight:600;">Failed to render preview</div>
          <div style="font-size:12px;color:var(--text-tertiary);max-width:400px;word-break:break-all;">${err.message || 'Unsupported format or corrupted file'}</div>
          <button id="btn-download-preview-fallback" style="margin-top:8px;padding:8px 16px;background:var(--primary);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;">Download File</button>
        </div>
      `;

      const btn = subContainer.querySelector('#btn-download-preview-fallback');
      if (btn) {
        btn.onclick = () => {
          if (!tab.previewBuffer) return;
          const blob = new Blob([tab.previewBuffer.slice(0)]);
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

  hideAll() {
    this.currentTabId = null;
    for (const [, item] of this.tabInstances) {
      if (item.subContainer) {
        item.subContainer.style.display = 'none';
      }
    }
  }

  destroyTab(tabId) {
    const item = this.tabInstances.get(tabId);
    if (item) {
      try {
        item.viewer?.destroy?.();
      } catch (e) {
        console.warn('Error destroying viewer tab:', e);
      }
      item.subContainer?.remove();
      this.tabInstances.delete(tabId);
    }
    if (this.currentTabId === tabId) {
      this.currentTabId = null;
    }
  }

  syncTabs(openTabIds) {
    const validIds = new Set(openTabIds);
    for (const [id] of this.tabInstances) {
      if (!validIds.has(id)) {
        this.destroyTab(id);
      }
    }
  }

  setTheme(theme) {
    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    for (const [, item] of this.tabInstances) {
      if (item.viewer && typeof item.viewer.setTheme === 'function') {
        item.viewer.setTheme(currentTheme);
      }
    }
  }

  resize() {
    if (this.currentTabId) {
      const active = this.tabInstances.get(this.currentTabId);
      active?.viewer?.resize?.();
    }
  }

  destroy() {
    for (const [id] of this.tabInstances) {
      this.destroyTab(id);
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.currentTabId = null;
  }
}

export const previewManager = new PreviewManager();
