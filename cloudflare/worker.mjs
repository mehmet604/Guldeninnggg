import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError, shortText, teacherInstructions, validate } from '../server/request.mjs';
import { askOpenAI } from '../server/openai.mjs';

const responseHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
const digest = value => createHash('sha256').update(value).digest();
const equal = (a, b) => timingSafeEqual(digest(a), digest(b));
const json = (value, status = 200, extra = {}) => Response.json(value, {
  status, headers: { ...responseHeaders, 'Cache-Control': 'no-store', ...extra }
});
const sessionSeconds = 12 * 3600;
const sign = (password, expiry) => createHmac('sha256', password)
  .update('gulden-session:' + expiry).digest('base64url');
const sessionCookie = (value, age) =>
  `gulden_session=${value}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${age}`;

async function readJson(request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    throw new HttpError(415, 'JSON isteği gerekli.');
  }
  const limit = 2250000;
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'İstek çok büyük.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Geçersiz istek.');
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, 'İstek çok büyük.');
    }
    body += decoder.decode(value, { stream: true });
  }
  try {
    const payload = JSON.parse(body + decoder.decode());
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error();
    return payload;
  } catch {
    throw new HttpError(400, 'Geçersiz istek.');
  }
}

async function reserve(db, period, kind, limit) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS usage (
    period TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL,
    PRIMARY KEY (period, kind)
  )`).run();
  return db.prepare(`
    INSERT INTO usage VALUES (?, ?, 1)
    ON CONFLICT(period, kind) DO UPDATE SET count = count + 1 WHERE count < ?
    RETURNING count
  `).bind(period, kind, limit).first();
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (['GET', 'HEAD'].includes(request.method) && !url.pathname.startsWith('/api/')) {
        if (url.pathname === '/') url.pathname = '/index.html';
        const result = await env.ASSETS.fetch(new Request(url, request));
        const headers = new Headers(result.headers);
        for (const [key, value] of Object.entries(responseHeaders)) headers.set(key, value);
        return new Response(result.body, { status: result.status, headers });
      }
      const { pathname } = url;
      if (request.method !== 'POST' || !['/api/login', '/api/logout', '/api/ai'].includes(pathname)) {
        throw new HttpError(404, 'Sayfa bulunamadı.');
      }
      if (request.headers.get('origin') !== url.origin) throw new HttpError(403, 'İstek kaynağı geçersiz.');
      const { APP_PASSWORD: password, OPENAI_API_KEY: key } = env;
      if (!shortText(password, 200) || password.length < 24 || !key) {
        throw new HttpError(503, 'Yapay zekâ henüz kurulmadı.');
      }
      if (pathname === '/api/logout') return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });

      const now = Math.floor(Date.now() / 1000);
      if (pathname === '/api/login') {
        const { password: attempted } = await readJson(request);
        if (!await reserve(env.QUOTA, String(Math.floor(now / 300)), 'login', 20)) {
          throw new HttpError(429, 'Çok fazla deneme. Birkaç dakika bekle.');
        }
        if (!shortText(attempted, 200) || !equal(password, attempted)) {
          throw new HttpError(401, 'Atölye parolası yanlış.');
        }
        const expiry = String(now + sessionSeconds);
        return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(expiry + '.' + sign(password, expiry), sessionSeconds) });
      }

      const match = request.headers.get('cookie')?.match(/(?:^|;\s*)gulden_session=(\d{10,12})\.([A-Za-z0-9_-]{43})(?:;|$)/);
      if (!match || Number(match[1]) <= now || !equal(match[2], sign(password, match[1]))) {
        throw new HttpError(401, 'Atölye parolasını gir.');
      }
      const payload = validate(await readJson(request));
      const month = new Date().toISOString().slice(0, 7);
      if (!await reserve(env.QUOTA, month, payload.mode, payload.mode === 'chat' ? 300 : 40)) {
        throw new HttpError(429, 'Bu işlem için aylık atölye kotası doldu.');
      }
      try {
        return json(await askOpenAI(key, payload, teacherInstructions(payload)));
      } catch {
        throw new HttpError(502, 'Yapay zekâ yanıt veremedi. Birazdan tekrar dene.');
      }
    } catch (error) {
      if (!(error instanceof HttpError)) console.error(error.name, error.code);
      return json({ error: error instanceof HttpError ? error.message : 'Sunucu hatası.' }, error.status || 500);
    }
  }
};
