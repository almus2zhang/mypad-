/**
 * Custom Touch Scrollbar Overlay
 * Provides a large, draggable scrollbar thumb that appears during scrolling,
 * optimized for touch screens and mobile drag.
 * 
 * Supports both:
 * 1) A direct scrollable element (scroller)
 * 2) A container holding dynamically rendered scrollable elements (e.g. document preview panes)
 * @module ui/touch-scrollbar
 */

export function createTouchScrollbar(target, options = {}) {
  if (!target) return { destroy: () => {}, update: () => {}, show: () => {} };

  const isContainer = Boolean(options.isContainer);
  let activeScroller = isContainer ? null : target;

  const scrollbar = document.createElement('div');
  scrollbar.className = 'touch-scrollbar';
  
  const thumb = document.createElement('div');
  thumb.className = 'touch-scrollbar-thumb';
  scrollbar.appendChild(thumb);
  
  // Attach scrollbar to target (if isContainer) or target.parentElement (if scroller)
  const wrapper = isContainer ? target : (options.container || target.parentElement);
  if (wrapper) {
    const computedPosition = window.getComputedStyle(wrapper).position;
    if (computedPosition === 'static') {
      wrapper.style.position = 'relative';
    }
    wrapper.appendChild(scrollbar);
  }

  let isDragging = false;
  let hideTimeout = null;
  let startY = 0;
  let startScrollTop = 0;
  const cleanups = [];

  function findScroller() {
    if (!isContainer) return target;
    if (activeScroller && wrapper.contains(activeScroller) && activeScroller.scrollHeight > activeScroller.clientHeight + 5) {
      return activeScroller;
    }

    // Document preview known scroller selectors (PDF, Office, PPT, Excel, etc.)
    const selectors = [
      '.ofv-pdf-pages',
      '.ofv-pdf',
      '.ofv-office.ofv-panel',
      '.ofv-sheet .ofv-table-scroll',
      '.ofv-table-scroll',
      '.ofv-viewport',
      '.ofv-office',
      '.ofv-panel',
      '.ofv-text'
    ];
    for (const sel of selectors) {
      const el = wrapper.querySelector(sel);
      if (el && el.scrollHeight > el.clientHeight + 5) {
        activeScroller = el;
        return el;
      }
    }

    // Fallback: search any element inside wrapper that has vertical overflow
    const all = wrapper.querySelectorAll('*');
    let best = null;
    let maxDiff = 0;
    for (const el of all) {
      const diff = el.scrollHeight - el.clientHeight;
      if (diff > 10 && el.clientHeight >= 80) {
        const oy = window.getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && diff > maxDiff) {
          best = el;
          maxDiff = diff;
        }
      }
    }
    if (best) activeScroller = best;
    return best;
  }

  function updateThumb() {
    const scroller = findScroller();
    if (!scroller) {
      scrollbar.style.display = 'none';
      return;
    }
    
    const { scrollTop, scrollHeight, clientHeight } = scroller;
    
    // Hide if no vertical scrolling needed
    if (scrollHeight <= clientHeight + 5) {
      scrollbar.style.display = 'none';
      return;
    }
    scrollbar.style.display = 'block';

    const trackHeight = scrollbar.clientHeight || clientHeight;
    // Generous size for fingers: min 56px, up to 70% of track height
    const minThumbHeight = 56;
    const thumbHeight = Math.max(minThumbHeight, Math.min(trackHeight * 0.7, (clientHeight / scrollHeight) * trackHeight));
    const maxScrollTop = scrollHeight - clientHeight;
    const scrollableTrack = trackHeight - thumbHeight;

    const scrollRatio = maxScrollTop > 0 ? Math.max(0, Math.min(1, scrollTop / maxScrollTop)) : 0;
    const thumbTop = scrollRatio * scrollableTrack;

    thumb.style.height = `${Math.round(thumbHeight)}px`;
    thumb.style.transform = `translateY(${Math.round(thumbTop)}px)`;
  }

  function showScrollbar() {
    scrollbar.classList.add('visible');
    updateThumb();
    resetHideTimeout();
  }

  function resetHideTimeout() {
    if (hideTimeout) clearTimeout(hideTimeout);
    if (!isDragging) {
      hideTimeout = setTimeout(() => {
        scrollbar.classList.remove('visible');
      }, 1500); // Hide after 1.5s of inactivity
    }
  }

  // --- Scroll Events ---
  if (isContainer) {
    const onScrollCapture = (e) => {
      const el = e.target;
      if (!el || el === document || el === window || !(el instanceof HTMLElement)) return;
      if (!wrapper.contains(el)) return;
      if (el.scrollHeight <= el.clientHeight + 5) return;
      // Filter out tiny elements unless only choice
      if (el.clientHeight < Math.min(100, wrapper.clientHeight * 0.3)) return;

      activeScroller = el;
      if (!isDragging) {
        showScrollbar();
      }
    };
    wrapper.addEventListener('scroll', onScrollCapture, { capture: true, passive: true });
    cleanups.push(() => wrapper.removeEventListener('scroll', onScrollCapture, { capture: true }));
  } else {
    const onScroll = () => {
      if (!isDragging) {
        showScrollbar();
      }
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => target.removeEventListener('scroll', onScroll));
  }

  // --- Dragging Logic ---
  function onDragStart(e) {
    const scroller = findScroller();
    if (!scroller) return;

    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    if (hideTimeout) clearTimeout(hideTimeout);
    scrollbar.classList.add('visible', 'dragging');
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startY = clientY;
    startScrollTop = scroller.scrollTop;

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
  }

  function onDragMove(e) {
    if (!isDragging) return;
    const scroller = findScroller();
    if (!scroller) return;

    e.preventDefault();
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startY;
    
    const { scrollHeight, clientHeight } = scroller;
    const trackHeight = scrollbar.clientHeight || clientHeight;
    const minThumbHeight = 56;
    const thumbHeight = Math.max(minThumbHeight, Math.min(trackHeight * 0.7, (clientHeight / scrollHeight) * trackHeight));
    
    const maxScrollTop = scrollHeight - clientHeight;
    const scrollableTrack = trackHeight - thumbHeight;
    
    if (scrollableTrack > 0 && maxScrollTop > 0) {
      const scrollRatio = deltaY / scrollableTrack;
      let newScrollTop = startScrollTop + (scrollRatio * maxScrollTop);
      newScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
      
      scroller.scrollTop = newScrollTop;
      updateThumb();
    }
  }

  function onDragEnd() {
    isDragging = false;
    scrollbar.classList.remove('dragging');
    resetHideTimeout();
    
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
  }

  // Track tap / click to jump and drag
  function onTrackStart(e) {
    if (e.target === thumb || thumb.contains(e.target)) return;
    const scroller = findScroller();
    if (!scroller) return;

    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = scrollbar.getBoundingClientRect();
    const trackHeight = rect.height || scrollbar.clientHeight;
    const minThumbHeight = 56;
    const thumbHeight = Math.max(minThumbHeight, Math.min(trackHeight * 0.7, (scroller.clientHeight / scroller.scrollHeight) * trackHeight));
    const scrollableTrack = trackHeight - thumbHeight;
    
    if (scrollableTrack > 0) {
      const targetThumbTop = Math.max(0, Math.min(scrollableTrack, (clientY - rect.top) - thumbHeight / 2));
      const scrollRatio = targetThumbTop / scrollableTrack;
      const maxScrollTop = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTop = scrollRatio * maxScrollTop;
      updateThumb();
    }

    onDragStart(e);
  }

  thumb.addEventListener('mousedown', onDragStart);
  thumb.addEventListener('touchstart', onDragStart, { passive: false });
  scrollbar.addEventListener('mousedown', onTrackStart);
  scrollbar.addEventListener('touchstart', onTrackStart, { passive: false });

  // Watch for layout resizing
  if (window.ResizeObserver && wrapper) {
    const ro = new ResizeObserver(() => {
      updateThumb();
    });
    ro.observe(wrapper);
    cleanups.push(() => ro.disconnect());
  }

  // Watch for dynamic DOM injection (e.g. async docx / ppt / excel rendering)
  if (isContainer && window.MutationObserver && wrapper) {
    const mo = new MutationObserver(() => {
      updateThumb();
    });
    mo.observe(wrapper, { childList: true, subtree: true });
    cleanups.push(() => mo.disconnect());
  }

  // Initial update
  updateThumb();

  return {
    update() {
      updateThumb();
    },
    show() {
      showScrollbar();
    },
    destroy() {
      if (hideTimeout) clearTimeout(hideTimeout);
      cleanups.forEach(fn => fn());
      thumb.removeEventListener('mousedown', onDragStart);
      thumb.removeEventListener('touchstart', onDragStart);
      scrollbar.removeEventListener('mousedown', onTrackStart);
      scrollbar.removeEventListener('touchstart', onTrackStart);
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);
      if (scrollbar.parentElement) {
        scrollbar.parentElement.removeChild(scrollbar);
      }
    }
  };
}
