import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', process.argv[2] || '.');
const port = Number(process.env.PORT || 4173);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
]);

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, safePath === '/' ? 'index.html' : safePath);
  if (!existsSync(filePath)) filePath = join(root, 'index.html');
  response.setHeader('Content-Type', types.get(extname(filePath)) || 'application/octet-stream');
  createReadStream(filePath).pipe(response);
}).listen(port, '0.0.0.0', () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
