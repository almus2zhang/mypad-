// Service Worker script for Web Share Target handling
const DB_NAME = 'mypad_shared_db';
const STORE_NAME = 'shares';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeSharedPayload(formData) {
  const db = await openDB();
  const files = formData.getAll('files');
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';

  const entries = [];

  if (files && files.length > 0) {
    for (const file of files) {
      if (file && typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        entries.push({
          name: file.name || 'shared_file.txt',
          type: file.type || 'text/plain',
          buffer: arrayBuffer,
          timestamp: Date.now(),
        });
      }
    }
  }

  // If no files were provided, but text or URL was shared (e.g. text snippet from another app)
  if (entries.length === 0 && (text || url || title)) {
    const content = [title, text, url].filter(Boolean).join('\n\n');
    const encoder = new TextEncoder();
    const safeTitle = (title ? String(title).slice(0, 30).replace(/[^\w\s-]/g, '').trim() : 'Shared-Text') || 'Shared-Text';
    entries.push({
      name: safeTitle + '.txt',
      type: 'text/plain',
      buffer: encoder.encode(content).buffer,
      timestamp: Date.now(),
    });
  }

  if (entries.length > 0) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const entry of entries) {
        store.add(entry);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method === 'POST' &&
    (url.pathname.endsWith('/share-target') || url.searchParams.has('share-target'))
  ) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        await storeSharedPayload(formData);
      } catch (err) {
        console.error('Error in Web Share Target handler:', err);
      }

      // Notify any currently open window clients
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({ type: 'MYPAD_SHARED_FILE' });
        }
      } catch (e) {}

      const redirectUrl = new URL('./?received_share=1', self.location.href).href;
      return Response.redirect(redirectUrl, 303);
    })());
  }
});
