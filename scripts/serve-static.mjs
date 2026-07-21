import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const envFile = join(root, '.env');
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}
const host = process.env.HOST || '127.0.0.1';
// 4190 is blocked by the Fetch "bad port" list, so browser calls from the app
// to its same-origin /api routes fail during local development.
const port = Number(process.env.PORT || 4876);
const require = createRequire(import.meta.url);

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function fileFor(url = '/') {
  const parsed = new URL(url, `http://${host}:${port}`);
  let pathname = parsed.pathname === '/' ? '/app.html' : parsed.pathname;
  if (pathname === '/app') {
    pathname = '/app.html';
  }
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidate = resolve(join(root, safePath));

  if (!candidate.startsWith(root)) {
    return null;
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  if (!extname(candidate)) {
    const htmlCandidate = `${candidate}.html`;
    if (htmlCandidate.startsWith(root) && existsSync(htmlCandidate) && statSync(htmlCandidate).isFile()) {
      return htmlCandidate;
    }
  }

  return null;
}

createServer((request, response) => {
  const pathname = new URL(request.url || '/', `http://${host}:${port}`).pathname;

  if (pathname.startsWith('/api/')) {
    const name = pathname.replace(/^\/api\//, '').replace(/\.js$/, '');
    const file = resolve(join(root, 'api', `${name}.js`));

    if (existsSync(file) && statSync(file).isFile()) {
      delete require.cache[require.resolve(file)];
      Promise.resolve(require(file)(request, response)).catch((error) => {
        response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: error.message || 'API error' }));
      });
      return;
    }
  }

  const file = fileFor(request.url);

  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': mime[extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`Serving cook wireframe at http://${host}:${port}/`);
});
