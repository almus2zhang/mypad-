/**
 * @module symbol-bar
 * Symbol keyboard bar for virtual keyboard use in MyPad++.
 */

/**
 * List of symbols available in the bar.
 * Each entry is [display label, character to insert].
 * @type {Array<[string, string]>}
 */
const SYMBOLS = [
  ['⇥', '\t'],
  ['{', '{'],
  ['}', '}'],
  ['[', '['],
  [']', ']'],
  ['(', '('],
  [')', ')'],
  ['<', '<'],
  ['>', '>'],
  [';', ';'],
  [':', ':'],
  ["'", "'"],
  ['"', '"'],
  ['`', '`'],
  ['~', '~'],
  ['/', '/'],
  ['\\', '\\'],
  ['=', '='],
  ['+', '+'],
  ['-', '-'],
  ['_', '_'],
  ['|', '|'],
  ['&', '&'],
  ['!', '!'],
  ['@', '@'],
  ['#', '#'],
  ['$', '$'],
  ['%', '%'],
  ['^', '^'],
  ['*', '*'],
  ['?', '?'],
  [',', ','],
];

/**
 * Create the symbol keyboard bar.
 *
 * @param {(symbol: string) => void} onInsert - Called with the character to insert when a symbol button is tapped.
 * @returns {{ element: HTMLElement, show: () => void, hide: () => void }}
 */
export function createSymbolBar(onInsert) {
  const container = document.createElement('div');
  container.className = 'symbol-bar';
  container.id = 'symbol-bar';
  container.setAttribute('role', 'toolbar');
  container.setAttribute('aria-label', 'Symbol keyboard');
  container.style.display = 'none';

  const scrollWrapper = document.createElement('div');
  scrollWrapper.className = 'symbol-bar-scroll';

  SYMBOLS.forEach(([label, char]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'symbol-btn';
    btn.textContent = label;
    btn.title = char === '\t' ? 'Tab' : char;
    btn.setAttribute('aria-label', char === '\t' ? 'Insert Tab' : `Insert ${char}`);

    // Use pointerdown + preventDefault to avoid stealing focus from the editor
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof onInsert === 'function') {
        onInsert(char);
      }
      // Brief visual feedback
      btn.classList.add('symbol-btn--pressed');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          btn.classList.remove('symbol-btn--pressed');
        });
      });
    });

    scrollWrapper.appendChild(btn);
  });

  container.appendChild(scrollWrapper);

  // ── Keyboard navigation within the symbol bar ───────────────────────────
  container.addEventListener('keydown', (e) => {
    const buttons = Array.from(scrollWrapper.querySelectorAll('.symbol-btn'));
    const idx = buttons.indexOf(document.activeElement);
    if (idx === -1) return;

    let next = -1;
    if (e.key === 'ArrowRight') {
      next = (idx + 1) % buttons.length;
    } else if (e.key === 'ArrowLeft') {
      next = (idx - 1 + buttons.length) % buttons.length;
    }

    if (next !== -1) {
      e.preventDefault();
      buttons[next].focus();
      buttons[next].scrollIntoView({ inline: 'nearest', block: 'nearest' });
    }
  });

  return {
    element: container,

    /** Show the symbol bar. */
    show() {
      container.style.display = '';
      container.classList.add('symbol-bar--visible');
    },

    /** Hide the symbol bar. */
    hide() {
      container.classList.remove('symbol-bar--visible');
      // Wait for CSS transition before hiding
      const onEnd = () => {
        container.style.display = 'none';
        container.removeEventListener('transitionend', onEnd);
      };
      container.addEventListener('transitionend', onEnd);
      // Fallback if no transition is defined
      setTimeout(() => {
        if (!container.classList.contains('symbol-bar--visible')) {
          container.style.display = 'none';
        }
      }, 300);
    },
  };
}
