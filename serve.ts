// A tiny static server for playing the game locally:
//   node serve.ts
// then open http://localhost:8080 in desktop Chrome. It serves only the
// game/ folder and answers 404 for everything else.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  const relative = path === '/' ? 'index.html' : path.replace(/^\/+/, '');
  if (relative.includes('..')) {
    response.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = await readFile(join(root, relative));
    response.writeHead(200, { 'content-type': types[extname(relative)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
}).listen(8080, () => {
  console.log('Kestrel Post is ready at http://localhost:8080');
});
