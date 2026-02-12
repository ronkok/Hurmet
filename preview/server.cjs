// server.cjs
const http = require('http');
const fs = require('fs');              // for watchFile
const fsp = require('fs').promises;    // for readFile
const path = require('path');
const { URL } = require('url');
const WebSocket = require('ws');

// -----------------------------
// CLI arguments
// -----------------------------
const filename = process.argv[2];
const port = Number(process.argv[3]) || 8000;

if (!filename) {
  console.error("Usage: node server.cjs <filename> <port>");
  process.exit(1);
}

const ext = path.extname(filename).toLowerCase();
const fullPath = path.resolve(filename);
const root = path.dirname(fullPath);

// -----------------------------
// MIME types
// -----------------------------
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain'
};

// -----------------------------
// Static file server
// -----------------------------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    let fileToServe;

    if (ext === '.html') {
      // HTML mode: serve directory
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      fileToServe = path.join(root, pathname);
    } else if (ext === '.md') {
      // Markdown mode: always serve the single file
      fileToServe = fullPath;
    } else {
      throw new Error("Unsupported file type");
    }

    const data = await fsp.readFile(fileToServe);
    const type = mime[path.extname(fileToServe)] || 'text/plain';

    res.writeHead(200, { 'Content-Type': type });
    res.end(data);

  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

// -----------------------------
// WebSocket server
// -----------------------------
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('Hurmet connected for auto-reload');
});

// -----------------------------
// File watcher (Windows-safe)
// -----------------------------
function sendUpdate(updatedContent) {
  const message = JSON.stringify({
    type: 'update',
    content: updatedContent
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

if (ext === '.md') {
  // Markdown mode: watch only the single file
  fs.watchFile(fullPath, { interval: 300 }, async () => {
    console.log(`Changed: ${fullPath}`);
    const updated = await fsp.readFile(fullPath, 'utf8');
    sendUpdate(updated);
  });

} else if (ext === '.html') {
  // HTML mode: watch entire directory
  function watchRecursive(dir) {
    fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
      if (err) return;

      for (const entry of entries) {
        const p = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          watchRecursive(p);
        } else {
          fs.watchFile(p, { interval: 300 }, async () => {
            console.log(`Changed: ${p}`);
            const updated = await fsp.readFile(p, 'utf8');
            sendUpdate(updated);
          });
        }
      }
    });
  }

  watchRecursive(root);
}

// -----------------------------
server.listen(port, () => {
  console.log(`Serving ${filename} on http://localhost:${port}`);
});
