/**
 * Enhanced Image Plugin for @open-file-viewer/core
 * Provides:
 * - Smooth continuous pinch-to-zoom ("无极缩放") centered on finger midpoint
 * - Single-finger panning when zoomed & two-finger simultaneous pan + zoom
 * - Double-tap toggle zoom (1x <-> 2.5x) centered at tap point
 * - Focal-point mouse wheel zoom
 * - Viewport-centered toolbar zoom commands (never jumping to 0,0)
 * @module viewer/enhanced-image-plugin
 */

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'jfif', 'pjpeg', 'png', 'gif', 'webp', 'avif',
  'svg', 'bmp', 'ico', 'cur', 'tif', 'tiff'
]);

export function isImageFile(file) {
  if (!file) return false;
  const ext = (file.extension || (file.name ? file.name.split('.').pop() : '') || '').toLowerCase();
  const mime = (file.mimeType || '').toLowerCase();
  return mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext);
}

export function enhancedImagePlugin() {
  return {
    name: 'enhanced-image',
    match(file) {
      return isImageFile(file);
    },
    async render(ctx) {
      let objectUrl = null;
      let isLocalUrl = false;

      if (ctx.file.source instanceof Blob) {
        objectUrl = URL.createObjectURL(ctx.file.source);
        isLocalUrl = true;
      } else if (ctx.file.source instanceof ArrayBuffer || ArrayBuffer.isView(ctx.file.source)) {
        const mime = ctx.file.mimeType || 'image/png';
        const blob = new Blob([ctx.file.source], { type: mime });
        objectUrl = URL.createObjectURL(blob);
        isLocalUrl = true;
      } else if (typeof ctx.file.source === 'string') {
        objectUrl = ctx.file.source;
      } else if (ctx.file.url) {
        objectUrl = ctx.file.url;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'ofv-image-viewer';
      wrapper.style.cssText = 'position:relative;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;user-select:none;touch-action:none;';

      const stage = document.createElement('div');
      stage.className = 'ofv-image-stage';
      stage.style.cssText = 'flex:1 1 auto;width:100%;height:100%;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;';

      const visualBox = document.createElement('div');
      visualBox.className = 'ofv-image-scrollbox';
      visualBox.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;margin:auto;touch-action:none;';

      const image = document.createElement('img');
      image.className = 'ofv-media ofv-image-content';
      image.alt = ctx.file.name || 'Image preview';
      image.draggable = false;
      image.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;transform-origin:center center;user-select:none;-webkit-user-drag:none;will-change:transform;';
      if (objectUrl) {
        image.src = objectUrl;
      }

      visualBox.appendChild(image);
      stage.appendChild(visualBox);
      wrapper.appendChild(stage);
      ctx.viewport.appendChild(wrapper);

      // State
      let scale = 1.0;
      let offsetX = 0;
      let offsetY = 0;
      let rotation = 0;
      let previewAvailable = true;

      // Tracking variables
      let isPinching = false;
      let isDragging = false;
      let pinchStartDist = 0;
      let pinchStartMidpoint = { x: 0, y: 0 };
      let pinchStartScale = 1;
      let pinchStartOffset = { x: 0, y: 0 };

      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartOffset = { x: 0, y: 0 };

      let lastTapTime = 0;
      let lastTapPos = { x: 0, y: 0 };

      function applyTransform(withTransition = false) {
        image.style.transition = withTransition ? 'transform 180ms cubic-bezier(0.2, 0, 0, 1)' : 'none';
        image.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`;
        ctx.toolbar?.setZoom(previewAvailable ? scale : void 0);
      }

      /**
       * Zoom centered on a focal client point (e.g. pinch center or cursor)
       */
      function zoomAtPoint(newScale, clientX, clientY, withTransition = false) {
        const clampedScale = Math.min(10, Math.max(0.1, newScale));
        const stageRect = stage.getBoundingClientRect();
        const Xc = stageRect.left + stageRect.width / 2;
        const Yc = stageRect.top + stageRect.height / 2;
        const Fx = clientX != null ? clientX : Xc;
        const Fy = clientY != null ? clientY : Yc;

        const ratio = clampedScale / scale;
        offsetX = Fx - Xc - (Fx - Xc - offsetX) * ratio;
        offsetY = Fy - Yc - (Fy - Yc - offsetY) * ratio;
        scale = clampedScale;
        applyTransform(withTransition);
      }

      function resetTransform(withTransition = true) {
        scale = 1.0;
        offsetX = 0;
        offsetY = 0;
        rotation = 0;
        applyTransform(withTransition);
      }

      // Touch gesture listeners
      const onTouchStart = (e) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          e.stopPropagation();
          isPinching = true;
          isDragging = false;

          const t1 = e.touches[0];
          const t2 = e.touches[1];
          pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          pinchStartMidpoint = {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
          };
          pinchStartScale = scale;
          pinchStartOffset = { x: offsetX, y: offsetY };
        } else if (e.touches.length === 1) {
          const t = e.touches[0];
          const now = Date.now();

          // Double tap to zoom toggle
          if (now - lastTapTime < 300 && Math.hypot(t.clientX - lastTapPos.x, t.clientY - lastTapPos.y) < 35) {
            e.preventDefault();
            e.stopPropagation();
            lastTapTime = 0;
            if (Math.abs(scale - 1) < 0.15) {
              zoomAtPoint(2.5, t.clientX, t.clientY, true);
            } else {
              resetTransform(true);
            }
            return;
          }
          lastTapTime = now;
          lastTapPos = { x: t.clientX, y: t.clientY };

          isDragging = true;
          isPinching = false;
          dragStartX = t.clientX;
          dragStartY = t.clientY;
          dragStartOffset = { x: offsetX, y: offsetY };
          stage.style.cursor = 'grabbing';
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

          const ratio = dist / pinchStartDist;
          const nextScale = Math.min(10, Math.max(0.1, pinchStartScale * ratio));

          const curMidpoint = {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
          };
          const stageRect = stage.getBoundingClientRect();
          const Xc = stageRect.left + stageRect.width / 2;
          const Yc = stageRect.top + stageRect.height / 2;

          // Focal-point invariant formula
          offsetX = (curMidpoint.x - Xc) - (pinchStartMidpoint.x - Xc - pinchStartOffset.x) * (nextScale / pinchStartScale);
          offsetY = (curMidpoint.y - Yc) - (pinchStartMidpoint.y - Yc - pinchStartOffset.y) * (nextScale / pinchStartScale);
          scale = nextScale;
          applyTransform(false);
        } else if (isDragging && e.touches.length === 1 && !isPinching) {
          e.preventDefault();
          const t = e.touches[0];
          offsetX = dragStartOffset.x + (t.clientX - dragStartX);
          offsetY = dragStartOffset.y + (t.clientY - dragStartY);
          applyTransform(false);
        }
      };

      const onTouchEnd = (e) => {
        if (e.touches.length === 0) {
          isPinching = false;
          isDragging = false;
          stage.style.cursor = 'grab';
        } else if (e.touches.length === 1 && isPinching) {
          // One finger lifted, smoothly transition to drag with remaining finger
          isPinching = false;
          isDragging = true;
          const t = e.touches[0];
          dragStartX = t.clientX;
          dragStartY = t.clientY;
          dragStartOffset = { x: offsetX, y: offsetY };
        }
      };

      // Mouse drag for desktop
      let isMouseDown = false;
      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        isMouseDown = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartOffset = { x: offsetX, y: offsetY };
        stage.style.cursor = 'grabbing';
      };

      const onMouseMove = (e) => {
        if (!isMouseDown) return;
        e.preventDefault();
        offsetX = dragStartOffset.x + (e.clientX - dragStartX);
        offsetY = dragStartOffset.y + (e.clientY - dragStartY);
        applyTransform(false);
      };

      const onMouseUp = () => {
        if (isMouseDown) {
          isMouseDown = false;
          stage.style.cursor = 'grab';
        }
      };

      // Mouse wheel zoom with focal point
      const onWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        zoomAtPoint(scale * factor, e.clientX, e.clientY, false);
      };

      stage.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
      stage.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
      stage.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
      stage.addEventListener('touchcancel', onTouchEnd, { passive: false, capture: true });

      stage.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      stage.addEventListener('wheel', onWheel, { passive: false });

      // Image error handling
      image.addEventListener('error', () => {
        previewAvailable = false;
        ctx.toolbar?.setZoom(void 0);
        visualBox.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--danger,#e11d48);gap:8px;padding:2rem;text-align:center;">
            <div style="font-size:32px;">🖼️</div>
            <div style="font-weight:600;">Failed to load image</div>
          </div>
        `;
      });

      applyTransform(false);

      return {
        canCommand(command) {
          return previewAvailable && (
            command === 'zoom-in' ||
            command === 'zoom-out' ||
            command === 'zoom-reset' ||
            command === 'rotate-right' ||
            command === 'rotate-left'
          );
        },
        command(command) {
          if (!previewAvailable) return false;
          if (command === 'zoom-in') {
            zoomAtPoint(scale * 1.25, null, null, true);
            return true;
          }
          if (command === 'zoom-out') {
            zoomAtPoint(scale / 1.25, null, null, true);
            return true;
          }
          if (command === 'zoom-reset') {
            resetTransform(true);
            return true;
          }
          if (command === 'rotate-right') {
            rotation = (rotation + 90) % 360;
            applyTransform(true);
            return true;
          }
          if (command === 'rotate-left') {
            rotation = (rotation - 90 + 360) % 360;
            applyTransform(true);
            return true;
          }
          return false;
        },
        resize() {
          // Center bounds check if needed
          applyTransform(false);
        },
        destroy() {
          stage.removeEventListener('touchstart', onTouchStart, { capture: true });
          stage.removeEventListener('touchmove', onTouchMove, { capture: true });
          stage.removeEventListener('touchend', onTouchEnd, { capture: true });
          stage.removeEventListener('touchcancel', onTouchEnd, { capture: true });
          stage.removeEventListener('mousedown', onMouseDown);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          stage.removeEventListener('wheel', onWheel);

          if (isLocalUrl && objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        }
      };
    }
  };
}
