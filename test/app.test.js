import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from '../server/app.mjs';
import { askOpenAI } from '../server/openai.mjs';
import { teachers } from '../teachers.js';

const origin = 'http://localhost:8080';
const password = 'local-test-password-123456789';
const photo = 'data:image/jpeg;base64,/9j/wAALCAABAAEBAREA/9k=';
const payload = {
  mode: 'chat', teacher: 0, message: 'Vazomu incele.', photos: [photo],
  history: [{ role: 'user', content: 'Bu bir vazo.' }, { role: 'assistant', content: 'Anladım.' }],
  tone: { mizah: 80, elestiri: 80, samimiyet: 90 }
};

test('HTTP authentication, five teachers, photo validation, and persistent quota', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gulden-test-'));
  let server;
  let root;
  let calls = 0;
  let captured;
  async function start() {
    server = await createApp({ APP_ORIGIN: origin, APP_PASSWORD: password,
      OPENAI_API_KEY: 'placeholder', DATA_DIR: directory }, async (key, request, instructions) => {
      calls++;
      captured = { key, request, instructions };
      return request.mode === 'chat' ? { text: 'Atölyeye hoş geldin.' } : { image: photo };
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    root = 'http://127.0.0.1:' + server.address().port;
  }
  async function stop() {
    if (!server?.listening) return;
    server.close();
    await once(server, 'close');
  }
  t.after(async () => {
    await stop();
    await rm(directory, { recursive: true, force: true });
  });
  await start();

  let cookie = '';
  const post = (path, body, requestOrigin = origin) => fetch(root + path, {
    method: 'POST', headers: { origin: requestOrigin, cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  assert.match(await (await fetch(root)).text(), /V1\.4/);
  assert.equal((await fetch(root + '/healthz')).status, 200);
  assert.equal((await fetch(root + '/server/app.mjs')).status, 404);
  assert.equal((await fetch(root + '/.env')).status, 404);
  assert.equal((await post('/api/ai', payload)).status, 401);
  assert.equal((await post('/api/login', { password }, 'https://example.com')).status, 403);
  assert.equal((await post('/api/login', { password: 'wrong' })).status, 401);
  const login = await post('/api/login', { password });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('/api/ai', { ...payload, photos: ['https://example.com/photo.jpg'] })).status, 400);
  assert.equal((await post('/api/ai', { ...payload, message: 'a'.repeat(2250000) })).status, 413);
  assert.equal(calls, 0);
  assert.equal(teachers.length, 5);
  for (const [teacher, [name]] of teachers.entries()) {
    const response = await post('/api/ai', { ...payload, teacher });
    assert.deepEqual(await response.json(), { text: 'Atölyeye hoş geldin.' });
    assert.ok(captured.instructions.includes(name));
    assert.deepEqual(captured.request.photos, [photo]);
    assert.deepEqual(captured.request.history, payload.history);
    assert.equal(captured.key, 'placeholder');
  }

  const image = { ...payload, mode: 'image' };
  for (let i = 0; i < 40; i++) {
    const response = await post('/api/ai', image);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { image: photo });
  }
  assert.equal((await post('/api/ai', image)).status, 429);
  await stop();
  await start();
  assert.equal((await post('/api/ai', image)).status, 429);
  assert.equal(calls, 45);
  const logout = await post('/api/logout', {});
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});

test('OpenAI Responses, generation, and reference edit request formats', async t => {
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, ...options };
    return Response.json(url.endsWith('/responses')
      ? { output: [{ content: [{ text: 'Merhaba' }] }] }
      : { data: [{ b64_json: photo.split(',')[1] }] });
  });
  assert.deepEqual(await askOpenAI('fake', payload, 'Hoca'), { text: 'Merhaba' });
  const chat = JSON.parse(request.body);
  assert.equal(chat.store, false);
  assert.equal(chat.instructions, 'Hoca');
  assert.equal(chat.input.at(-1).content[1].image_url, photo);
  assert.equal(request.headers.Authorization, 'Bearer fake');
  assert.deepEqual(await askOpenAI('fake', { ...payload, mode: 'image', photos: [] }), { image: photo });
  assert.match(request.url, /\/images\/generations$/);
  assert.equal(JSON.parse(request.body).quality, 'low');
  await askOpenAI('fake', { ...payload, mode: 'image', photos: [photo, photo] });
  assert.match(request.url, /\/images\/edits$/);
  assert.equal(request.body.getAll('image[]').length, 2);
});
