// Emulador do roteamento da Vercel para testes offline (NÃO é a plataforma real).
//   /api/<nome>  -> api/<nome>.js (default export), ignorando arquivos que começam com "_"
//   demais rotas -> arquivos de public/ ("/" = public/index.html). Nada fora de public/ é servido.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function adaptRes(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
  return res;
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const notFound = () => { res.statusCode = 404; res.end('404: NOT_FOUND'); };
    try {
      const m = url.pathname.match(/^\/api\/([^/]+)$/);
      if (m) {
        if (m[1].startsWith('_') || !/^[\w-]+$/.test(m[1])) return notFound();
        const file = path.join(ROOT, 'api', `${m[1]}.js`);
        try { await fs.access(file); } catch { return notFound(); }
        const mod = await import(pathToFileURL(file).href);
        return mod.default(req, adaptRes(res));
      }
      const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      const file = path.resolve(ROOT, 'public', rel);
      if (!file.startsWith(path.join(ROOT, 'public') + path.sep)) return notFound();
      const data = await fs.readFile(file).catch(() => null);
      if (!data) return notFound();
      res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    } catch (e) { res.statusCode = 500; res.end('500: ' + e.message); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`http://localhost:${port}`));
}
