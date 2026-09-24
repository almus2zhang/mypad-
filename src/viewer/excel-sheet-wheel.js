/**
 * Excel Floating Sheet Wheel Picker
 * Displays a 3D wheel-style sheet picker floating in the bottom-right corner.
 * Shows 3 sheets at a time with smooth up/down dragging and mouse-wheel support.
 * - Clicking the center when on a different sheet jumps to that sheet.
 * - Clicking the center on the currently active sheet expands the full sheets list modal.
 * @module viewer/excel-sheet-wheel
 */

export function initExcelSheetWheel(container) {
  let destroyed = false;
  let observer = null;
  let wheelContainer = null;
  let allSheetsPopup = null;

  // Find .ofv-tabs inside container
  function tryAttach() {
    if (destroyed) return;
    const officePanel = container.querySelector('.ofv-office');
    if (!officePanel) return;

    const tabsBar = officePanel.querySelector('.ofv-tabs');
    if (!tabsBar) return;

    const tabButtons = Array.from(tabsBar.querySelectorAll('button[role="tab"]'));
    if (tabButtons.length === 0) return;

    // Disconnect observer once found
    observer?.disconnect();
    observer = null;

    buildWheelPicker(container, tabButtons);
  }

  observer = new MutationObserver(() => {
    tryAttach();
  });
  observer.observe(container, { childList: true, subtree: true });

  // Initial check
  tryAttach();

  function buildWheelPicker(root, buttons) {
    if (wheelContainer) wheelContainer.remove();

    const sheets = buttons.map((btn, idx) => ({
      name: btn.textContent.trim(),
      button: btn,
      index: idx
    }));

    let activeSheetIndex = sheets.findIndex(s => s.button.classList.contains('is-active') || s.button.getAttribute('aria-selected') === 'true');
    if (activeSheetIndex < 0) activeSheetIndex = 0;
    let selectedIndex = activeSheetIndex;

    const wheel = document.createElement('div');
    wheel.className = 'mypad-excel-sheet-wheel';
    wheel.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 24px;
      width: 176px;
      height: 108px;
      background: rgba(24, 24, 37, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
      z-index: 55;
      overflow: hidden;
      user-select: none;
      touch-action: none;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    `;

    // Center active slot highlight bar
    const centerSlotBar = document.createElement('div');
    centerSlotBar.style.cssText = `
      position: absolute;
      top: 36px;
      left: 6px;
      right: 6px;
      height: 36px;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(96, 165, 250, 0.45);
      border-radius: 8px;
      pointer-events: none;
      z-index: 1;
    `;
    wheel.appendChild(centerSlotBar);

    // 3 Item rows
    const topRow = document.createElement('div');
    const midRow = document.createElement('div');
    const btmRow = document.createElement('div');

    const rowCommonStyle = `
      height: 36px;
      line-height: 36px;
      text-align: center;
      padding: 0 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      position: relative;
      z-index: 2;
      transition: transform 0.15s ease, opacity 0.15s ease, color 0.15s ease;
      box-sizing: border-box;
    `;

    topRow.style.cssText = rowCommonStyle + `
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.45);
      transform: perspective(300px) rotateX(24deg) scale(0.9);
      opacity: 0.65;
    `;

    midRow.style.cssText = rowCommonStyle + `
      font-size: 13.5px;
      font-weight: 600;
      color: #ffffff;
      transform: perspective(300px) rotateX(0deg) scale(1);
      opacity: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    `;

    btmRow.style.cssText = rowCommonStyle + `
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.45);
      transform: perspective(300px) rotateX(-24deg) scale(0.9);
      opacity: 0.65;
    `;

    wheel.append(topRow, midRow, btmRow);

    function updateWheelView() {
      const prev = sheets[selectedIndex - 1];
      const curr = sheets[selectedIndex];
      const next = sheets[selectedIndex + 1];

      topRow.textContent = prev ? prev.name : '';
      topRow.style.visibility = prev ? 'visible' : 'hidden';

      btmRow.textContent = next ? next.name : '';
      btmRow.style.visibility = next ? 'visible' : 'hidden';

      if (curr) {
        const isCurrentActive = selectedIndex === activeSheetIndex;
        midRow.innerHTML = `
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px;">${curr.name}</span>
          <span style="font-size:10px;opacity:0.8;flex-shrink:0;">${isCurrentActive ? '▾' : '↵'}</span>
        `;
        midRow.title = isCurrentActive ? `${curr.name} (点击展开所有表)` : `${curr.name} (点击跳转)`;
        if (!isCurrentActive) {
          centerSlotBar.style.background = 'rgba(234, 179, 8, 0.22)';
          centerSlotBar.style.borderColor = 'rgba(234, 179, 8, 0.6)';
        } else {
          centerSlotBar.style.background = 'rgba(59, 130, 246, 0.22)';
          centerSlotBar.style.borderColor = 'rgba(96, 165, 250, 0.5)';
        }
      } else {
        midRow.textContent = '';
      }
    }

    // Step index
    function setIndex(newIdx) {
      const clamped = Math.max(0, Math.min(sheets.length - 1, newIdx));
      if (clamped !== selectedIndex) {
        selectedIndex = clamped;
        updateWheelView();
      }
    }

    // Click top/bottom to rotate
    topRow.onclick = (e) => {
      e.stopPropagation();
      setIndex(selectedIndex - 1);
    };

    btmRow.onclick = (e) => {
      e.stopPropagation();
      setIndex(selectedIndex + 1);
    };

    // Center click action:
    // If not active sheet -> jump to it!
    // If already active sheet -> expand all sheets list!
    midRow.onclick = (e) => {
      e.stopPropagation();
      if (selectedIndex !== activeSheetIndex) {
        // Jump to selected sheet
        activeSheetIndex = selectedIndex;
        sheets[selectedIndex].button.click();
        updateWheelView();
      } else {
        // Expand all sheets list
        showAllSheetsModal();
      }
    };

    // Touch Drag interaction
    let touchStartY = 0;
    let accumulatedDelta = 0;
    const DRAG_STEP = 26; // pixels per item scroll

    wheel.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        touchStartY = e.touches[0].clientY;
        accumulatedDelta = 0;
      }
    }, { passive: false });

    wheel.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY;
        touchStartY = currentY;
        accumulatedDelta += diff;

        if (accumulatedDelta <= -DRAG_STEP) {
          // Dragged up -> next sheet
          setIndex(selectedIndex + 1);
          accumulatedDelta = 0;
        } else if (accumulatedDelta >= DRAG_STEP) {
          // Dragged down -> prev sheet
          setIndex(selectedIndex - 1);
          accumulatedDelta = 0;
        }
      }
    }, { passive: false });

    // Mouse drag support
    let isMouseDown = false;
    let mouseStartY = 0;
    let mouseAccum = 0;

    wheel.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        isMouseDown = true;
        mouseStartY = e.clientY;
        mouseAccum = 0;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      const diff = e.clientY - mouseStartY;
      mouseStartY = e.clientY;
      mouseAccum += diff;
      if (mouseAccum <= -DRAG_STEP) {
        setIndex(selectedIndex + 1);
        mouseAccum = 0;
      } else if (mouseAccum >= DRAG_STEP) {
        setIndex(selectedIndex - 1);
        mouseAccum = 0;
      }
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    // Mouse Wheel support
    wheel.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY > 0) {
        setIndex(selectedIndex + 1);
      } else if (e.deltaY < 0) {
        setIndex(selectedIndex - 1);
      }
    }, { passive: false });

    // All Sheets Modal / Dropdown
    function showAllSheetsModal() {
      if (allSheetsPopup) allSheetsPopup.remove();

      const modal = document.createElement('div');
      modal.className = 'mypad-excel-all-sheets-modal';
      modal.style.cssText = `
        position: absolute;
        bottom: 140px;
        right: 24px;
        width: 240px;
        max-height: 320px;
        background: rgba(24, 24, 37, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 14px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
        z-index: 70;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: fadeSlideUp 0.18s ease-out;
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
      `;
      header.innerHTML = `
        <span>所有工作表 (${sheets.length})</span>
        <button class="modal-close-btn" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:16px;cursor:pointer;padding:0 4px;line-height:1;">×</button>
      `;

      header.querySelector('.modal-close-btn').onclick = () => modal.remove();

      // List container
      const listContainer = document.createElement('div');
      listContainer.style.cssText = `
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 6px 0;
        max-height: 260px;
      `;

      sheets.forEach((s) => {
        const item = document.createElement('div');
        const isActive = s.index === activeSheetIndex;
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
        `;
        item.innerHTML = `
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</span>
          ${isActive ? '<span style="font-size:12px;color:#60a5fa;margin-left:8px;">✓</span>' : ''}
        `;

        item.onmouseenter = () => {
          if (!isActive) item.style.background = 'rgba(255, 255, 255, 0.08)';
        };
        item.onmouseleave = () => {
          if (!isActive) item.style.background = 'transparent';
        };

        item.onclick = () => {
          activeSheetIndex = s.index;
          selectedIndex = s.index;
          s.button.click();
          updateWheelView();
          modal.remove();
        };

        listContainer.appendChild(item);
      });

      modal.append(header, listContainer);
      root.appendChild(modal);
      allSheetsPopup = modal;

      // Close on outside click
      const onDocClick = (e) => {
        if (!modal.contains(e.target) && !wheel.contains(e.target)) {
          modal.remove();
          document.removeEventListener('click', onDocClick);
        }
      };
      setTimeout(() => document.addEventListener('click', onDocClick), 50);
    }

    updateWheelView();
    root.appendChild(wheel);
    wheelContainer = wheel;
  }

  return {
    destroy() {
      destroyed = true;
      observer?.disconnect();
      wheelContainer?.remove();
      allSheetsPopup?.remove();
    }
  };
}
