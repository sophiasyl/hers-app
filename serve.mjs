// Minimal static file server for the exported Hers web build (dist/).
// No build tooling, no file watching — just serves files, so it stays up.
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8082;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

async function tryFile(p) {
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
  } catch {
    /* not a file */
  }
  return null;
}

async function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const abs = normalize(join(ROOT, p));
  if (!abs.startsWith(ROOT)) return null; // path-traversal guard
  return (
    (await tryFile(abs)) ||
    (!extname(abs) ? await tryFile(abs + '.html') : null) ||
    (await tryFile(join(ROOT, 'index.html'))) // SPA fallback
  );
}

createServer(async (req, res) => {
  const file = await resolve(req.url || '/');
  if (!file) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(500);
    res.end('Server error');
  }
}).listen(PORT, () => console.log(`Hers is serving at http://localhost:${PORT}`));
