/**
 * Excel Floating Sheet Selector
 * Displays a clean floating sheet selector button in the bottom-right corner.
 * Clicking it directly opens a sheet list popup to choose and switch sheets.
 * @module viewer/excel-sheet-wheel
 */

export function initExcelSheetSelector(container) {
  let destroyed = false;
  let observer = null;
  let pillButton = null;
  let sheetsPopup = null;
  let activeSyncTimer = null;

  function tryAttach() {
    if (destroyed) return;
    const officePanel = container.querySelector('.ofv-office');
    if (!officePanel) return;

    const tabsBar = officePanel.querySelector('.ofv-tabs');
    if (!tabsBar) return;

    const tabButtons = Array.from(tabsBar.querySelectorAll('button[role="tab"]'));
    if (tabButtons.length === 0) return;

    observer?.disconnect();
    observer = null;

    buildSheetSelector(container, tabButtons);
  }

  observer = new MutationObserver(() => {
    tryAttach();
  });
  observer.observe(container, { childList: true, subtree: true });

  tryAttach();

  function buildSheetSelector(root, buttons) {
    if (pillButton) pillButton.remove();
    if (sheetsPopup) sheetsPopup.remove();

    const sheets = buttons.map((btn, idx) => ({
      name: btn.textContent.trim(),
      button: btn,
      index: idx
    }));

    function getActiveIndex() {
      const idx = sheets.findIndex(s => 
        s.button.classList.contains('is-active') || 
        s.button.getAttribute('aria-selected') === 'true'
      );
      return idx >= 0 ? idx : 0;
    }

    let activeIndex = getActiveIndex();

    // Floating Sheet Pill Button
    const pill = document.createElement('button');
    pill.className = 'mypad-excel-sheet-pill';
    pill.type = 'button';
    pill.title = '选择工作表';
    pill.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 38px;
      height: 38px;
      padding: 0 14px 0 12px;
      background: rgba(24, 24, 37, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 19px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
      color: #f1f5f9;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      z-index: 55;
      display: flex;
      align-items: center;
      gap: 7px;
      box-sizing: border-box;
      outline: none;
      transition: all 0.18s ease;
    `;

    const svgIcon = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
      </svg>
    `;

    function updatePillText() {
      activeIndex = getActiveIndex();
      const current = sheets[activeIndex] || sheets[0];
      const sheetName = current ? current.name : 'Sheet';
      pill.innerHTML = `
        ${svgIcon}
        <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sheetName}</span>
        <span class="sheet-caret" style="font-size: 11px; opacity: 0.75; transition: transform 0.2s;">▾</span>
      `;
    }

    updatePillText();

    // Hover styles
    pill.onmouseenter = () => {
      pill.style.background = 'rgba(35, 35, 55, 0.95)';
      pill.style.borderColor = 'rgba(96, 165, 250, 0.5)';
      pill.style.boxShadow = '0 8px 28px rgba(0, 0, 0, 0.5)';
    };
    pill.onmouseleave = () => {
      if (!sheetsPopup) {
        pill.style.background = 'rgba(24, 24, 37, 0.88)';
        pill.style.borderColor = 'rgba(255, 255, 255, 0.16)';
        pill.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.4)';
      }
    };

    function closePopup() {
      if (sheetsPopup) {
        sheetsPopup.remove();
        sheetsPopup = null;
        const caret = pill.querySelector('.sheet-caret');
        if (caret) caret.style.transform = 'rotate(0deg)';
        pill.style.background = 'rgba(24, 24, 37, 0.88)';
        pill.style.borderColor = 'rgba(255, 255, 255, 0.16)';
      }
    }

    function openPopup() {
      closePopup();

      const modal = document.createElement('div');
      modal.className = 'mypad-excel-all-sheets-modal';
      modal.style.cssText = `
        position: absolute;
        bottom: 70px;
        right: 38px;
        width: 230px;
        max-height: 320px;
        background: rgba(24, 24, 37, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 14px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
        z-index: 70;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: fadeSlideUp 0.15s ease-out;
      `;

      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        user-select: none;
      `;
      header.innerHTML = `
        <span>工作表 (${sheets.length})</span>
        <button type="button" class="modal-close-btn" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:16px;cursor:pointer;padding:0 4px;line-height:1;">×</button>
      `;

      header.querySelector('.modal-close-btn').onclick = (e) => {
        e.stopPropagation();
        closePopup();
      };

      // List container
      const listContainer = document.createElement('div');
      listContainer.style.cssText = `
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 6px 0;
        max-height: 260px;
      `;

      activeIndex = getActiveIndex();

      sheets.forEach((s) => {
        const item = document.createElement('div');
        const isActive = s.index === activeIndex;
        item.style.cssText = `
          padding: 8px 14px;
          font-size: 13px;
          color: ${isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.88)'};
          background: ${isActive ? 'rgba(59, 130, 246, 0.18)' : 'transparent'};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.12s ease;
          user-select: none;
        `;
        item.innerHTML = `
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</span>
          ${isActive ? '<span style="font-size:12px;color:#60a5fa;margin-left:8px;font-weight:bold;">✓</span>' : ''}
        `;

        item.onmouseenter = () => {
          if (s.index !== activeIndex) item.style.background = 'rgba(255, 255, 255, 0.08)';
        };
        item.onmouseleave = () => {
          if (s.index !== activeIndex) item.style.background = 'transparent';
        };

        item.onclick = (e) => {
          e.stopPropagation();
          s.button.click();
          closePopup();
          setTimeout(updatePillText, 50);
        };

        listContainer.appendChild(item);
      });

      modal.append(header, listContainer);
      root.appendChild(modal);
      sheetsPopup = modal;

      const caret = pill.querySelector('.sheet-caret');
      if (caret) caret.style.transform = 'rotate(180deg)';
      pill.style.background = 'rgba(35, 35, 55, 0.98)';
      pill.style.borderColor = '#3b82f6';

      // Outside click handler
      const onDocClick = (e) => {
        if (sheetsPopup && !sheetsPopup.contains(e.target) && !pill.contains(e.target)) {
          closePopup();
          document.removeEventListener('click', onDocClick, true);
        }
      };
      setTimeout(() => document.addEventListener('click', onDocClick, true), 20);
    }

    pill.onclick = (e) => {
      e.stopPropagation();
      if (sheetsPopup) {
        closePopup();
      } else {
        openPopup();
      }
    };

    root.appendChild(pill);
    pillButton = pill;

    // Periodic check in case sheets change externally
    activeSyncTimer = setInterval(() => {
      if (!destroyed && pillButton) {
        const currentActive = getActiveIndex();
        if (currentActive !== activeIndex) {
          updatePillText();
        }
      }
    }, 1000);
  }

  return {
    destroy() {
      destroyed = true;
      observer?.disconnect();
      if (activeSyncTimer) clearInterval(activeSyncTimer);
      pillButton?.remove();
      sheetsPopup?.remove();
    }
  };
}

export const initExcelSheetWheel = initExcelSheetSelector;
