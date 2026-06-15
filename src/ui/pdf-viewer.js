import * as pdfjsLib from 'pdfjs-dist';

// We must set the workerSrc to the worker script
// Vite can import the worker script as a URL using '?url' or we can just point to a CDN.
// To avoid dealing with Vite worker bundling issues which can be tricky, 
// we can use a CDN URL that matches the installed version, or we can rely on Vite's worker import.
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function renderPDF(arrayBuffer, containerEl) {
  containerEl.innerHTML = '';
  containerEl.style.overflowY = 'auto';
  containerEl.style.backgroundColor = '#525659'; // Typical PDF viewer background
  containerEl.style.display = 'flex';
  containerEl.style.flexDirection = 'column';
  containerEl.style.alignItems = 'center';
  containerEl.style.padding = '20px';
  containerEl.style.gap = '20px';

  const loadingMsg = document.createElement('div');
  loadingMsg.style.color = 'white';
  loadingMsg.style.fontFamily = 'sans-serif';
  loadingMsg.textContent = 'Loading PDF...';
  containerEl.appendChild(loadingMsg);

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    containerEl.innerHTML = ''; // Clear loading message

    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // We want to scale the PDF to fit the container width, or at least a reasonable size
      const containerWidth = containerEl.clientWidth - 40; // padding
      const viewport = page.getViewport({ scale: 1.0 });
      let scale = 1.5; // default scale
      
      if (containerWidth > 0 && viewport.width > 0) {
        // scale to fit width if it's too wide, up to max scale
        scale = Math.min(2.0, containerWidth / viewport.width);
      }
      
      const scaledViewport = page.getViewport({ scale });

      const canvasWrapper = document.createElement('div');
      canvasWrapper.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      canvasWrapper.style.backgroundColor = 'white';
      canvasWrapper.style.position = 'relative';

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      canvas.style.display = 'block';

      canvasWrapper.appendChild(canvas);
      containerEl.appendChild(canvasWrapper);

      const renderContext = {
        canvasContext: ctx,
        viewport: scaledViewport
      };
      
      // Render page, don't await immediately in loop so they can render in parallel (or just sequentially)
      await page.render(renderContext).promise;
    }
  } catch (err) {
    console.error('PDF rendering error:', err);
    containerEl.innerHTML = `<div style="color:red; font-family:sans-serif;">Error rendering PDF: ${err.message}</div>`;
  }
}
