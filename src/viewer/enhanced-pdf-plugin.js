/**
 * Enhanced PDF Plugin for @open-file-viewer/core
 * Provides:
 * - Smooth continuous pinch-to-zoom ("无极缩放") with GPU acceleration
 * - Exact finger-midpoint focal centering (never resetting to top of document)
 * - Viewport-centered toolbar zoom commands (+ / - / reset)
 * - Double-tap focal zoom toggle (1x <-> 2x)
 * - Focal-point mouse wheel zoom (desktop)
 * - High-DPI canvas rendering (outputScale 2.0-2.5x)
 * - Page navigation & virtual rendering with IntersectionObserver
 * @module viewer/enhanced-pdf-plugin
 */

import * as pdfjsLib from 'pdfjs-dist';

export function enhancedPdfPlugin(pluginOptions = {}) {
  return {
    name: 'enhanced-pdf',
    match(file) {
      if (!file) return false;
      const ext = (file.extension || (file.name ? file.name.split('.').pop() : '') || '').toLowerCase();
      const mime = (file.mimeType || '').toLowerCase();
      return mime === 'application/pdf' || ext === 'pdf';
    },
    async render(ctx) {
      if (pluginOptions.workerSrc && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pluginOptions.workerSrc;
      }

      ctx.setLoading(true);

      let data = ctx.file.source;
      if (data instanceof Blob) {
        data = new Uint8Array(await data.arrayBuffer());
      } else if (data instanceof ArrayBuffer) {
        data = new Uint8Array(data.slice(0));
      } else if (ArrayBuffer.isView(data)) {
        data = new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
      }

      const documentParams = {
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
        useSystemFonts: true
      };

      if (typeof data === 'string') {
        documentParams.url = data;
      } else {
        documentParams.data = data;
      }

      let pdfDocument = null;
      try {
        const loadingTask = pdfjsLib.getDocument(documentParams);
        pdfDocument = await loadingTask.promise;
      } catch (err) {
        ctx.setLoading(false);
        throw err;
      }

      ctx.setLoading(false);

      const numPages = pdfDocument.numPages;
      const pagesMeta = [];
      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdfDocument.getPage(i);
          const baseVp = page.getViewport({ scale: 1 });
          pagesMeta.push({
            width: baseVp.width,
            height: baseVp.height,
            rotation: page.rotate || 0
          });
        } catch {
          pagesMeta.push({ width: 612, height: 792, rotation: 0 });
        }
      }

      // Root PDF viewer element
      const viewer = document.createElement('div');
      viewer.className = 'ofv-pdf-viewer';
      viewer.style.cssText = 'position:relative;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#525659;';

      // Scroller element takes full view area
      const scroller = document.createElement('div');
      scroller.className = 'ofv-pdf ofv-pdf-pages';
      scroller.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow-x:auto;overflow-y:scroll;padding:16px;box-sizing:border-box;background:#525659;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;';

      // Pages container (supports GPU hardware transform during pinch)
      const pagesContainer = document.createElement('div');
      pagesContainer.className = 'ofv-pdf-pages-container';
      pagesContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;min-width:100%;transform-origin:0 0;will-change:transform;';

      scroller.appendChild(pagesContainer);
      viewer.appendChild(scroller);

      // Floating Page Navigator Bar (Bottom-Right corner)
      const pageNavigator = document.createElement('div');
      pageNavigator.className = 'ofv-pdf-page-navigator mypad-pdf-floating-nav';
      pageNavigator.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 38px;
        z-index: 50;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: rgba(24, 24, 37, 0.85);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 24px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
        color: #fff;
        user-select: none;
      `;

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.textContent = '‹';
      prevBtn.title = 'Previous page';
      prevBtn.style.cssText = 'width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,0.12);color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;padding:0;transition:background 0.15s;';

      const pageInput = document.createElement('input');
      pageInput.type = 'number';
      pageInput.min = '1';
      pageInput.max = String(numPages);
      pageInput.value = '1';
      pageInput.style.cssText = 'width:42px;height:24px;padding:0 2px;border:1px solid rgba(255,255,255,0.22);border-radius:6px;background:rgba(0,0,0,0.25);color:#fff;text-align:center;font-size:12.5px;font-weight:500;outline:none;';

      const pageTotal = document.createElement('span');
      pageTotal.textContent = `/ ${numPages}`;
      pageTotal.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.65);user-select:none;margin-right:2px;';

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.textContent = '›';
      nextBtn.title = 'Next page';
      nextBtn.style.cssText = 'width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,0.12);color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;padding:0;transition:background 0.15s;';

      pageNavigator.append(prevBtn, pageInput, pageTotal, nextBtn);
      viewer.appendChild(pageNavigator);
      viewer._pdfDocument = pdfDocument;
      viewer._pagesMeta = pagesMeta;
      viewer._numPages = numPages;
      viewer._getCurrentPage = () => currentPage;
      ctx.viewport.appendChild(viewer);

      // State
      let zoomFactor = 1.0;
      let rotation = 0;
      let currentPage = 1;
      let isDestroyed = false;

      // Calculate base scale to fit scroller width
      function getBaseScale() {
        const scrollerWidth = scroller.clientWidth || ctx.size?.width || 800;
        const availableWidth = Math.max(200, scrollerWidth - 32);
        const firstPageWidth = pagesMeta[0]?.width || 612;
        return availableWidth / firstPageWidth;
      }

      let baseScale = getBaseScale();

      function getEffectiveScale() {
        return Math.max(0.1, baseScale * zoomFactor);
      }

      // Page States
      const pageStates = [];
      for (let i = 0; i < numPages; i++) {
        const meta = pagesMeta[i];
        const scale = getEffectiveScale();
        const w = Math.floor(meta.width * scale);
        const h = Math.floor(meta.height * scale);

        const wrapper = document.createElement('div');
        wrapper.className = 'ofv-pdf-page-wrapper';
        wrapper.setAttribute('data-page-index', String(i));
        wrapper.style.cssText = `position:relative;width:${w}px;height:${h}px;margin:16px auto;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.3);overflow:hidden;flex-shrink:0;box-sizing:border-box;`;

        const skeleton = document.createElement('div');
        skeleton.className = 'ofv-pdf-skeleton';
        skeleton.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;background:#f3f4f6;';
        skeleton.textContent = `Page ${i + 1}`;
        wrapper.appendChild(skeleton);

        pagesContainer.appendChild(wrapper);

        pageStates.push({
          index: i,
          wrapper,
          canvas: null,
          rendered: false,
          renderTask: null,
          renderScale: 0
        });
      }

      function updateNavControls() {
        pageInput.value = String(currentPage);
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= numPages;
      }
      updateNavControls();

      // Render individual page canvas
      async function renderPage(pageIdx) {
        const state = pageStates[pageIdx];
        if (!state || isDestroyed) return;

        const effectiveScale = getEffectiveScale();
        // If already rendered at approx this scale, skip
        if (state.rendered && Math.abs(state.renderScale - effectiveScale) < 0.05) {
          return;
        }

        if (state.renderTask) {
          try { state.renderTask.cancel(); } catch {}
          state.renderTask = null;
        }

        try {
          const page = await pdfDocument.getPage(pageIdx + 1);
          if (isDestroyed) return;

          const meta = pagesMeta[pageIdx];
          const totalRotation = (meta.rotation + rotation) % 360;
          const viewport = page.getViewport({ scale: effectiveScale, rotation: totalRotation });

          const outputScale = Math.max(2, Math.min(window.devicePixelRatio || 1, 2.5));
          const cssWidth = Math.floor(viewport.width);
          const cssHeight = Math.floor(viewport.height);

          let canvas = state.canvas;
          if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'ofv-pdf-page';
            canvas.style.cssText = 'position:absolute;top:0;left:0;display:block;width:100%;height:100%;background:#fff;';
            state.canvas = canvas;
            state.wrapper.replaceChildren(canvas);
          }

          canvas.width = Math.floor(cssWidth * outputScale);
          canvas.height = Math.floor(cssHeight * outputScale);
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;

          const canvasContext = canvas.getContext('2d');
          const renderTask = page.render({
            canvasContext,
            viewport,
            transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0]
          });

          state.renderTask = renderTask;
          await renderTask.promise;
          state.renderTask = null;
          state.rendered = true;
          state.renderScale = effectiveScale;
        } catch (err) {
          if (err?.name !== 'RenderingCancelledException') {
            console.warn(`PDF page ${pageIdx + 1} render failed:`, err);
          }
        }
      }

      function clearPage(pageIdx) {
        const state = pageStates[pageIdx];
        if (!state || !state.rendered) return;
        if (state.renderTask) {
          try { state.renderTask.cancel(); } catch {}
          state.renderTask = null;
        }
        state.rendered = false;
        state.canvas = null;
        state.wrapper.innerHTML = `<div class="ofv-pdf-skeleton" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;background:#f3f4f6;">Page ${pageIdx + 1}</div>`;
      }

      // Intersection Observer for virtual / lazy rendering
      let observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const idx = parseInt(entry.target.getAttribute('data-page-index') || '0', 10);
          if (entry.isIntersecting) {
            renderPage(idx);
          } else if (numPages > 12) {
            clearPage(idx);
          }
        });
      }, {
        root: scroller,
        rootMargin: '500px 0px 500px 0px'
      });

      pageStates.forEach(s => observer.observe(s.wrapper));

      // Scroll position tracking to update page input
      let scrollTimer = null;
      const onScroll = () => {
        if (scrollTimer) return;
        scrollTimer = setTimeout(() => {
          scrollTimer = null;
          const scrollerRect = scroller.getBoundingClientRect();
          const targetY = scrollerRect.top + scrollerRect.height * 0.3;

          let bestPage = currentPage;
          let minDiff = Infinity;
          for (let i = 0; i < pageStates.length; i++) {
            const rect = pageStates[i].wrapper.getBoundingClientRect();
            const diff = Math.abs(rect.top - targetY);
            if (diff < minDiff) {
              minDiff = diff;
              bestPage = i + 1;
            }
          }
          if (bestPage !== currentPage) {
            currentPage = bestPage;
            updateNavControls();
          }
        }, 80);
      };
      scroller.addEventListener('scroll', onScroll, { passive: true });

      // Page Navigator event listeners
      const goToPage = (page) => {
        const p = Math.max(1, Math.min(numPages, Math.round(page) || 1));
        currentPage = p;
        updateNavControls();
        const targetWrapper = pageStates[p - 1]?.wrapper;
        if (targetWrapper) {
          renderPage(p - 1);
          const top = Math.max(0, targetWrapper.offsetTop - 16);
          scroller.scrollTo({ top, behavior: 'smooth' });
        }
      };

      prevBtn.onclick = () => goToPage(currentPage - 1);
      nextBtn.onclick = () => goToPage(currentPage + 1);
      pageInput.onchange = () => goToPage(Number(pageInput.value));
      pageInput.onkeydown = (e) => {
        if (e.key === 'Enter') goToPage(Number(pageInput.value));
      };

      // Zoom Re-render visible pages debounce
      let reRenderTimer = null;
      function scheduleReRender() {
        clearTimeout(reRenderTimer);
        reRenderTimer = setTimeout(() => {
          for (let i = 0; i < pageStates.length; i++) {
            const rect = pageStates[i].wrapper.getBoundingClientRect();
            const scrollerRect = scroller.getBoundingClientRect();
            // Visible or near visible
            if (rect.bottom >= scrollerRect.top - 400 && rect.top <= scrollerRect.bottom + 400) {
              renderPage(i);
            }
          }
        }, 150);
      }

      /**
       * Core layout updater for focal zoom
       * Commits the new zoom factor and scrolls immediately to the target focal position!
       * NEVER resets to top!
       */
      function applyZoomAndFocalScroll(newZoom, targetScrollLeft, targetScrollTop) {
        zoomFactor = Math.min(5, Math.max(0.25, newZoom));
        const scale = getEffectiveScale();

        // Update all wrapper box dimensions
        for (let i = 0; i < pageStates.length; i++) {
          const state = pageStates[i];
          const meta = pagesMeta[i];
          const w = Math.floor(meta.width * scale);
          const h = Math.floor(meta.height * scale);
          state.wrapper.style.width = `${w}px`;
          state.wrapper.style.height = `${h}px`;
          if (state.canvas) {
            state.canvas.style.width = `${w}px`;
            state.canvas.style.height = `${h}px`;
          }
        }

        // Apply preserved scroll focal position
        scroller.scrollLeft = Math.max(0, targetScrollLeft);
        scroller.scrollTop = Math.max(0, targetScrollTop);

        ctx.toolbar?.setZoom(zoomFactor);
        scheduleReRender();
      }

      /**
       * Zoom centered on a focal point (e.g. viewport center or double-tap point)
       */
      function zoomAtFocalPoint(newZoom, clientX, clientY) {
        const scrollerRect = scroller.getBoundingClientRect();
        const Vx = clientX != null ? clientX - scrollerRect.left : scrollerRect.width / 2;
        const Vy = clientY != null ? clientY - scrollerRect.top : scrollerRect.height / 2;

        const Cx = scroller.scrollLeft + Vx;
        const Cy = scroller.scrollTop + Vy;

        const clampedZoom = Math.min(5, Math.max(0.25, newZoom));
        const ratio = clampedZoom / zoomFactor;

        const targetLeft = Cx * ratio - Vx;
        const targetTop = Cy * ratio - Vy;

        applyZoomAndFocalScroll(clampedZoom, targetLeft, targetTop);
      }

      // ── Touch Gesture Management (Continuous "无极" Pinch-To-Zoom) ──
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
          pinchStartZoom = zoomFactor;

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
            // Double tap toggle: zoom to 2x or reset to 1x
            if (Math.abs(zoomFactor - 1.0) < 0.15) {
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

          // GPU Transform during gesture for 60/120 FPS buttery smooth pinch:
          const tx = V1x - pinchContentFocal.x * k + pinchStartScroll.left;
          const ty = V1y - pinchContentFocal.y * k + pinchStartScroll.top;
          pagesContainer.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
        }
      };

      const onTouchEnd = (e) => {
        if (isPinching) {
          isPinching = false;
          e.preventDefault();
          e.stopPropagation();

          pagesContainer.style.transform = 'none';

          const finalZoom = Math.min(5, Math.max(0.25, pinchStartZoom * lastPinchRatio));
          const actualRatio = finalZoom / pinchStartZoom;

          const scrollerRect = scroller.getBoundingClientRect();
          const V1x = lastMidpoint.x - scrollerRect.left;
          const V1y = lastMidpoint.y - scrollerRect.top;

          const targetLeft = pinchContentFocal.x * actualRatio - V1x;
          const targetTop = pinchContentFocal.y * actualRatio - V1y;

          applyZoomAndFocalScroll(finalZoom, targetLeft, targetTop);
        }
      };

      // Desktop Ctrl + Mouse Wheel zoom with focal point
      const onWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          const factor = e.deltaY < 0 ? 1.15 : 0.85;
          zoomAtFocalPoint(zoomFactor * factor, e.clientX, e.clientY);
        }
      };

      scroller.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
      scroller.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
      scroller.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
      scroller.addEventListener('touchcancel', onTouchEnd, { passive: false, capture: true });
      scroller.addEventListener('wheel', onWheel, { passive: false });

      ctx.toolbar?.setZoom(zoomFactor);

      return {
        goToPage(page) {
          goToPage(page);
          return true;
        },
        canCommand(command) {
          return (
            command === 'zoom-in' ||
            command === 'zoom-out' ||
            command === 'zoom-reset' ||
            command === 'rotate-right' ||
            command === 'rotate-left'
          );
        },
        command(command) {
          if (command === 'zoom-in') {
            zoomAtFocalPoint(zoomFactor * 1.25);
            return true;
          }
          if (command === 'zoom-out') {
            zoomAtFocalPoint(zoomFactor / 1.25);
            return true;
          }
          if (command === 'zoom-reset') {
            zoomAtFocalPoint(1.0);
            return true;
          }
          if (command === 'rotate-right') {
            rotation = (rotation + 90) % 360;
            pageStates.forEach(s => { s.rendered = false; });
            scheduleReRender();
            return true;
          }
          if (command === 'rotate-left') {
            rotation = (rotation - 90 + 360) % 360;
            pageStates.forEach(s => { s.rendered = false; });
            scheduleReRender();
            return true;
          }
          return false;
        },
        getPdfDocument() {
          return pdfDocument;
        },
        getPagesMeta() {
          return pagesMeta;
        },
        getCurrentPage() {
          return currentPage;
        },
        resize() {
          const oldBase = baseScale;
          baseScale = getBaseScale();
          if (Math.abs(oldBase - baseScale) > 0.01) {
            const ratio = baseScale / oldBase;
            const targetLeft = scroller.scrollLeft * ratio;
            const targetTop = scroller.scrollTop * ratio;
            applyZoomAndFocalScroll(zoomFactor, targetLeft, targetTop);
          }
        },
        destroy() {
          isDestroyed = true;
          scroller.removeEventListener('touchstart', onTouchStart, { capture: true });
          scroller.removeEventListener('touchmove', onTouchMove, { capture: true });
          scroller.removeEventListener('touchend', onTouchEnd, { capture: true });
          scroller.removeEventListener('touchcancel', onTouchEnd, { capture: true });
          scroller.removeEventListener('wheel', onWheel);
          scroller.removeEventListener('scroll', onScroll);

          observer?.disconnect();
          clearTimeout(scrollTimer);
          clearTimeout(reRenderTimer);

          pageStates.forEach((s) => {
            if (s.renderTask) {
              try { s.renderTask.cancel(); } catch {}
            }
          });
          pageStates.length = 0;

          if (pdfDocument) {
            try { pdfDocument.destroy(); } catch {}
          }
        }
      };
    }
  };
}
