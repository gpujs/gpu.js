// Serves the repo so test/all.html can be opened in a browser. Replaces gulp's
// `bsync`, which ran browser-sync with a tunnel; the tunnel is redundant now
// that real devices are covered by test/browserstack.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webm': 'video/webm',
};

const port = Number(process.env.PORT) || 8080;

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      // cross-origin isolation: without these two headers browsers hide
      // SharedArrayBuffer and the webasm backend's threaded path can never
      // run in the browser suite. Everything served here is same-origin.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}).listen(port, () => {
  console.log(`serving ${ROOT}`);
  console.log(`  tests: http://localhost:${port}/test/all.html`);
});
