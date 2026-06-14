import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Parse args for --workspace and --password
const args = process.argv.slice(2);
const workspaces = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--workspace' && args[i + 1]) {
    const wsPath = path.resolve(args[i + 1]);
    workspaces.push({
      name: path.basename(wsPath) || 'workspace',
      path: wsPath
    });
    i++; // skip the path argument
  }
}
if (workspaces.length === 0) {
  workspaces.push({
    name: 'cwd',
    path: process.cwd()
  });
}

const passArgIdx = args.indexOf('--password');
let serverPassword = null;
if (passArgIdx !== -1 && args[passArgIdx + 1]) {
  serverPassword = args[passArgIdx + 1];
}

console.log(`Starting MyPad++ Server`);
console.log(`Workspaces: ${workspaces.map(w => w.name + ' (' + w.path + ')').join(', ')}`);
if (serverPassword) {
  console.log(`Remote Access: Enabled (Password Protected)`);
} else {
  console.log(`Remote Access: Disabled (No password configured)`);
}

app.use(cors());

// ==========================================
// WebDAV Proxy (Bypass CORS)
// ==========================================
app.use('/api/proxy', async (req, res) => {
  const targetUrl = req.headers['x-proxy-target'];
  if (!targetUrl) {
    return res.status(400).send('Missing X-Proxy-Target header');
  }

  const options = {
    method: req.method,
    headers: { ...req.headers },
    // Only attach body for methods that allow it
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
    duplex: 'half' // required in node fetch for stream body
  };

  // Remove internal/proxy-specific headers
  delete options.headers['host'];
  delete options.headers['x-proxy-target'];
  delete options.headers['origin'];
  delete options.headers['referer'];
  delete options.headers['connection'];

  try {
    const response = await fetch(targetUrl, options);
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      // Pipe web stream to express response
      for await (const chunk of response.body) {
        res.write(chunk);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err) {
    console.error(`[Proxy Error] ${req.method} ${targetUrl}:`, err.message);
    res.status(502).send('Proxy Error: ' + err.message);
  }
});

app.use(express.json({ limit: '50mb' }));

// Security check function
function resolveAndCheckPath(reqPath) {
  if (!reqPath || reqPath === '/') {
    return null;
  }
  
  const normalizedReq = reqPath.replace(/\\/g, '/');
  const parts = normalizedReq.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  
  const wsName = parts[0];
  const ws = workspaces.find(w => w.name === wsName);
  if (!ws) {
    throw new Error(`Workspace not found: ${wsName}`);
  }
  
  const subPath = parts.slice(1).join('/');
  const targetPath = path.normalize(path.join(ws.path, subPath));
  
  const wsPathNormalized = path.normalize(ws.path);
  if (targetPath !== wsPathNormalized && !targetPath.startsWith(wsPathNormalized + path.sep)) {
    throw new Error('Access Denied: Path traversal detected');
  }
  return targetPath;
}

// ==========================================
// In-Memory Workspace Indexer
// ==========================================
class WorkspaceIndexer {
  constructor() {
    this.files = [];
    this.isIndexing = false;
    this.lastIndexed = 0;
    this.ignoreDirs = new Set(['node_modules', 'dist', '.git', '.repo', '.svn', '.idea']);
  }

  async buildIndex() {
    if (this.isIndexing) return;
    this.isIndexing = true;
    
    const newFiles = [];
    try {
      const walk = async (dir, wsName, wsPath) => {
        try {
          if (newFiles.length >= 1000000) return; // Hard limit to prevent OOM
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          // Check for ignore files
          if (entries.some(e => !e.isDirectory() && e.name === '.mypadignore')) {
            return;
          }

          for (const entry of entries) {
            if (newFiles.length >= 1000000) break;
            if (entry.isDirectory()) {
              if (this.ignoreDirs.has(entry.name)) continue;
              await walk(path.join(dir, entry.name), wsName, wsPath);
            } else {
              const fullPath = path.join(dir, entry.name);
              const relPath = path.relative(wsPath, fullPath).replace(/\\/g, '/');
              newFiles.push({
                name: entry.name,
                path: '/' + wsName + '/' + relPath,
                absolutePath: fullPath,
                isDirectory: false,
                size: 0,
                lastModified: ''
              });
            }
          }
        } catch (e) {
          console.error(`[Indexer] Error reading ${dir}: ${e.message}`);
        }
      };

      for (const ws of workspaces) {
        await walk(ws.path, ws.name, ws.path);
      }
      
      // Sort for binary search or just clean presentation
      newFiles.sort((a, b) => a.path.localeCompare(b.path));
      
      this.files = newFiles;
      this.lastIndexed = Date.now();
      console.log(`[Indexer] Finished. Indexed ${this.files.length} files.`);
    } catch (e) {
      console.error('[Indexer] Failed to build index:', e.message);
    } finally {
      this.isIndexing = false;
    }
  }

  search(params) {
    let files = this.files;
    if (params.workspaces && params.workspaces.length > 0) {
      const allowed = params.workspaces.map(w => '/' + w + '/');
      files = files.filter(f => allowed.some(prefix => f.path.startsWith(prefix)));
    }

    if (params.ext) {
      return files.filter(f => f.name.endsWith(params.ext));
    } else if (params.q) {
      const terms = params.q.toLowerCase().split(/\s+/).filter(Boolean);
      return files.filter(f => {
        const pathLower = f.path.toLowerCase();
        return terms.every(term => pathLower.includes(term));
      });
    }
    return [];
  }

  addFile(relPath) {
    // Expected relPath: "/src/main.c"
    const name = relPath.split('/').pop();
    // Check if already exists to avoid duplicates
    if (!this.files.find(f => f.path === relPath)) {
      this.files.push({
        name,
        path: relPath,
        isDirectory: false,
        size: 0,
        lastModified: ''
      });
    }
  }

  removeFile(relPath) {
    this.files = this.files.filter(f => !f.path.startsWith(relPath));
  }
}

const indexer = new WorkspaceIndexer();
// Start initial indexing in the background
indexer.buildIndex();
// Re-index every 5 minutes (300,000 ms) to catch external git pulls/changes
setInterval(() => indexer.buildIndex(), 300 * 1000);

// API Endpoints
const apiRouter = express.Router();

// Auth Middleware
apiRouter.use((req, res, next) => {
  const isLocal = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';
  
  if (isLocal) {
    // Always allow local connections
    return next();
  }

  if (!serverPassword) {
    // If no password is set, deny all remote requests
    return res.status(403).json({ error: 'Remote access requires a password to be configured on the server (--password)' });
  }

  const clientPassword = req.headers['x-workspace-password'];
  if (clientPassword !== serverPassword) {
    return res.status(401).json({ error: 'Password required or incorrect' });
  }

  next();
});

apiRouter.get('/list', async (req, res) => {
  try {
    const reqPath = req.query.path || '';
    const normalizedReq = reqPath.replace(/\\/g, '/');
    const parts = normalizedReq.split('/').filter(Boolean);
    const wsName = parts.length > 0 ? parts[0] : null;

    const targetPath = resolveAndCheckPath(req.query.path);
    if (!targetPath) {
      const items = workspaces.map(ws => ({
        name: ws.name,
        path: '/' + ws.name,
        isDirectory: true,
        size: 0,
        lastModified: 0
      }));
      return res.json(items);
    }

    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    const ws = workspaces.find(w => w.name === wsName);

    const items = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(targetPath, entry.name);
      let size = 0;
      let mtime = 0;
      try {
        const estats = await fs.stat(fullPath);
        size = estats.size;
        mtime = estats.mtimeMs;
      } catch (e) {
        // ignore unreadable
      }
      const relPath = path.relative(ws.path, fullPath).replace(/\\/g, '/');
      return {
        name: entry.name,
        path: '/' + ws.name + '/' + relPath,
        absolutePath: fullPath,
        isDirectory: entry.isDirectory(),
        size,
        lastModified: new Date(mtime).toISOString(),
      };
    }));

    // Sort: directories first, then alphabetically
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json(items);
  } catch (error) {
    console.error('List error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/search', async (req, res) => {
  try {
    const ext = req.query.ext || '';
    const q = req.query.q || '';
    const workspacesParam = req.query.workspaces;
    const workspacesList = workspacesParam ? workspacesParam.split(',') : [];

    if (!ext && !q) return res.status(400).json({ error: 'Missing ext or q parameter' });

    if (indexer.isIndexing && indexer.files.length === 0) {
      return res.status(503).json({ error: 'Index is still building, please try again in a few seconds.' });
    }

    let results = indexer.search({ ext, q, workspaces: workspacesList });
    // Limit to 1000 items to prevent massive payloads
    if (results.length > 1000) results = results.slice(0, 1000);
    
    res.json(results);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/reindex', async (req, res) => {
  try {
    // Fire and forget, or await. Given we want it fast, we can await it.
    await indexer.buildIndex();
    res.json({ success: true, count: indexer.files.length });
  } catch (error) {
    console.error('Reindex error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/read', async (req, res) => {
  try {
    const targetPath = resolveAndCheckPath(req.query.path);
    const content = await fs.readFile(targetPath);
    res.send(content);
  } catch (error) {
    console.error('Read error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/write', async (req, res) => {
  try {
    const reqPath = req.query.path || '';
    const targetPath = resolveAndCheckPath(reqPath);
    const { base64Content } = req.body;
    if (typeof base64Content === 'string') {
      const buffer = Buffer.from(base64Content, 'base64');
      await fs.writeFile(targetPath, buffer);
      
      // Update index
      indexer.addFile('/' + reqPath.replace(/\\/g, '/').replace(/^\/+/, ''));
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Missing base64Content in body' });
    }
  } catch (error) {
    console.error('Write error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/mkdir', async (req, res) => {
  try {
    const targetPath = resolveAndCheckPath(req.query.path);
    await fs.mkdir(targetPath, { recursive: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Mkdir error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/delete', async (req, res) => {
  try {
    const reqPath = req.query.path || '';
    const targetPath = resolveAndCheckPath(reqPath);
    await fs.rm(targetPath, { recursive: true, force: true });
    
    // Update index (removes file or entire directory prefix)
    indexer.removeFile('/' + reqPath.replace(/\\/g, '/').replace(/^\/+/, ''));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/workspace', apiRouter);

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
