/**
 * Highlight UI Panel
 * A floating, draggable window for Custom Highlights.
 */

/**
 * Highlight UI Panel
 * A floating, draggable window for Custom Highlights.
 */

export function createHighlightPanel(manager) {
  const panel = document.createElement('div');
  panel.className = 'highlight-floating-panel';
  panel.style.display = 'none';

  // Soft preset colors
  const presetColors = [
    '#ff8a8a', // Soft red
    '#a6e3a1', // Soft green
    '#89b4fa', // Soft blue
    '#fab387', // Soft orange
    '#cba6f7', // Soft purple
    '#f9e2af', // Soft yellow
    '#94e2d5', // Soft teal
    '#f5c2e7', // Soft pink
  ];

  // ---- Header (Draggable) ----
  const header = document.createElement('div');
  header.className = 'highlight-header';

  const title = document.createElement('div');
  title.className = 'highlight-title';
  title.innerHTML = '字符高亮设置';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'annotepad-btn annotepad-close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Close';

  header.append(title, closeBtn);

  // ---- Body ----
  const body = document.createElement('div');
  body.className = 'highlight-body';

  const hlContainer = document.createElement('div');
  hlContainer.className = 'annotepad-hl-container';
  hlContainer.style.borderBottom = 'none';

  const addHlBtn = document.createElement('button');
  addHlBtn.className = 'btn btn-ghost';
  addHlBtn.style.width = '100%';
  addHlBtn.style.marginTop = '8px';
  addHlBtn.style.color = 'var(--text-secondary)';
  addHlBtn.textContent = '+ 添加规则';

  body.append(hlContainer, addHlBtn);
  panel.append(header, body);

  let activePopover = null;

  function closePopover() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
  }

  // Close popover when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (activePopover && !activePopover.contains(e.target) && !e.target.closest('.hl-color-dot')) {
      closePopover();
    }
  });

  function showColorPopover(ruleIdx, dotElement) {
    closePopover();
    const popover = document.createElement('div');
    popover.className = 'hl-color-popover';
    
    // Position popover relative to the dot
    const rect = dotElement.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    
    popover.style.left = `${rect.left - panelRect.left - 4}px`;
    popover.style.top = `${rect.bottom - panelRect.top + 8}px`;

    const rule = manager.getHighlightRules()[ruleIdx];

    // Presets
    presetColors.forEach(c => {
      const cDot = document.createElement('div');
      cDot.className = 'hl-popover-dot';
      cDot.style.backgroundColor = c;
      if (rule.color === c) cDot.classList.add('hl-popover-dot--active');
      
      cDot.addEventListener('click', () => {
        manager.updateHighlightRule(ruleIdx, { ...rule, color: c });
        renderHlRules();
        closePopover();
      });
      popover.appendChild(cDot);
    });

    // Custom color picker (+)
    const customDot = document.createElement('div');
    customDot.className = 'hl-popover-dot hl-popover-dot--custom';
    customDot.innerHTML = '+';
    
    const nativePicker = document.createElement('input');
    nativePicker.type = 'color';
    nativePicker.value = presetColors.includes(rule.color) ? '#ffffff' : rule.color;
    nativePicker.style.position = 'absolute';
    nativePicker.style.opacity = '0';
    nativePicker.style.width = '100%';
    nativePicker.style.height = '100%';
    nativePicker.style.cursor = 'pointer';

    nativePicker.addEventListener('change', () => {
      manager.updateHighlightRule(ruleIdx, { ...rule, color: nativePicker.value });
      renderHlRules();
      closePopover();
    });

    customDot.appendChild(nativePicker);
    popover.appendChild(customDot);

    panel.appendChild(popover);
    activePopover = popover;
  }

  function renderHlRules() {
    hlContainer.innerHTML = '';
    const rules = manager.getHighlightRules();

    rules.forEach((rule, idx) => {
      const row = document.createElement('div');
      row.className = 'annotepad-hl-row';

      const colorDot = document.createElement('div');
      colorDot.className = 'hl-color-dot';
      colorDot.style.backgroundColor = rule.color;
      colorDot.addEventListener('click', () => showColorPopover(idx, colorDot));

      const textInp = document.createElement('input');
      textInp.type = 'text';
      textInp.value = rule.pattern;
      textInp.placeholder = '输入字符或文本...';
      textInp.className = 'settings-input';
      textInp.style.flex = '1';
      textInp.style.minWidth = '0';
      textInp.style.marginLeft = '8px';
      
      textInp.addEventListener('input', () => {
        const currentRule = manager.getHighlightRules()[idx];
        manager.updateHighlightRule(idx, { ...currentRule, pattern: textInp.value });
      });
      
      textInp.addEventListener('focus', () => {
        // Need to refer to the method added in the returned object, 
        // but we can just set the activeInputIdx variable directly since it's in the same scope
        activeInputIdx = idx;
      });

      const rmBtn = document.createElement('button');
      rmBtn.className = 'annotepad-btn';
      rmBtn.innerHTML = '&times;';
      rmBtn.style.marginLeft = '8px';
      rmBtn.addEventListener('click', () => {
        manager.removeHighlightRule(idx);
        renderHlRules();
        closePopover();
      });

      row.append(colorDot, textInp, rmBtn);
      hlContainer.appendChild(row);
    });
  }

  addHlBtn.addEventListener('click', () => {
    // Pick the next preset color automatically
    const rulesCount = manager.getHighlightRules().length;
    const color = presetColors[rulesCount % presetColors.length];
    manager.addHighlightRule({ pattern: '', color });
    renderHlRules();
  });

  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none';
    closePopover();
  });

  // ---- Dragging Logic ----
  let isDragging = false;
  let startX, startY, currentLeft, currentTop;

  header.addEventListener('mousedown', (e) => {
    if (e.target === closeBtn) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    currentLeft = panel.offsetLeft;
    currentTop = panel.offsetTop;
    
    panel.style.position = 'absolute';
    panel.style.left = `${currentLeft}px`;
    panel.style.top = `${currentTop}px`;
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
    panel.style.margin = '0';
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${currentLeft + dx}px`;
    panel.style.top = `${currentTop + dy}px`;
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  let activeInputIdx = null;

  return {
    element: panel,
    show() {
      if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        if (!panel.style.left) {
          panel.style.position = 'absolute';
          const parentWidth = panel.offsetParent ? panel.offsetParent.clientWidth : window.innerWidth;
          const parentHeight = panel.offsetParent ? panel.offsetParent.clientHeight : window.innerHeight;
          panel.style.left = `${Math.max(0, (parentWidth - 320) / 2)}px`;
          panel.style.top = `${Math.max(0, (parentHeight - panel.offsetHeight) / 2)}px`;
        }
      } else {
        panel.style.display = 'none';
        activeInputIdx = null;
      }
      
      if (manager.getHighlightRules().length === 0) {
        manager.addHighlightRule({ pattern: '', color: presetColors[0] });
      }
      renderHlRules();
    },
    hide() {
      panel.style.display = 'none';
      closePopover();
      activeInputIdx = null;
    },
    setActiveInput(idx) {
      activeInputIdx = idx;
    },
    fillActiveInput(text) {
      if (activeInputIdx !== null && panel.style.display !== 'none') {
        const rules = manager.getHighlightRules();
        if (activeInputIdx < rules.length) {
          const currentRule = rules[activeInputIdx];
          if (currentRule.pattern !== text) {
            manager.updateHighlightRule(activeInputIdx, { ...currentRule, pattern: text });
            renderHlRules();
          }
        }
      }
    },
    get isVisible() {
      return panel.style.display !== 'none';
    }
  };
}
