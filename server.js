import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Parse args for --workspace
const args = process.argv.slice(2);
const workspaceArgIdx = args.indexOf('--workspace');
let workspacePath = process.cwd();
if (workspaceArgIdx !== -1 && args[workspaceArgIdx + 1]) {
  workspacePath = path.resolve(args[workspaceArgIdx + 1]);
}

console.log(`Starting MyPad++ Server`);
console.log(`Workspace Path: ${workspacePath}`);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Security check function
function resolveAndCheckPath(reqPath) {
  // Normalize Windows separators for URL pathing if needed
  if (!reqPath) reqPath = '';
  const targetPath = path.normalize(path.join(workspacePath, reqPath));
  if (!targetPath.startsWith(workspacePath)) {
    throw new Error('Access Denied: Path traversal detected');
  }
  return targetPath;
}

// API Endpoints
const apiRouter = express.Router();

apiRouter.get('/list', async (req, res) => {
  try {
    const targetPath = resolveAndCheckPath(req.query.path);
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
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
      // Return relative path to workspace using forward slashes
      const relPath = path.relative(workspacePath, fullPath).replace(/\\/g, '/');
      return {
        name: entry.name,
        path: '/' + relPath,
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

apiRouter.get('/read', async (req, res) => {
  try {
    const targetPath = resolveAndCheckPath(req.query.path);
    const content = await fs.readFile(targetPath);
    // Send as binary buffer
    res.send(content);
  } catch (error) {
    console.error('Read error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/write', async (req, res) => {
  try {
    const targetPath = resolveAndCheckPath(req.query.path);
    const { base64Content } = req.body;
    if (typeof base64Content === 'string') {
      const buffer = Buffer.from(base64Content, 'base64');
      await fs.writeFile(targetPath, buffer);
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
    const targetPath = resolveAndCheckPath(req.query.path);
    await fs.rm(targetPath, { recursive: true, force: true });
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
