import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { teachers } from '../teachers.js';
import { askOpenAI } from './openai.mjs';

const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/teachers.js': ['teachers.js', 'text/javascript; charset=utf-8'],
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/vase.webp': ['vase.webp', 'image/webp'],
  '/icon-180.png': ['icon-180.png', 'image/png'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png']
};
const digest = value => createHash('sha256').update(value).digest();
const equal = (a, b) => timingSafeEqual(digest(a), digest(b));
const shortText = (value, max) => typeof value === 'string' &&
  value.trim().length > 0 && value.length <= max;
const photoPattern = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;
const cookie = 'gulden_session';
const sessionSeconds = 12 * 3600;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function jsonBody(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') {
    throw new HttpError(415, 'JSON isteği gerekli.');
  }
  const limit = 2250000;
  if (Number(req.headers['content-length']) > limit) {
    throw new HttpError(413, 'Fotoğraflar çok büyük.');
  }
  const chunks = [];
  let size = 0;
  const stream = req.iterator({ destroyOnReturn: false });
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > limit) {
      req.resume();
      throw new HttpError(413, 'Fotoğraflar çok büyük.');
    }
    chunks.push(chunk);
  }
  try {
    const payload = JSON.parse(Buffer.concat(chunks).toString());
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error();
    return payload;
  } catch {
    throw new HttpError(400, 'Geçersiz istek.');
  }
}

function allowedJpeg(bytes) {
  if (bytes.length > 800000 || bytes[0] !== 255 || bytes[1] !== 216 ||
      bytes.at(-2) !== 255 || bytes.at(-1) !== 217) return false;
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset++] === 255) {
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || offset + 2 > bytes.length) return false;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return false;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) return false;
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      return height > 0 && height <= 1024 && width > 0 && width <= 1024;
    }
    offset += length;
  }
  return false;
}

function validate({ mode, teacher, tone, message, history, photos }) {
  if (!['chat', 'image'].includes(mode) || !Number.isInteger(teacher) ||
      teacher < 0 || teacher >= teachers.length || !shortText(message, 1800) ||
      !tone || !['mizah', 'elestiri', 'samimiyet'].every(key =>
        Number.isInteger(tone[key]) && tone[key] >= 0 && tone[key] <= 100) ||
      !Array.isArray(history) || history.length > 6 || history.some(item =>
        !item || !['user', 'assistant'].includes(item.role) || !shortText(item.content, 1800)) ||
      !Array.isArray(photos) || photos.length > 2 || photos.some(photo => {
        if (typeof photo !== 'string' || photo.length > 1100000) return true;
        const match = photo.match(photoPattern);
        if (!match) return true;
        return !allowedJpeg(Buffer.from(match[1], 'base64'));
      })) {
    throw new HttpError(400, 'Mesajı veya fotoğrafları kontrol et.');
  }
  return { mode, teacher, tone, message, photos,
    history: history.map(({ role, content }) => ({ role, content })) };
}

export async function createApp(env, upstream = askOpenAI) {
  const { OPENAI_API_KEY: key, APP_PASSWORD: password } = env;
  const origin = new URL(env.APP_ORIGIN || env.RENDER_EXTERNAL_URL || 'http://localhost:8080');
  const local = origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname);
  if ((!local && origin.protocol !== 'https:') || origin.href !== origin.origin + '/') {
    throw new Error('APP_ORIGIN must be the HTTPS origin without a path');
  }
  if (!key || !password || password.length < 24 || password.length > 200) {
    throw new Error('Set OPENAI_API_KEY and APP_PASSWORD (at least 24 characters)');
  }

  const directory = env.DATA_DIR || 'data';
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(directory, 'quota.sqlite'));
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS usage (
      period TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL,
      PRIMARY KEY (period, kind)
    );
  `);
  const reserve = db.prepare(`
    INSERT INTO usage VALUES (?, ?, 1)
    ON CONFLICT(period, kind) DO UPDATE SET count = count + 1 WHERE count < ?
    RETURNING count
  `);
  const sign = expiry => createHmac('sha256', password)
    .update('gulden-session:' + expiry).digest('base64url');
  const cookieHeader = (value, age) =>
    `${cookie}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${local ? '' : '; Secure'}`;
  function authenticated(req) {
    const value = req.headers.cookie?.split(';').map(part => part.trim())
      .find(part => part.startsWith(cookie + '='))?.slice(cookie.length + 1);
    const match = value?.match(/^(\d{10,12})\.([A-Za-z0-9_-]{43})$/);
    return match && Number(match[1]) > Date.now() / 1000 && equal(match[2], sign(match[1]));
  }

  let loginWindow = 0;
  let failures = 0;
  let active = 0;
  const server = createServer({ requestTimeout: 25000 }, async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (!local) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    try {
      const path = new URL(req.url, origin).pathname;
      if (req.method === 'GET' || req.method === 'HEAD') {
        if (path === '/healthz') {
          res.writeHead(200, { 'Cache-Control': 'no-store' });
          return res.end(req.method === 'GET' ? 'ok' : undefined);
        }
        if (!Object.hasOwn(assets, path)) throw new HttpError(404, 'Sayfa bulunamadı.');
        const [file, type] = assets[path];
        const bytes = await readFile(new URL('../' + file, import.meta.url));
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': bytes.length, 'Cache-Control': 'no-cache' });
        return res.end(req.method === 'GET' ? bytes : undefined);
      }
      if (req.method !== 'POST' || !['/api/login', '/api/logout', '/api/ai'].includes(path)) {
        throw new HttpError(404, 'Sayfa bulunamadı.');
      }
      if (req.headers.origin !== origin.origin) throw new HttpError(403, 'İstek kaynağı geçersiz.');
      if (path === '/api/login') {
        const { password: attempted } = await jsonBody(req);
        const now = Math.floor(Date.now() / 1000);
        if (now >= loginWindow) {
          loginWindow = now + 300;
          failures = 0;
        }
        if (failures >= 10) throw new HttpError(429, 'Çok fazla deneme. Birkaç dakika bekle.');
        if (!shortText(attempted, 200) || !equal(password, attempted)) {
          failures++;
          throw new HttpError(401, 'Atölye parolası yanlış.');
        }
        const expiry = String(now + sessionSeconds);
        res.setHeader('Set-Cookie', cookieHeader(expiry + '.' + sign(expiry), sessionSeconds));
        return send(200, { ok: true });
      }
      if (path === '/api/logout') {
        res.setHeader('Set-Cookie', cookieHeader('', 0));
        return send(200, { ok: true });
      }
      if (!authenticated(req)) throw new HttpError(401, 'Atölye parolasını gir.');
      const payload = validate(await jsonBody(req));
      if (active >= 2) throw new HttpError(429, 'Atölye meşgul. Birazdan tekrar dene.');
      const period = new Date().toISOString().slice(0, 7);
      const limit = payload.mode === 'chat' ? 300 : 40;
      if (!reserve.get(period, payload.mode, limit)) {
        throw new HttpError(429, 'Bu işlem için aylık atölye kotası doldu.');
      }
      const [name, style] = teachers[payload.teacher];
      const { mizah, elestiri, samimiyet } = payload.tone;
      const instructions = `Sen kişisel seramik hocasısın. Türkçe konuş. ${name}: ${style}
Mizah %${mizah}, eleştiri %${elestiri}, samimiyet %${samimiyet}. Eleştiriyi çözümle birlikte ver.
Fotoğraftan doğrulanamayan malzeme ve üretim koşullarını kesinmiş gibi sunma.
Üretici bilgisi olmadan kesin fırın programı önerme. Bir seferde en fazla bir soru sor.
Görsel fikir önerebilirsin. Görsel üretimi için kullanıcı ayrı düğmeyi kullanır.`;
      active++;
      try {
        send(200, await upstream(key, payload, instructions));
      } catch {
        throw new HttpError(502, 'Yapay zekâ yanıt veremedi. Birazdan tekrar dene.');
      } finally {
        active--;
      }
    } catch (error) {
      if (!error.status) console.error(error.name, error.code);
      send(error.status || 500, { error: error.status ? error.message : 'Sunucu hatası.' });
    }
  });
  server.on('close', () => db.close());
  return server;
}
