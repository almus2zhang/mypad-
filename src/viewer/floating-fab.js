/**
 * Floating Action Buttons (FAB) for Document / Media Previews
 * Displays Fullscreen and Download buttons in a compact floating glass pill in the top-right corner.
 * Does not occupy any vertical row space.
 * @module viewer/floating-fab
 */

export function createFloatingFab({ container, tab }) {
  const fab = document.createElement('div');
  fab.className = 'mypad-floating-fab';
  fab.style.cssText = `
    position: absolute;
    top: 14px;
    right: 16px;
    z-index: 60;
    display: inline-flex;
    align-items: center;
    background: rgba(30, 30, 46, 0.78);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    padding: 3px 6px;
    gap: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
    user-select: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  `;

  // Fullscreen button
  const fsBtn = document.createElement('button');
  fsBtn.type = 'button';
  fsBtn.className = 'mypad-fab-btn';
  fsBtn.title = '全屏 / Toggle Fullscreen';
  fsBtn.setAttribute('aria-label', 'Toggle Fullscreen');
  fsBtn.style.cssText = `
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.15s ease, transform 0.15s ease;
  `;

  const fsSvg = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>
  `;
  const exitFsSvg = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
    </svg>
  `;
  fsBtn.innerHTML = fsSvg;

  fsBtn.onmouseenter = () => { fsBtn.style.background = 'rgba(255, 255, 255, 0.15)'; };
  fsBtn.onmouseleave = () => { fsBtn.style.background = 'transparent'; };

  fsBtn.onclick = () => {
    if (!document.fullscreenElement) {
      const target = container.closest('#viewer-container') || container;
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(err => console.warn(err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    }
  };

  const onFsChange = () => {
    fsBtn.innerHTML = document.fullscreenElement ? exitFsSvg : fsSvg;
  };
  document.addEventListener('fullscreenchange', onFsChange);

  // Divider
  const divider = document.createElement('div');
  divider.style.cssText = 'width: 1px; height: 14px; background: rgba(255, 255, 255, 0.22);';

  // Download button
  const dlBtn = document.createElement('button');
  dlBtn.type = 'button';
  dlBtn.className = 'mypad-fab-btn';
  dlBtn.title = '下载文件 / Download';
  dlBtn.setAttribute('aria-label', 'Download File');
  dlBtn.style.cssText = fsBtn.style.cssText;
  dlBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  `;

  dlBtn.onmouseenter = () => { dlBtn.style.background = 'rgba(255, 255, 255, 0.15)'; };
  dlBtn.onmouseleave = () => { dlBtn.style.background = 'transparent'; };

  dlBtn.onclick = () => {
    if (!tab || !tab.previewBuffer) return;
    const blob = new Blob([tab.previewBuffer.slice(0)]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tab.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  fab.append(fsBtn, divider, dlBtn);
  container.appendChild(fab);

  return {
    element: fab,
    destroy() {
      document.removeEventListener('fullscreenchange', onFsChange);
      fab.remove();
    }
  };
}
