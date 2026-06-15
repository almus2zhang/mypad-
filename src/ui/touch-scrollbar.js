/**
 * Custom Touch Scrollbar Overlay
 * Provides a large, draggable scrollbar thumb that appears during scrolling,
 * optimized for touch screens.
 */
export function createTouchScrollbar(scroller) {
  const scrollbar = document.createElement('div');
  scrollbar.className = 'touch-scrollbar';
  
  const thumb = document.createElement('div');
  thumb.className = 'touch-scrollbar-thumb';
  scrollbar.appendChild(thumb);
  
  // We need to attach this to the parent of the scroller to position it correctly
  const wrapper = scroller.parentElement;
  if (wrapper) {
    wrapper.style.position = 'relative'; // Ensure relative positioning for absolute child
    wrapper.appendChild(scrollbar);
  }

  let isDragging = false;
  let hideTimeout = null;
  let startY = 0;
  let startScrollTop = 0;

  function updateThumb() {
    const { scrollTop, scrollHeight, clientHeight } = scroller;
    
    // Hide if no scrolling needed
    if (scrollHeight <= clientHeight) {
      scrollbar.style.display = 'none';
      return;
    }
    scrollbar.style.display = 'block';

    const scrollRatio = scrollTop / (scrollHeight - clientHeight);
    
    // Define thumb height (min 40px for touch target, max proportional)
    const maxThumbHeight = Math.max(40, (clientHeight / scrollHeight) * clientHeight);
    const trackHeight = clientHeight;
    
    const thumbTop = scrollRatio * (trackHeight - maxThumbHeight);
    
    thumb.style.height = `${maxThumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
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

  // --- Scroll Event from Editor ---
  scroller.addEventListener('scroll', () => {
    if (!isDragging) {
      showScrollbar();
    }
  }, { passive: true });

  // --- Dragging Logic ---
  function onDragStart(e) {
    e.preventDefault();
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
    e.preventDefault(); // Prevent native scrolling/refresh while dragging
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - startY;
    
    const { scrollHeight, clientHeight } = scroller;
    const trackHeight = clientHeight;
    const maxThumbHeight = Math.max(40, (clientHeight / scrollHeight) * clientHeight);
    
    const maxScrollTop = scrollHeight - clientHeight;
    const scrollableTrack = trackHeight - maxThumbHeight;
    
    if (scrollableTrack > 0) {
      const scrollRatio = deltaY / scrollableTrack;
      let newScrollTop = startScrollTop + (scrollRatio * maxScrollTop);
      
      // Clamp
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

  thumb.addEventListener('mousedown', onDragStart);
  thumb.addEventListener('touchstart', onDragStart, { passive: false });

  // Initial update
  updateThumb();

  return {
    destroy() {
      if (scrollbar.parentElement) {
        scrollbar.parentElement.removeChild(scrollbar);
      }
    }
  };
}
