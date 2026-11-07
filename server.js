import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getState, openDb, saveLevel, setLang } from './lib/db.js';
import { LEVELS } from './public/js/levels.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const port = Number(process.env.TOPARROW_APP_PORT) || 39271;
const dataDir = process.env.TOPARROW_DATA_DIR || path.join(root, 'data');
const db = openDb(dataDir);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), 'application/json; charset=utf-8');
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new Error('too big');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  return JSON.parse(text);
}

function publicFile(urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^[/\\]+/, '');
  const full = path.resolve(publicDir, rel);
  const pub = path.resolve(publicDir);
  if (full !== pub && !full.startsWith(`${pub}${path.sep}`)) return null;
  return full;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (req.method === 'GET' && url.pathname === '/__health') {
      send(res, 200, 'ok');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/progress') {
      sendJson(res, 200, getState(db));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/lang') {
      const body = await readJson(req);
      const result = setLang(db, body.lang);
      sendJson(res, result.error ? 400 : 200, result.error ? result : { ok: true });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/progress') {
      const body = await readJson(req);
      const result = saveLevel(db, body, LEVELS.length);
      if (result.error) {
        sendJson(res, 400, result);
        return;
      }
      sendJson(res, 200, getState(db));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'method');
      return;
    }
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const full = publicFile(pathname);
    if (!full) {
      send(res, 403, 'forbidden');
      return;
    }
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      send(res, 404, 'not found');
      return;
    }
    const data = fs.readFileSync(full);
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Content-Length': data.length,
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: 'server' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`xiaoxiaole http://127.0.0.1:${port}/`);
});
