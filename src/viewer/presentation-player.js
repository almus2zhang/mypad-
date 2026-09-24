/**
 * Presentation Player (播放演示控制器)
 * Supports full-screen slideshow presentation for PPT and PDF files:
 * - Single-page / single-slide full-screen presentation (全屏分页展示，一次只显示一页)
 * - Default fit: fills either horizontal or vertical dimension (默认要么横向铺满，要么纵向铺满)
 * - Pinch-to-zoom, mouse wheel zoom, and drag panning (展示后支持缩放和移动)
 * - One-click reset button to return to default scale and position (一键回到默认按钮)
 * - Touch swipe, keyboard arrow navigation, and floating translucent controls
 * @module viewer/presentation-player
 */

export function openPresentationPlayer({ container, tab }) {
  if (!container || !tab) return null;

  const ext = (tab.filename.split('.').pop() || '').toLowerCase();
  const isPdf = ext === 'pdf';
  const isPpt = ['pptx', 'ppt', 'ppsx', 'pps', 'potx', 'potm', 'odp', 'fodp'].includes(ext);

  if (!isPdf && !isPpt) {
    console.warn('[PresentationPlayer] Unsupported format for presentation:', ext);
    return null;
  }

  // Find PDF or PPT data from container
  let pdfDoc = null;
  let pagesMeta = [];
  let numPages = 1;
  let pptSlides = [];
  let initialPage = 1;

  if (isPdf) {
    const pdfViewer = container.querySelector('.ofv-pdf-viewer');
    if (pdfViewer && pdfViewer._pdfDocument) {
      pdfDoc = pdfViewer._pdfDocument;
      pagesMeta = pdfViewer._pagesMeta || [];
      numPages = pdfViewer._numPages || pdfDoc.numPages || 1;
      initialPage = pdfViewer._getCurrentPage ? pdfViewer._getCurrentPage() : 1;
    } else {
      // Fallback: search for page wrappers in container
      const wrappers = container.querySelectorAll('.ofv-pdf-page-wrapper');
      numPages = wrappers.length || 1;
    }
  } else if (isPpt) {
    const officePanel = container.querySelector('.ofv-office');
    const slideQuery = '.ofv-office div[data-slide-index], .ofv-office .ofv-slide, .ofv-office .ofv-ppt-binary-slide';
    pptSlides = Array.from((officePanel || container).querySelectorAll(slideQuery));
    numPages = pptSlides.length || 1;

    // Determine currently visible slide based on scroll position
    if (officePanel && pptSlides.length > 0) {
      const panelTop = officePanel.scrollTop;
      let closestIdx = 0;
      let minDiff = Infinity;
      pptSlides.forEach((slide, idx) => {
        const diff = Math.abs(slide.offsetTop - panelTop);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      initialPage = closestIdx + 1;
    }
  }

  if (numPages <= 0) {
    console.warn('[PresentationPlayer] No pages or slides found to present');
    return null;
  }

  // Build Presentation Player DOM
  const overlay = document.createElement('div');
  overlay.className = 'mypad-presentation-player';
  overlay.tabIndex = 0;

  // Stage: viewport area for displaying the slide
  const stage = document.createElement('div');
  stage.className = 'mypad-pres-stage';

  // Slide Box: holds the rendered canvas (PDF) or cloned slide (PPT)
  const slideBox = document.createElement('div');
  slideBox.className = 'mypad-pres-slide-box';
  stage.appendChild(slideBox);
  overlay.appendChild(stage);

  // Left & Right floating navigation chevron buttons
  const prevChevron = document.createElement('button');
  prevChevron.type = 'button';
  prevChevron.className = 'mypad-pres-chevron mypad-pres-chevron-prev';
  prevChevron.title = '上一页 (Left Arrow)';
  prevChevron.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;

  const nextChevron = document.createElement('button');
  nextChevron.type = 'button';
  nextChevron.className = 'mypad-pres-chevron mypad-pres-chevron-next';
  nextChevron.title = '下一页 (Right Arrow / Space)';
  nextChevron.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;

  overlay.appendChild(prevChevron);
  overlay.appendChild(nextChevron);

  // Prominent One-Click Reset Button ("一键回到默认" 浮动胶囊)
  const resetFloatingBtn = document.createElement('button');
  resetFloatingBtn.type = 'button';
  resetFloatingBtn.className = 'mypad-pres-floating-reset-btn';
  resetFloatingBtn.title = '一键回到默认大小与位置 (快捷键: R / 0)';
  resetFloatingBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
    <span>回到默认</span>
  `;
  overlay.appendChild(resetFloatingBtn);

  // Bottom floating control dock (default collapsed into small circular hamburger button)
  const dock = document.createElement('div');
  dock.className = 'mypad-pres-dock is-collapsed';

  // Left Wing Toggle Button:
  // - When collapsed: displays ◂▸ merged inside the circular button (positioned at ◂)
  // - When expanded: displays ◂ at the leftmost of the dock
  const btnToggleDockLeft = document.createElement('button');
  btnToggleDockLeft.type = 'button';
  btnToggleDockLeft.className = 'mypad-pres-dock-toggle mypad-pres-dock-toggle-left';
  btnToggleDockLeft.title = '展开控制栏';
  btnToggleDockLeft.setAttribute('aria-label', 'Toggle presentation controls');
  btnToggleDockLeft.innerHTML = `
    <svg class="mypad-pres-icon-merged" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="10 6 3 12 10 18 10 6"></polygon>
      <polygon points="14 6 21 12 14 18 14 6"></polygon>
    </svg>
    <svg class="mypad-pres-icon-collapse-left" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="17 19 7 12 17 5 17 19"></polygon>
    </svg>
  `;

  const dockContent = document.createElement('div');
  dockContent.className = 'mypad-pres-dock-content';

  // Previous Page Button
  const btnPrev = document.createElement('button');
  btnPrev.type = 'button';
  btnPrev.className = 'mypad-pres-dock-btn';
  btnPrev.title = '上一页 / Previous Slide';
  btnPrev.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;

  // Page Counter Indicator (clickable input)
  const pageIndicator = document.createElement('div');
  pageIndicator.className = 'mypad-pres-page-indicator';
  const pageCurrentSpan = document.createElement('span');
  pageCurrentSpan.className = 'mypad-pres-current-page';
  pageCurrentSpan.textContent = String(initialPage);
  const pageSep = document.createElement('span');
  pageSep.textContent = '/';
  pageSep.style.opacity = '0.6';
  const pageTotalSpan = document.createElement('span');
  pageTotalSpan.textContent = String(numPages);
  pageIndicator.append(pageCurrentSpan, pageSep, pageTotalSpan);

  // Next Page Button
  const btnNext = document.createElement('button');
  btnNext.type = 'button';
  btnNext.className = 'mypad-pres-dock-btn';
  btnNext.title = '下一页 / Next Slide';
  btnNext.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;

  const dockDivider1 = document.createElement('div');
  dockDivider1.className = 'mypad-pres-dock-divider';

  // Reset to Default button in dock
  const btnResetDock = document.createElement('button');
  btnResetDock.type = 'button';
  btnResetDock.className = 'mypad-pres-dock-btn mypad-pres-dock-btn-reset';
  btnResetDock.title = '一键回到默认大小与位置 (R)';
  btnResetDock.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
    <span class="mypad-pres-dock-text">复位</span>
  `;

  // Fit mode toggle button (自适应 / 铺满宽 / 铺满高)
  const btnFitToggle = document.createElement('button');
  btnFitToggle.type = 'button';
  btnFitToggle.className = 'mypad-pres-dock-btn';
  btnFitToggle.title = '切换缩放铺满模式: 铺满屏幕(默认) / 铺满宽 / 铺满高';
  btnFitToggle.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
    <span class="mypad-pres-dock-text" id="pres-fit-mode-text">自适应</span>
  `;

  const dockDivider2 = document.createElement('div');
  dockDivider2.className = 'mypad-pres-dock-divider';

  // Exit Presentation Button
  const btnExit = document.createElement('button');
  btnExit.type = 'button';
  btnExit.className = 'mypad-pres-dock-btn mypad-pres-dock-btn-exit';
  btnExit.title = '退出播放 (Escape)';
  btnExit.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
    <span class="mypad-pres-dock-text">退出</span>
  `;

  const dockDivider3 = document.createElement('div');
  dockDivider3.className = 'mypad-pres-dock-divider';

  // Right Wing Toggle Button (▸ collapse when expanded)
  const btnToggleDockRight = document.createElement('button');
  btnToggleDockRight.type = 'button';
  btnToggleDockRight.className = 'mypad-pres-dock-toggle mypad-pres-dock-toggle-right';
  btnToggleDockRight.title = '收起控制栏';
  btnToggleDockRight.setAttribute('aria-label', 'Collapse presentation controls');
  btnToggleDockRight.innerHTML = `
    <svg class="mypad-pres-icon-collapse-right" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="7 5 17 12 7 19 7 5"></polygon>
    </svg>
  `;

  dockContent.append(btnPrev, pageIndicator, btnNext, dockDivider1, btnResetDock, btnFitToggle, dockDivider2, btnExit, dockDivider3, btnToggleDockRight);
  dock.append(btnToggleDockLeft, dockContent);
  overlay.appendChild(dock);

  // Top-Right Close Button
  const btnCloseTop = document.createElement('button');
  btnCloseTop.type = 'button';
  btnCloseTop.className = 'mypad-pres-top-close-btn';
  btnCloseTop.title = '退出播放演示 (Esc)';
  btnCloseTop.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  overlay.appendChild(btnCloseTop);

  document.body.appendChild(overlay);

  // Request browser Fullscreen
  if (document.fullscreenEnabled && !document.fullscreenElement) {
    overlay.requestFullscreen().catch(() => {});
  }

  // State
  let currentPage = Math.max(1, Math.min(numPages, initialPage));
  let currentZoom = 1.0; // Zoom multiplier on top of defaultScale (1.0 = default)
  let defaultScale = 1.0; // Scale to fit screen horizontally or vertically
  let offsetX = 0;
  let offsetY = 0;
  let contentW = 960;
  let contentH = 540;
  let fitMode = 'contain'; // 'contain' (默认横向或纵向铺满), 'width' (铺满宽), 'height' (铺满高)
  let isDestroyed = false;
  let pdfRenderTask = null;

  // Auto-hide controls timer
  let hideControlsTimer = null;
  function resetControlsTimer() {
    overlay.classList.remove('controls-hidden');
    clearTimeout(hideControlsTimer);
    hideControlsTimer = setTimeout(() => {
      if (!isDestroyed) {
        overlay.classList.add('controls-hidden');
      }
    }, 3500);
  }
  resetControlsTimer();

  // Helper to extract PPT slide dimensions
  function getSlideDimensions(slideEl) {
    if (!slideEl) return { width: 960, height: 540 };
    const candidate = slideEl.querySelector('[style*="width"][style*="height"]') || slideEl.firstElementChild || slideEl;
    let w = parseFloat(candidate?.style?.width) || parseFloat(slideEl.style.width);
    let h = parseFloat(candidate?.style?.height) || parseFloat(slideEl.style.height);

    if (!w || !h) {
      const rect = slideEl.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
    }
    if (!w || !h) {
      w = 960;
      h = 540;
    }
    return { width: w, height: h };
  }

  // Calculate default scale to fill horizontally or vertically ("默认要么横向铺满，要么纵向铺满")
  function calculateDefaultScale() {
    const stageW = stage.clientWidth || window.innerWidth || 1920;
    const stageH = stage.clientHeight || window.innerHeight || 1080;

    const scaleX = stageW / contentW;
    const scaleY = stageH / contentH;

    if (fitMode === 'width') {
      defaultScale = scaleX;
    } else if (fitMode === 'height') {
      defaultScale = scaleY;
    } else {
      // 'contain': Fill screen along whichever axis maxes out first,
      // so it touches the screen borders horizontally OR vertically without clipping!
      defaultScale = Math.min(scaleX, scaleY);
    }
  }

  function updateResetButtonVisibility() {
    const isModified = Math.abs(currentZoom - 1.0) > 0.02 || Math.abs(offsetX) > 4 || Math.abs(offsetY) > 4;
    if (isModified) {
      resetFloatingBtn.classList.add('is-visible');
      btnResetDock.classList.add('is-active');
    } else {
      resetFloatingBtn.classList.remove('is-visible');
      btnResetDock.classList.remove('is-active');
    }
  }

  function applyTransform() {
    const totalScale = defaultScale * currentZoom;
    slideBox.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${totalScale})`;
    updateResetButtonVisibility();
  }

  // Smoothly reset back to default position & fit ("一键回到默认按钮")
  function resetToDefault(withAnimation = true) {
    currentZoom = 1.0;
    offsetX = 0;
    offsetY = 0;

    if (withAnimation) {
      slideBox.style.transition = 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)';
      applyTransform();
      setTimeout(() => {
        if (!isDestroyed) slideBox.style.transition = 'none';
      }, 290);
    } else {
      slideBox.style.transition = 'none';
      applyTransform();
    }
  }

  // Zoom centered on a focal point (clientX, clientY)
  function zoomAtFocalPoint(newZoom, clientX, clientY, withAnimation = false) {
    const clampedZoom = Math.min(8.0, Math.max(0.5, newZoom));
    if (Math.abs(clampedZoom - currentZoom) < 0.001) return;

    const stageRect = stage.getBoundingClientRect();
    const stageCenterX = stageRect.left + stageRect.width / 2;
    const stageCenterY = stageRect.top + stageRect.height / 2;

    const Fx = clientX != null ? clientX : stageCenterX;
    const Fy = clientY != null ? clientY : stageCenterY;

    // Local point on slide under (Fx, Fy):
    const currentTotalScale = defaultScale * currentZoom;
    const focalOnSlideX = (Fx - stageCenterX - offsetX) / currentTotalScale;
    const focalOnSlideY = (Fy - stageCenterY - offsetY) / currentTotalScale;

    const newTotalScale = defaultScale * clampedZoom;
    offsetX = Fx - stageCenterX - newTotalScale * focalOnSlideX;
    offsetY = Fy - stageCenterY - newTotalScale * focalOnSlideY;
    currentZoom = clampedZoom;

    if (withAnimation) {
      slideBox.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)';
      applyTransform();
      setTimeout(() => {
        if (!isDestroyed) slideBox.style.transition = 'none';
      }, 230);
    } else {
      slideBox.style.transition = 'none';
      applyTransform();
    }
  }

  // Render current slide
  async function renderSlide(pageNum) {
    currentPage = Math.max(1, Math.min(numPages, pageNum));

    // Update UI controls
    pageCurrentSpan.textContent = String(currentPage);
    prevChevron.disabled = currentPage <= 1;
    nextChevron.disabled = currentPage >= numPages;
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= numPages;

    // Reset zoom and offset for the new slide
    currentZoom = 1.0;
    offsetX = 0;
    offsetY = 0;
    slideBox.style.transition = 'none';

    if (isPdf && pdfDoc) {
      // PDF page render via pdf.js
      if (pdfRenderTask) {
        try { pdfRenderTask.cancel(); } catch {}
        pdfRenderTask = null;
      }

      slideBox.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.className = 'mypad-pres-canvas';
      slideBox.appendChild(canvas);

      try {
        const page = await pdfDoc.getPage(currentPage);
        const meta = pagesMeta[currentPage - 1] || { width: 612, height: 792 };
        contentW = meta.width;
        contentH = meta.height;

        calculateDefaultScale();

        slideBox.style.width = `${contentW}px`;
        slideBox.style.height = `${contentH}px`;
        applyTransform();

        // High resolution rendering for sharp full-screen presentation
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);
        const renderScale = defaultScale * dpr;
        const vp = page.getViewport({ scale: renderScale });

        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        canvas.style.width = `${contentW}px`;
        canvas.style.height = `${contentH}px`;

        const ctx = canvas.getContext('2d');
        pdfRenderTask = page.render({ canvasContext: ctx, viewport: vp });
        await pdfRenderTask.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[PresentationPlayer] Failed to render PDF slide:', err);
        }
      }
    } else if (isPpt) {
      // PPT slide render via cloned DOM elements
      slideBox.innerHTML = '';
      const slideEl = pptSlides[currentPage - 1];
      if (slideEl) {
        const dims = getSlideDimensions(slideEl);
        contentW = dims.width;
        contentH = dims.height;

        calculateDefaultScale();

        slideBox.style.width = `${contentW}px`;
        slideBox.style.height = `${contentH}px`;

        const clone = slideEl.cloneNode(true);
        clone.style.margin = '0';
        clone.style.zoom = '1';
        clone.style.transform = 'none';
        clone.style.width = '100%';
        clone.style.height = '100%';
        clone.style.position = 'relative';
        clone.style.boxShadow = 'none';

        slideBox.appendChild(clone);
        applyTransform();
      }
    }
  }

  // Navigation actions
  function goToPrev() {
    if (currentPage > 1) {
      renderSlide(currentPage - 1);
    }
  }

  function goToNext() {
    if (currentPage < numPages) {
      renderSlide(currentPage + 1);
    }
  }

  // Control Dock Expand / Collapse State (默认收起为三横小圆按钮，点击后展开，超时自动收回)
  let isDockExpanded = false;
  let dockCollapseTimer = null;

  function expandDock() {
    if (isDestroyed) return;
    isDockExpanded = true;
    dock.classList.remove('is-collapsed');
    dock.classList.add('is-expanded');
    btnToggleDockLeft.title = '收起控制栏';
    resetDockCollapseTimer();
  }

  function collapseDock() {
    if (isDestroyed) return;
    isDockExpanded = false;
    dock.classList.remove('is-expanded');
    dock.classList.add('is-collapsed');
    btnToggleDockLeft.title = '展开控制栏';
    clearTimeout(dockCollapseTimer);
    dockCollapseTimer = null;
  }

  function resetDockCollapseTimer() {
    clearTimeout(dockCollapseTimer);
    if (isDockExpanded) {
      dockCollapseTimer = setTimeout(() => {
        if (!isDestroyed && isDockExpanded) {
          collapseDock();
        }
      }, 4000);
    }
  }

  btnToggleDockLeft.onclick = (e) => {
    e.stopPropagation();
    if (isDockExpanded) {
      collapseDock();
    } else {
      expandDock();
    }
  };

  btnToggleDockRight.onclick = (e) => {
    e.stopPropagation();
    collapseDock();
  };

  dock.onclick = (e) => {
    e.stopPropagation();
    if (!isDockExpanded) {
      expandDock();
    } else {
      resetDockCollapseTimer();
    }
  };

  // Button Click Handlers
  prevChevron.onclick = (e) => { e.stopPropagation(); goToPrev(); resetControlsTimer(); };
  nextChevron.onclick = (e) => { e.stopPropagation(); goToNext(); resetControlsTimer(); };
  btnPrev.onclick = (e) => { e.stopPropagation(); goToPrev(); resetDockCollapseTimer(); resetControlsTimer(); };
  btnNext.onclick = (e) => { e.stopPropagation(); goToNext(); resetDockCollapseTimer(); resetControlsTimer(); };

  resetFloatingBtn.onclick = (e) => {
    e.stopPropagation();
    resetToDefault(true);
    resetControlsTimer();
  };

  btnResetDock.onclick = (e) => {
    e.stopPropagation();
    resetToDefault(true);
    resetDockCollapseTimer();
    resetControlsTimer();
  };

  btnFitToggle.onclick = (e) => {
    e.stopPropagation();
    if (fitMode === 'contain') {
      fitMode = 'width';
      document.getElementById('pres-fit-mode-text').textContent = '铺满宽';
    } else if (fitMode === 'width') {
      fitMode = 'height';
      document.getElementById('pres-fit-mode-text').textContent = '铺满高';
    } else {
      fitMode = 'contain';
      document.getElementById('pres-fit-mode-text').textContent = '自适应';
    }
    calculateDefaultScale();
    resetToDefault(true);
    resetDockCollapseTimer();
    resetControlsTimer();
  };

  btnExit.onclick = (e) => { e.stopPropagation(); closePlayer(); };
  btnCloseTop.onclick = (e) => { e.stopPropagation(); closePlayer(); };

  // Page input on indicator click
  pageIndicator.onclick = (e) => {
    e.stopPropagation();
    resetDockCollapseTimer();
    const input = prompt(`跳转到第几页 (1 - ${numPages}):`, String(currentPage));
    const target = parseInt(input, 10);
    if (!isNaN(target) && target >= 1 && target <= numPages) {
      renderSlide(target);
    }
    resetControlsTimer();
  };

  // Keyboard navigation
  const onKeyDown = (e) => {
    resetControlsTimer();
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'n':
      case 'N':
        e.preventDefault();
        goToNext();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
      case 'p':
      case 'P':
        e.preventDefault();
        goToPrev();
        break;
      case 'Home':
        e.preventDefault();
        renderSlide(1);
        break;
      case 'End':
        e.preventDefault();
        renderSlide(numPages);
        break;
      case 'r':
      case 'R':
      case '0':
        e.preventDefault();
        resetToDefault(true);
        break;
      case 'Escape':
        e.preventDefault();
        closePlayer();
        break;
    }
  };

  // Touch Gesture Handling (Pinch-to-zoom, Pan, and Swipe navigation)
  let isPinching = false;
  let isDragging = false;
  let pinchStartDist = 0;
  let pinchStartMidpoint = { x: 0, y: 0 };
  let pinchStartZoom = 1.0;
  let pinchStartOffset = { x: 0, y: 0 };
  let pinchFocalOnSlide = { x: 0, y: 0 };

  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartOffset = { x: 0, y: 0 };
  let touchStartTime = 0;
  let touchStartPos = { x: 0, y: 0 };

  let lastTapTime = 0;
  let lastTapPos = { x: 0, y: 0 };

  const onTouchStart = (e) => {
    resetControlsTimer();

    // If dock is expanded and user taps screen outside dock, auto-collapse it
    if (isDockExpanded && !e.target.closest('.mypad-pres-dock')) {
      collapseDock();
    }

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
      pinchStartZoom = currentZoom;
      pinchStartOffset = { x: offsetX, y: offsetY };

      const stageRect = stage.getBoundingClientRect();
      const stageCenterX = stageRect.left + stageRect.width / 2;
      const stageCenterY = stageRect.top + stageRect.height / 2;

      const currentTotalScale = defaultScale * pinchStartZoom;
      pinchFocalOnSlide = {
        x: (pinchStartMidpoint.x - stageCenterX - pinchStartOffset.x) / currentTotalScale,
        y: (pinchStartMidpoint.y - stageCenterY - pinchStartOffset.y) / currentTotalScale
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();

      // Double-tap to zoom toggle
      if (now - lastTapTime < 300 && Math.hypot(t.clientX - lastTapPos.x, t.clientY - lastTapPos.y) < 40) {
        e.preventDefault();
        e.stopPropagation();
        lastTapTime = 0;
        if (currentZoom > 1.2) {
          resetToDefault(true);
        } else {
          zoomAtFocalPoint(2.5, t.clientX, t.clientY, true);
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
      touchStartTime = now;
      touchStartPos = { x: t.clientX, y: t.clientY };
    }
  };

  const onTouchMove = (e) => {
    resetControlsTimer();

    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (dist <= 0 || pinchStartDist <= 0) return;

      const ratio = dist / pinchStartDist;
      const nextZoom = Math.min(8.0, Math.max(0.5, pinchStartZoom * ratio));

      const curMidpoint = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };

      const stageRect = stage.getBoundingClientRect();
      const stageCenterX = stageRect.left + stageRect.width / 2;
      const stageCenterY = stageRect.top + stageRect.height / 2;

      const nextTotalScale = defaultScale * nextZoom;
      offsetX = curMidpoint.x - stageCenterX - nextTotalScale * pinchFocalOnSlide.x;
      offsetY = curMidpoint.y - stageCenterY - nextTotalScale * pinchFocalOnSlide.y;
      currentZoom = nextZoom;

      slideBox.style.transition = 'none';
      applyTransform();
    } else if (isDragging && e.touches.length === 1 && !isPinching) {
      const t = e.touches[0];
      const deltaX = t.clientX - dragStartX;
      const deltaY = t.clientY - dragStartY;

      // When zoomed in, drag pans the view
      if (currentZoom > 1.05 || Math.abs(offsetX) > 4 || Math.abs(offsetY) > 4) {
        e.preventDefault();
        offsetX = dragStartOffset.x + deltaX;
        offsetY = dragStartOffset.y + deltaY;
        slideBox.style.transition = 'none';
        applyTransform();
      } else {
        // Prevent default browser viewport scrolling/gestures so swipe is smooth
        e.preventDefault();
      }
    }
  };

  const onTouchEnd = (e) => {
    resetControlsTimer();

    if (isPinching && e.touches.length === 1) {
      // Transition from pinch to single-finger drag
      isPinching = false;
      isDragging = true;
      const t = e.touches[0];
      dragStartX = t.clientX;
      dragStartY = t.clientY;
      dragStartOffset = { x: offsetX, y: offsetY };
    } else if (e.touches.length === 0) {
      if (isDragging && currentZoom <= 1.05) {
        // Swipe detection when at default scale (supports both horizontal & vertical swipes)
        const deltaX = (e.changedTouches?.[0]?.clientX || dragStartX) - touchStartPos.x;
        const deltaY = (e.changedTouches?.[0]?.clientY || dragStartY) - touchStartPos.y;
        const elapsed = Date.now() - touchStartTime;

        if (elapsed < 650) {
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);
          const minSwipeDist = 38;

          if (absY > absX && absY > minSwipeDist) {
            // Vertical swipe: swipe up -> next slide, swipe down -> prev slide
            if (deltaY < 0) {
              goToNext();
            } else {
              goToPrev();
            }
          } else if (absX >= absY && absX > minSwipeDist) {
            // Horizontal swipe: swipe left -> next slide, swipe right -> prev slide
            if (deltaX < 0) {
              goToNext();
            } else {
              goToPrev();
            }
          }
        }
      }
      isPinching = false;
      isDragging = false;
    }
  };

  // Mouse drag panning & swiping (Desktop)
  let isMouseDown = false;
  let mouseStartX = 0;
  let mouseStartY = 0;
  let mouseStartOffset = { x: 0, y: 0 };
  let didMouseMove = false;
  let mouseStartTime = 0;

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.mypad-pres-dock, .mypad-pres-chevron, .mypad-pres-floating-reset-btn, .mypad-pres-top-close-btn')) {
      return;
    }
    isMouseDown = true;
    didMouseMove = false;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    mouseStartOffset = { x: offsetX, y: offsetY };
    mouseStartTime = Date.now();
  };

  const onMouseMove = (e) => {
    resetControlsTimer();
    if (!isMouseDown) return;

    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;
    if (Math.hypot(dx, dy) > 4) {
      didMouseMove = true;
    }

    if (didMouseMove) {
      e.preventDefault();
      // Only pan the slide if zoomed in or already offset
      if (currentZoom > 1.05 || Math.abs(offsetX) > 4 || Math.abs(offsetY) > 4) {
        offsetX = mouseStartOffset.x + dx;
        offsetY = mouseStartOffset.y + dy;
        slideBox.style.transition = 'none';
        applyTransform();
      }
    }
  };

  const onMouseUp = (e) => {
    if (isMouseDown) {
      if (!didMouseMove) {
        // If dock is expanded and user clicks screen outside dock, auto-collapse it
        if (isDockExpanded && !e.target.closest('.mypad-pres-dock')) {
          collapseDock();
        }
        // Click without drag: click left/right 22% of screen advances slide
        const clickX = e.clientX;
        const screenW = window.innerWidth;
        if (clickX < screenW * 0.22) {
          goToPrev();
        } else if (clickX > screenW * 0.78) {
          goToNext();
        }
      } else if (currentZoom <= 1.05) {
        // Drag swipe on desktop when at default scale
        const dx = e.clientX - mouseStartX;
        const dy = e.clientY - mouseStartY;
        const elapsed = Date.now() - mouseStartTime;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (elapsed < 650) {
          const minDragDist = 40;
          if (absY > absX && absY > minDragDist) {
            // Drag up -> next, drag down -> prev
            if (dy < 0) {
              goToNext();
            } else {
              goToPrev();
            }
          } else if (absX >= absY && absX > minDragDist) {
            // Drag left -> next, drag right -> prev
            if (dx < 0) {
              goToNext();
            } else {
              goToPrev();
            }
          }
        }
      }
    }
    isMouseDown = false;
  };

  // Mouse wheel & touchpad scroll:
  // - Holding Ctrl or already zoomed in (>1.05): zoom centered at cursor
  // - At default view (<=1.05): vertical or horizontal scroll turns pages (with debounce)
  let lastWheelTime = 0;
  const onWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetControlsTimer();

    if (e.ctrlKey || currentZoom > 1.05) {
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      zoomAtFocalPoint(currentZoom * factor, e.clientX, e.clientY, false);
    } else {
      const now = Date.now();
      if (now - lastWheelTime < 380) {
        // Debounce trackpad / mouse wheel event bursts
        return;
      }

      const absY = Math.abs(e.deltaY);
      const absX = Math.abs(e.deltaX);
      if (absY > 15 || absX > 15) {
        if (absY >= absX) {
          if (e.deltaY > 0) {
            lastWheelTime = now;
            goToNext();
          } else if (e.deltaY < 0) {
            lastWheelTime = now;
            goToPrev();
          }
        } else {
          if (e.deltaX > 0) {
            lastWheelTime = now;
            goToNext();
          } else if (e.deltaX < 0) {
            lastWheelTime = now;
            goToPrev();
          }
        }
      }
    }
  };

  // Double click to toggle zoom on desktop
  const onDblClick = (e) => {
    if (e.target.closest('.mypad-pres-dock, .mypad-pres-chevron, .mypad-pres-floating-reset-btn, .mypad-pres-top-close-btn')) {
      return;
    }
    e.preventDefault();
    if (currentZoom > 1.2) {
      resetToDefault(true);
    } else {
      zoomAtFocalPoint(2.5, e.clientX, e.clientY, true);
    }
  };

  // Window resize handler
  const onResize = () => {
    calculateDefaultScale();
    applyTransform();
  };

  // Listeners
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', onResize);
  stage.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
  stage.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  stage.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
  stage.addEventListener('touchcancel', onTouchEnd, { passive: false, capture: true });
  stage.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('dblclick', onDblClick);
  overlay.addEventListener('mousemove', resetControlsTimer);

  const onFullscreenChange = () => {
    if (!document.fullscreenElement && !isDestroyed) {
      // If user exited fullscreen, exit presentation player
      closePlayer();
    }
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);

  // Close / Exit Presentation Player
  function closePlayer() {
    if (isDestroyed) return;
    isDestroyed = true;

    clearTimeout(hideControlsTimer);
    clearTimeout(dockCollapseTimer);

    if (pdfRenderTask) {
      try { pdfRenderTask.cancel(); } catch {}
      pdfRenderTask = null;
    }

    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', onResize);
    stage.removeEventListener('touchstart', onTouchStart, { capture: true });
    stage.removeEventListener('touchmove', onTouchMove, { capture: true });
    stage.removeEventListener('touchend', onTouchEnd, { capture: true });
    stage.removeEventListener('touchcancel', onTouchEnd, { capture: true });
    stage.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    stage.removeEventListener('wheel', onWheel);
    stage.removeEventListener('dblclick', onDblClick);
    overlay.removeEventListener('mousemove', resetControlsTimer);
    document.removeEventListener('fullscreenchange', onFullscreenChange);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    overlay.remove();

    // Scroll main view to the slide user was viewing in presentation mode
    if (isPdf) {
      const pageWrapper = container.querySelector(`.ofv-pdf-page-wrapper[data-page-index="${currentPage - 1}"]`);
      pageWrapper?.scrollIntoView?.({ block: 'start' });
    } else if (isPpt) {
      const slideEl = pptSlides[currentPage - 1];
      slideEl?.scrollIntoView?.({ block: 'start' });
    }
  }

  // Initial slide render
  renderSlide(currentPage);

  overlay.focus();

  return {
    overlay,
    close: closePlayer,
    next: goToNext,
    prev: goToPrev,
    reset: resetToDefault
  };
}
