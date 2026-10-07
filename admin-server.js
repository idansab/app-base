import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4000;
const API_PORT = 3001;
const adminPath = path.join(__dirname, '..', 'mah-sheyesh-pah', 'admin.html');
const publicPath = path.join(__dirname, '..', 'mah-sheyesh-pah', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy API calls to port 3001
  if (req.url.startsWith('/api/')) {
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${API_PORT}`,
      },
    };

    const apiReq = http.request(options, (apiRes) => {
      res.writeHead(apiRes.statusCode, apiRes.headers);
      apiRes.pipe(res);
    });

    req.pipe(apiReq);
    apiReq.on('error', (e) => {
      console.error('API proxy error:', e);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API server unreachable' }));
    });
    return;
  }

  // Serve static files (CSS, JS, etc.)
  let filePath = adminPath;
  if (req.url !== '/' && req.url !== '/admin.html') {
    filePath = path.join(publicPath, req.url);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // For API requests, return JSON error
      if (req.url.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
      return;
    }

    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Admin server running on http://localhost:${PORT}/`);
  console.log(`✅ API proxy: /api/* → http://localhost:${API_PORT}/api/*`);
});
