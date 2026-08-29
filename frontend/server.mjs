/**
 * Production static server for the built SPA.
 *
 * Vite's own `preview` is documented as a local preview only, and adding a
 * static-server dependency for fifty lines of stdlib is not worth it.
 *
 * Usage: node server.mjs   (PORT defaults to 3000)
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz') {
    res.statusCode = 200;
    return res.end('ok');
  }

  // Reject traversal before it reaches the filesystem.
  const safe = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(DIST, safe);
  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  try {
    const info = await stat(filePath);
    if (info.isFile()) {
      res.setHeader('Content-Type', MIME[extname(filePath).toLowerCase()] || 'application/octet-stream');
      // Hashed build assets are immutable; everything else must revalidate.
      // Decided on the URL path, not the normalised filesystem path, which is
      // backslash-separated on Windows.
      res.setHeader(
        'Cache-Control',
        url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
      );
      return res.end(await readFile(filePath));
    }
  } catch {
    // fall through to the SPA entry point
  }

  // Client-side routing: unknown paths render the app.
  res.setHeader('Content-Type', MIME['.html']);
  res.setHeader('Cache-Control', 'no-cache');
  res.end(await readFile(join(DIST, 'index.html')));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Gas Provider frontend listening on :${PORT}`);
});
