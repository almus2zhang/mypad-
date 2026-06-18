import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const clientIdsArgIdx = args.indexOf('--client-ids');
let allowedClientIds = [];
if (clientIdsArgIdx !== -1 && args[clientIdsArgIdx + 1]) {
  allowedClientIds = args[clientIdsArgIdx + 1].split(',').map(id => id.trim()).filter(Boolean);
}

const adminPortArgIdx = args.indexOf('--admin-port');
const adminPort = adminPortArgIdx !== -1 && args[adminPortArgIdx + 1] ? parseInt(args[adminPortArgIdx + 1], 10) : 3001;

class ClientManager {
  constructor(initialAllowedIds = []) {
    this.clientsFile = path.join(__dirname, 'clients.json');
    this.data = { approved: [], pending: [] };
    this.load();
    
    // Merge initial CLI allowed IDs
    if (initialAllowedIds.length > 0) {
      initialAllowedIds.forEach(id => {
        if (!this.data.approved.includes(id)) {
          this.data.approved.push(id);
        }
      });
      this.save();
    }
  }

  load() {
    try {
      if (fsSync.existsSync(this.clientsFile)) {
        this.data = JSON.parse(fsSync.readFileSync(this.clientsFile, 'utf8'));
        if (!this.data.notes) this.data.notes = {};
      }
    } catch (e) {
      console.error('Failed to load clients.json', e.message);
    }
  }

  save() {
    try {
      fsSync.writeFileSync(this.clientsFile, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('Failed to save clients.json', e.message);
    }
  }

  isApproved(clientId) {
    return this.data.approved.includes(clientId);
  }

  addPending(clientId, ip) {
    if (!clientId) return;
    if (this.isApproved(clientId)) return;
    const existing = this.data.pending.find(p => p.id === clientId);
    if (!existing) {
      this.data.pending.push({ id: clientId, ip, timestamp: Date.now() });
      this.save();
    } else {
      existing.timestamp = Date.now();
      existing.ip = ip;
      this.save();
    }
  }

  approve(clientId) {
    if (!this.isApproved(clientId)) {
      this.data.approved.push(clientId);
    }
    this.data.pending = this.data.pending.filter(p => p.id !== clientId);
    this.save();
  }

  revoke(clientId) {
    this.data.approved = this.data.approved.filter(id => id !== clientId);
    if (this.data.notes && this.data.notes[clientId]) {
      delete this.data.notes[clientId];
    }
    this.save();
  }

  clearPending() {
    this.data.pending = [];
    this.save();
  }

  setNote(clientId, note) {
    if (!this.data.notes) this.data.notes = {};
    this.data.notes[clientId] = note;
    this.save();
  }
}

const clientManager = new ClientManager(allowedClientIds);

class OperationLogger {
  constructor(maxLogs = 10000) {
    this.logFile = path.join(__dirname, 'operation_logs.json');
    this.maxLogs = maxLogs;
    this.logs = [];
    this.load();
  }

  load() {
    try {
      if (fsSync.existsSync(this.logFile)) {
        this.logs = JSON.parse(fsSync.readFileSync(this.logFile, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load operation_logs.json', e.message);
    }
  }

  save() {
    try {
      fsSync.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
    } catch (e) {
      console.error('Failed to save operation_logs.json', e.message);
    }
  }

  log(clientId, action, filePath) {
    const entry = {
      timestamp: Date.now(),
      clientId: clientId || 'Unknown',
      action,
      filePath
    };
    this.logs.unshift(entry); // Add to beginning (newest first)
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // Throttle saving? Since operations might be frequent, a sync save might block.
    // For simplicity, we just save synchronously. For high load, async would be better.
    fsSync.writeFile(this.logFile, JSON.stringify(this.logs, null, 2), (err) => {
      if (err) console.error('Failed to async save operation_logs.json', err.message);
    });
  }

  getLogs() {
    return this.logs;
  }
}

const opLogger = new OperationLogger(10000);

// File Metadata storage
const METADATA_FILE = path.join(__dirname, 'file_metadata.json');
let fileMetadata = {};
try {
  if (fsSync.existsSync(METADATA_FILE)) {
    fileMetadata = JSON.parse(fsSync.readFileSync(METADATA_FILE, 'utf8'));
  }
} catch (e) {
  console.error('Failed to load file metadata', e);
}

function saveFileMetadata() {
  try {
    fsSync.writeFile(METADATA_FILE, JSON.stringify(fileMetadata, null, 2), (err) => {
      if (err) console.error('Failed to async save file_metadata.json', err.message);
    });
  } catch (e) {
    console.error('Failed to save file metadata', e);
  }
}

console.log(`Starting MyPad++ Server`);
console.log(`Workspaces: ${workspaces.map(w => w.name + ' (' + w.path + ')').join(', ')}`);
if (serverPassword) {
  console.log(`Remote Access: Enabled (Password Protected)`);
  if (allowedClientIds.length > 0) {
    console.log(`Allowed Client IDs: ${allowedClientIds.join(', ')}`);
  }
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
      const terms = params.q.trim().split(/\s+/).filter(Boolean);
      const regexStr = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
      const regex = new RegExp(regexStr, 'i');
      return files.filter(f => regex.test(f.path));
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

class HistoryManager {
  constructor() {
    this.historyDir = path.join(__dirname, '.mypad_history');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.historyDir, { recursive: true });
    } catch (e) {}
  }

  getHash(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex');
  }

  async getFileHistoryDir(filePath) {
    const hash = this.getHash(filePath);
    const dir = path.join(this.historyDir, hash);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async getIndex(dir) {
    const indexPath = path.join(dir, 'index.json');
    try {
      const data = await fs.readFile(indexPath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  async saveIndex(dir, index) {
    const indexPath = path.join(dir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  async saveRevision(filePath, buffer) {
    const dir = await this.getFileHistoryDir(filePath);
    const index = await this.getIndex(dir);
    const timestamp = Date.now();
    const revFilename = `${timestamp}.bak`;
    const revPath = path.join(dir, revFilename);

    await fs.writeFile(revPath, buffer);
    
    index.push({
      timestamp,
      size: buffer.length,
      filename: revFilename
    });

    const prunedIndex = this.pruneRevisions(index);
    
    const keptFilenames = new Set(prunedIndex.map(r => r.filename));
    for (const r of index) {
      if (!keptFilenames.has(r.filename)) {
        try {
          await fs.rm(path.join(dir, r.filename), { force: true });
        } catch (e) {}
      }
    }

    await this.saveIndex(dir, prunedIndex);
  }

  pruneRevisions(index) {
    index.sort((a, b) => b.timestamp - a.timestamp);
    
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    
    const today = [];
    const twoWeeks = [];
    const twoMonths = [];
    const older = [];

    const getLocalDay = (ts) => new Date(ts).toLocaleDateString();
    const getLocalWeek = (ts) => {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay());
      return d.toLocaleDateString();
    };
    const getLocalMonth = (ts) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${d.getMonth() + 1}`;
    };

    index.forEach(r => {
      const age = now - r.timestamp;
      if (age < DAY) {
        today.push(r);
      } else if (age < 14 * DAY) {
        twoWeeks.push(r);
      } else if (age < 60 * DAY) {
        twoMonths.push(r);
      } else {
        older.push(r);
      }
    });

    const finalRevs = [];
    finalRevs.push(...today.slice(0, 50));

    const keepNewestPerGroup = (list, groupFn) => {
      const groups = {};
      list.forEach(r => {
        const g = groupFn(r.timestamp);
        if (!groups[g]) {
          groups[g] = r;
        }
      });
      return Object.values(groups);
    };

    finalRevs.push(...keepNewestPerGroup(twoWeeks, getLocalDay));
    finalRevs.push(...keepNewestPerGroup(twoMonths, getLocalWeek));
    finalRevs.push(...keepNewestPerGroup(older, getLocalMonth));

    finalRevs.sort((a, b) => a.timestamp - b.timestamp);
    return finalRevs;
  }

  async getList(filePath) {
    const dir = await this.getFileHistoryDir(filePath);
    return await this.getIndex(dir);
  }

  async getRevision(filePath, timestamp) {
    const dir = await this.getFileHistoryDir(filePath);
    const index = await this.getIndex(dir);
    const rev = index.find(r => r.timestamp === parseInt(timestamp, 10));
    if (!rev) throw new Error('Revision not found');
    const revPath = path.join(dir, rev.filename);
    return await fs.readFile(revPath);
  }
}

const historyManager = new HistoryManager();

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

  // Client ID Check
  if (clientManager.data.approved.length > 0) {
    const clientId = req.headers['x-client-id'];
    if (!clientId || !clientManager.isApproved(clientId)) {
      clientManager.addPending(clientId, req.ip);
      return res.status(403).json({ error: 'Access Denied: Client ID not authorized' });
    }
  } else if (req.headers['x-client-id']) {
    // Track pending even if no approved list exists to let them approve the first device easily
    clientManager.addPending(req.headers['x-client-id'], req.ip);
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
    opLogger.log(req.headers['x-client-id'] || req.ip, 'OPEN', targetPath);
    res.send(content);
  } catch (error) {
    console.error('Read error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/stat', async (req, res) => {
  try {
    const { paths } = req.body;
    if (!Array.isArray(paths)) {
      return res.status(400).json({ error: 'paths must be an array' });
    }
    
    const results = {};
    for (const p of paths) {
      try {
        const targetPath = resolveAndCheckPath(p);
        const st = await fs.stat(targetPath);
        results[p] = {
          lastModified: st.mtime.toISOString(),
          size: st.size
        };
      } catch (e) {
        results[p] = null; // file not found or inaccessible
      }
    }
    res.json({ results });
  } catch (error) {
    console.error('Stat error:', error.message);
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
      
      // Save history revision
      await historyManager.saveRevision(targetPath, buffer).catch(e => console.error('History save error:', e));
      
      // Update index
      indexer.addFile('/' + reqPath.replace(/\\/g, '/').replace(/^\/+/, ''));
      opLogger.log(req.headers['x-client-id'] || req.ip, 'SAVE', targetPath);
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Missing base64Content in body' });
    }
  } catch (error) {
    console.error('Write error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/history/list', async (req, res) => {
  try {
    const targetPath = resolveAndCheckPath(req.query.path);
    const list = await historyManager.getList(targetPath);
    res.json(list);
  } catch (error) {
    console.error('History list error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/history/read', async (req, res) => {
  try {
    const targetPath = resolveAndCheckPath(req.query.path);
    const { timestamp } = req.query;
    if (!timestamp) return res.status(400).json({ error: 'Missing timestamp' });
    const content = await historyManager.getRevision(targetPath, timestamp);
    res.send(content);
  } catch (error) {
    console.error('History read error:', error.message);
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
    opLogger.log(req.headers['x-client-id'] || req.ip, 'DELETE', targetPath);
    
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

// ==========================================
// Admin Portal Server
// ==========================================
const adminApp = express();
adminApp.use(cors());
adminApp.use(express.json());

adminApp.use((req, res, next) => {
  if (!serverPassword) {
    return res.status(403).send('Admin portal is disabled because no server password is set.');
  }
  // Allow OPTIONS
  if (req.method === 'OPTIONS') return next();
  
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password === serverPassword) {
    return next();
  }
  
  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required. Username can be anything, Password is the --password value.');
});

adminApp.get('/api/clients', (req, res) => {
  res.json(clientManager.data);
});

adminApp.post('/api/clients/approve', (req, res) => {
  const { id } = req.body;
  if (id) clientManager.approve(id);
  res.json({ success: true });
});

adminApp.post('/api/clients/revoke', (req, res) => {
  const { id } = req.body;
  if (id) clientManager.revoke(id);
  res.json({ success: true });
});

adminApp.post('/api/clients/note', (req, res) => {
  const { id, note } = req.body;
  if (id) clientManager.setNote(id, note);
  res.json({ success: true });
});

adminApp.delete('/api/clients/pending', (req, res) => {
  clientManager.clearPending();
  res.json({ success: true });
});

adminApp.get('/api/logs', (req, res) => {
  // Send max 1000 logs to the frontend at a time for performance, unless specified
  const limit = parseInt(req.query.limit) || 1000;
  res.json(opLogger.getLogs().slice(0, limit));
});

adminApp.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MyPad++ Admin Portal</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; color: #18181b; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { font-size: 24px; margin-bottom: 20px; }
        .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h2 { font-size: 18px; margin-top: 0; display: flex; justify-content: space-between; align-items: center; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e4e4e7; }
        li:last-child { border-bottom: none; padding-bottom: 0; }
        .client-info { display: flex; flex-direction: column; }
        .client-id { font-weight: 600; font-family: monospace; }
        .client-meta { font-size: 12px; color: #71717a; margin-top: 4px; }
        button { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: 0.2s; }
        button.approve { background: #10b981; color: white; }
        button.approve:hover { background: #059669; }
        button.revoke { background: #ef4444; color: white; }
        button.revoke:hover { background: #dc2626; }
        button.clear { background: #f4f4f5; color: #71717a; }
        button.clear:hover { background: #e4e4e7; }
        .empty { color: #a1a1aa; font-style: italic; font-size: 14px; padding: 10px 0; }
        
        /* Logs table styles */
        .logs-table-container { max-height: 400px; overflow-y: auto; margin-top: 10px; border: 1px solid #e4e4e7; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        th, td { padding: 8px 12px; border-bottom: 1px solid #e4e4e7; }
        th { background: #f4f4f5; position: sticky; top: 0; z-index: 10; font-weight: 600; color: #3f3f46; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: #fafafa; }
        .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .tag.open { background: #dbeafe; color: #1e3a8a; }
        .tag.save { background: #dcfce7; color: #14532d; }
        .tag.delete { background: #fee2e2; color: #7f1d1d; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>MyPad++ Admin Portal</h1>
        
        <div class="card">
          <h2>Pending Requests <button class="clear" onclick="clearPending()">Clear All</button></h2>
          <ul id="pending-list">Loading...</ul>
        </div>

        <div class="card">
          <h2>Approved Clients</h2>
          <ul id="approved-list">Loading...</ul>
        </div>

        <div class="card">
          <h2>File Operation Logs</h2>
          <div class="logs-table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Client ID</th>
                  <th>File Path</th>
                </tr>
              </thead>
              <tbody id="logs-list">
                <tr><td colspan="4" class="empty" style="text-align: center;">Loading logs...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <script>
        async function fetchClients() {
          const res = await fetch('/api/clients');
          const data = await res.json();
          render(data);
        }

        async function fetchLogs() {
          const res = await fetch('/api/logs?limit=500');
          const data = await res.json();
          renderLogs(data);
        }

        function render(data) {
          const pendingList = document.getElementById('pending-list');
          if (data.pending.length === 0) {
            pendingList.innerHTML = '<div class="empty">No pending requests</div>';
          } else {
            pendingList.innerHTML = data.pending.map(p => \`
              <li>
                <div class="client-info">
                  <span class="client-id">\${p.id}</span>
                  <span class="client-meta">IP: \${p.ip} | Last seen: \${new Date(p.timestamp).toLocaleString()}</span>
                </div>
                <button class="approve" onclick="approve('\${p.id}')">Approve</button>
              </li>
            \`).join('');
          }

          const approvedList = document.getElementById('approved-list');
          if (data.approved.length === 0) {
            approvedList.innerHTML = '<div class="empty">No approved clients</div>';
          } else {
            approvedList.innerHTML = data.approved.map(id => {
              const note = (data.notes && data.notes[id]) ? data.notes[id] : '';
              const displayNote = note ? \` <span style="color:#8b5cf6; font-size:13px;">(\${note})</span>\` : '';
              return \`
                <li>
                  <div class="client-info">
                    <span class="client-id">\${id}\${displayNote}</span>
                  </div>
                  <div>
                    <button class="approve" style="background:#8b5cf6;" onclick="editNote('\${id}', '\${note}')">Note</button>
                    <button class="revoke" onclick="revoke('\${id}')">Revoke</button>
                  </div>
                </li>
              \`;
            }).join('');
          }
        }

        async function approve(id) {
          await fetch('/api/clients/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
          fetchClients();
        }

        async function revoke(id) {
          if (!confirm('Are you sure you want to revoke this client?')) return;
          await fetch('/api/clients/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
          fetchClients();
        }

        async function editNote(id, currentNote) {
          const note = prompt('Enter a remark/note for this client:', currentNote);
          if (note === null) return; // Cancelled
          await fetch('/api/clients/note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, note })
          });
          fetchClients();
        }

        async function clearPending() {
          await fetch('/api/clients/pending', { method: 'DELETE' });
          fetchClients();
        }

        function renderLogs(logs) {
          const logsList = document.getElementById('logs-list');
          if (logs.length === 0) {
            logsList.innerHTML = '<tr><td colspan="4" class="empty" style="text-align: center;">No operations recorded</td></tr>';
          } else {
            logsList.innerHTML = logs.map(log => \`
              <tr>
                <td style="white-space: nowrap; color: #71717a;">\${new Date(log.timestamp).toLocaleString()}</td>
                <td><span class="tag \${log.action.toLowerCase()}">\${log.action}</span></td>
                <td class="client-id" style="font-size: 12px;">\${log.clientId}</td>
                <td style="word-break: break-all;">\${log.filePath}</td>
              </tr>
            \`).join('');
          }
        }

        setInterval(() => {
          fetchClients();
          fetchLogs();
        }, 3000);
        
        fetchClients();
        fetchLogs();
      </script>
    </body>
    </html>
  `);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Workspace API: http://0.0.0.0:${port}`);
});

adminApp.listen(adminPort, '0.0.0.0', () => {
  if (serverPassword) {
    console.log(`Admin Portal:  http://0.0.0.0:${adminPort}/`);
  } else {
    console.log(`Admin Portal:  Disabled (Requires --password)`);
  }
});
