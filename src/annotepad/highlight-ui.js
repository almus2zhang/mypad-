/**
 * Highlight UI Panel
 * A floating, draggable window for Custom Highlights.
 */

export function createHighlightPanel(manager) {
  const panel = document.createElement('div');
  panel.className = 'highlight-floating-panel';
  panel.style.display = 'none';

  // ---- Header (Draggable) ----
  const header = document.createElement('div');
  header.className = 'highlight-header';

  const title = document.createElement('div');
  title.className = 'highlight-title';
  title.innerHTML = '🖍️ Custom Highlights';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'annotepad-btn annotepad-close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Close';

  header.append(title, closeBtn);

  // ---- Body ----
  const body = document.createElement('div');
  body.className = 'highlight-body';

  const addHlBtn = document.createElement('button');
  addHlBtn.className = 'btn btn-primary';
  addHlBtn.style.width = '100%';
  addHlBtn.style.marginBottom = '8px';
  addHlBtn.textContent = '+ Add Rule';

  const hlContainer = document.createElement('div');
  hlContainer.className = 'annotepad-hl-container';
  hlContainer.style.borderBottom = 'none';

  body.append(addHlBtn, hlContainer);
  panel.append(header, body);

  function renderHlRules() {
    hlContainer.innerHTML = '';
    const rules = manager.getHighlightRules();
    
    if (rules.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '12px';
      empty.style.color = 'var(--text-tertiary)';
      empty.style.textAlign = 'center';
      empty.style.fontSize = '12px';
      empty.textContent = 'No rules yet. Add one to highlight text.';
      hlContainer.appendChild(empty);
      return;
    }

    rules.forEach((rule, idx) => {
      const row = document.createElement('div');
      row.className = 'annotepad-hl-row';

      const colorInp = document.createElement('input');
      colorInp.type = 'color';
      colorInp.value = rule.color;
      colorInp.className = 'annotepad-hl-color';
      colorInp.addEventListener('change', () => {
        manager.updateHighlightRule(idx, { ...rule, color: colorInp.value });
      });

      const textInp = document.createElement('input');
      textInp.type = 'text';
      textInp.value = rule.pattern;
      textInp.placeholder = 'Regex or text';
      textInp.className = 'settings-input';
      textInp.style.flex = '1';
      textInp.style.minWidth = '0';
      textInp.addEventListener('input', () => {
        manager.updateHighlightRule(idx, { ...rule, pattern: textInp.value });
      });

      const rmBtn = document.createElement('button');
      rmBtn.className = 'annotepad-btn';
      rmBtn.innerHTML = '&times;';
      rmBtn.addEventListener('click', () => {
        manager.removeHighlightRule(idx);
        renderHlRules();
      });

      row.append(colorInp, textInp, rmBtn);
      hlContainer.appendChild(row);
    });
  }

  addHlBtn.addEventListener('click', () => {
    manager.addHighlightRule({ pattern: '', color: '#f38ba8' });
    renderHlRules();
  });

  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // ---- Dragging Logic ----
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  header.addEventListener('mousedown', (e) => {
    if (e.target === closeBtn) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // Switch to absolute positioning if not already
    panel.style.position = 'absolute';
    panel.style.left = `${initialLeft}px`;
    panel.style.top = `${initialTop}px`;
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
    panel.style.left = `${initialLeft + dx}px`;
    panel.style.top = `${initialTop + dy}px`;
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  return {
    element: panel,
    show() {
      if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        // Center the panel initially if it doesn't have a left/top
        if (!panel.style.left) {
          panel.style.position = 'absolute';
          panel.style.left = '50%';
          panel.style.top = '50%';
          panel.style.transform = 'translate(-50%, -50%)';
        }
      } else {
        panel.style.display = 'none';
      }
      renderHlRules();
    },
    hide() {
      panel.style.display = 'none';
    }
  };
}
