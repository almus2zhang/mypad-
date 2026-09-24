/**
 * Enhanced Focal-Point Zoom for PPT / Presentation Previews
 * Provides:
 * - Continuous pinch-to-zoom centered on fingers' midpoint (以双指所在位置为中心缩放)
 * - GPU-accelerated smooth live pinch scaling (60/120 FPS)
 * - Scroll compensation so the point under fingers remains stationary
 * - Double-tap to zoom (1x <-> 2x) centered at tap location
 * - Desktop Ctrl + Mouse Wheel / Trackpad pinch zoom centered at cursor
 * @module viewer/enhanced-ppt-zoom
 */

export function initPptFocalZoom(container) {
  let destroyed = false;
  let observer = null;
  let cleanups = [];
  let attached = false;

  function tryAttach() {
    if (destroyed || attached) return;

    const officePanel = container.querySelector('.ofv-office');
    if (!officePanel) return;

    // Check if PPT viewer content has been rendered
    const pptViewer = officePanel.querySelector(
      '.ofv-pptx-viewer, .ofv-ppt-binary-viewer, .ofv-presentation-slides, .ofv-slide, div[data-slide-index]'
    );
    if (!pptViewer) return;

    attached = true;
    observer?.disconnect();
    observer = null;

    setupPptZoom(officePanel);
  }

  observer = new MutationObserver(() => {
    tryAttach();
  });
  observer.observe(container, { childList: true, subtree: true });

  tryAttach();

  function setupPptZoom(officePanel) {
    const scroller = officePanel;
    const contentEl = officePanel.querySelector(
      '.ofv-pptx-viewer, .ofv-ppt-binary-viewer, .ofv-presentation-slides'
    ) || officePanel;

    scroller.style.touchAction = 'pan-x pan-y';
    scroller.style.webkitOverflowScrolling = 'touch';
    scroller.style.overflow = 'auto';

    if (contentEl !== scroller) {
      contentEl.style.overflow = 'visible';
      contentEl.style.height = 'auto';
      contentEl.style.minHeight = '100%';
      contentEl.style.width = '100%';
    }

    let currentZoom = 1.0;

    function getSlides() {
      return contentEl.querySelectorAll('div[data-slide-index], .ofv-slide, .ofv-ppt-binary-slide');
    }

    function applyZoom(newZoom, targetLeft, targetTop) {
      currentZoom = newZoom;

      const slides = getSlides();
      if (slides.length > 0) {
        for (const slide of slides) {
          slide.style.transform = '';
          slide.style.transformOrigin = '0 0';
          slide.style.zoom = newZoom === 1 ? '' : String(newZoom);
          slide.style.width = newZoom === 1 ? '' : 'max-content';
          slide.style.maxWidth = newZoom === 1 ? '' : 'none';
          slide.style.overflow = newZoom === 1 ? '' : 'visible';
        }
      } else {
        contentEl.style.zoom = newZoom === 1 ? '' : String(newZoom);
      }

      // Read layout to ensure scroll dimensions are updated
      if (targetLeft !== undefined && targetTop !== undefined) {
        const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        scroller.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetLeft));
        scroller.scrollTop = Math.max(0, Math.min(maxScrollTop, targetTop));
      }
    }

    function zoomAtFocalPoint(newZoom, clientX, clientY) {
      const clampedZoom = Math.min(4.0, Math.max(0.5, newZoom));
      const scrollerRect = scroller.getBoundingClientRect();

      const Vx = (clientX !== undefined ? clientX : scrollerRect.left + scrollerRect.width / 2) - scrollerRect.left;
      const Vy = (clientY !== undefined ? clientY : scrollerRect.top + scrollerRect.height / 2) - scrollerRect.top;

      const Cx = scroller.scrollLeft + Vx;
      const Cy = scroller.scrollTop + Vy;

      const ratio = clampedZoom / currentZoom;
      const targetLeft = Cx * ratio - Vx;
      const targetTop = Cy * ratio - Vy;

      applyZoom(clampedZoom, targetLeft, targetTop);
    }

    // Touch Pinch & Double-Tap state
    let isPinching = false;
    let pinchStartDist = 0;
    let pinchStartMidpoint = { x: 0, y: 0 };
    let pinchStartScroll = { left: 0, top: 0 };
    let pinchStartZoom = 1.0;
    let pinchContentFocal = { x: 0, y: 0 };
    let lastPinchRatio = 1.0;
    let lastMidpoint = { x: 0, y: 0 };

    let lastTapTime = 0;
    let lastTapPos = { x: 0, y: 0 };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        isPinching = true;

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        pinchStartMidpoint = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        lastMidpoint = { ...pinchStartMidpoint };
        lastPinchRatio = 1.0;

        pinchStartScroll = { left: scroller.scrollLeft, top: scroller.scrollTop };
        pinchStartZoom = currentZoom;

        const scrollerRect = scroller.getBoundingClientRect();
        const Vx = pinchStartMidpoint.x - scrollerRect.left;
        const Vy = pinchStartMidpoint.y - scrollerRect.top;

        pinchContentFocal = {
          x: pinchStartScroll.left + Vx,
          y: pinchStartScroll.top + Vy
        };
      } else if (e.touches.length === 1 && !isPinching) {
        const t = e.touches[0];
        const now = Date.now();
        if (now - lastTapTime < 300 && Math.hypot(t.clientX - lastTapPos.x, t.clientY - lastTapPos.y) < 35) {
          e.preventDefault();
          e.stopPropagation();
          lastTapTime = 0;
          if (Math.abs(currentZoom - 1.0) < 0.2) {
            zoomAtFocalPoint(2.0, t.clientX, t.clientY);
          } else {
            zoomAtFocalPoint(1.0, t.clientX, t.clientY);
          }
          return;
        }
        lastTapTime = now;
        lastTapPos = { x: t.clientX, y: t.clientY };
      }
    };

    const onTouchMove = (e) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (dist <= 0 || pinchStartDist <= 0) return;

        const k = dist / pinchStartDist;
        lastPinchRatio = k;

        const curMidpoint = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        lastMidpoint = { ...curMidpoint };

        const scrollerRect = scroller.getBoundingClientRect();
        const V1x = curMidpoint.x - scrollerRect.left;
        const V1y = curMidpoint.y - scrollerRect.top;

        // Smooth GPU transform during pinch gesture:
        const tx = V1x - pinchContentFocal.x * k + pinchStartScroll.left;
        const ty = V1y - pinchContentFocal.y * k + pinchStartScroll.top;

        contentEl.style.transformOrigin = '0 0';
        contentEl.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
      }
    };

    const onTouchEnd = (e) => {
      if (isPinching) {
        isPinching = false;
        e.preventDefault();
        e.stopPropagation();

        contentEl.style.transform = 'none';

        const finalZoom = Math.min(4.0, Math.max(0.5, pinchStartZoom * lastPinchRatio));
        const actualRatio = finalZoom / pinchStartZoom;

        const scrollerRect = scroller.getBoundingClientRect();
        const V1x = lastMidpoint.x - scrollerRect.left;
        const V1y = lastMidpoint.y - scrollerRect.top;

        const targetLeft = pinchContentFocal.x * actualRatio - V1x;
        const targetTop = pinchContentFocal.y * actualRatio - V1y;

        applyZoom(finalZoom, targetLeft, targetTop);
      }
    };

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        zoomAtFocalPoint(currentZoom * factor, e.clientX, e.clientY);
      }
    };

    scroller.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    scroller.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: false, capture: true });
    scroller.addEventListener('wheel', onWheel, { passive: false });

    cleanups.push(() => {
      scroller.removeEventListener('touchstart', onTouchStart, { capture: true });
      scroller.removeEventListener('touchmove', onTouchMove, { capture: true });
      scroller.removeEventListener('touchend', onTouchEnd, { capture: true });
      scroller.removeEventListener('touchcancel', onTouchEnd, { capture: true });
      scroller.removeEventListener('wheel', onWheel);
    });
  }

  return {
    destroy() {
      destroyed = true;
      observer?.disconnect();
      cleanups.forEach((fn) => fn());
      cleanups = [];
    }
  };
}
