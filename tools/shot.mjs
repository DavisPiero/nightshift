// Headless screenshots of the game, for checking looks without opening a
// window. Starts a local server and headless Chrome, loads the game with
// ?shot&mute plus your query, waits, optionally runs some JavaScript in the
// page, and saves PNGs.
//   node tools/shot.mjs "screen=garage&car=countach-qv" out.png [--wait 4] [--size 1280x720] [--js "code"]
// A job's `page` loads that file from the project instead of the game. A job's
// `saveData` writes the data: URL its JavaScript returned to that file.
// Several shots in one go: pass a JSON list as the only argument:
//   node tools/shot.mjs '[{"q":"screen=main","out":"a.png"},{"q":"device=computer","out":"b.png","wait":6}]'

import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

let jobs;
const args = process.argv.slice(2);
if (args[0]?.startsWith('[')) jobs = JSON.parse(args[0]);
else {
  const job = { q: args[0] || '', out: args[1] || 'shot.png' };
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--wait') job.wait = Number(args[++i]);
    else if (args[i] === '--size') job.size = args[++i];
    else if (args[i] === '--js') job.js = args[++i];
  }
  jobs = [job];
}

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(ROOT, path === '/' ? 'index.html' : path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const port = server.address().port;

const profile = mkdtempSync(join(tmpdir(), 'nightshift-shot-')); // a fresh, throwaway browser profile
const chrome = spawn(CHROME, ['--headless=new', '--mute-audio', '--remote-debugging-port=0', '--hide-scrollbars',
  '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/ws:\/\/[^\s]+/); if (m) resolve(m[0]); });
  setTimeout(() => reject(new Error('chrome did not start')), 15000);
});
const browserWs = new WebSocket(wsUrl);
await new Promise((r) => browserWs.addEventListener('open', r));
let id = 0;
const pending = new Map();
const listeners = [];
browserWs.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else listeners.forEach((l) => l(msg));
});
const send = (method, params = {}, sessionId) => new Promise((resolve) => {
  const m = { id: ++id, method, params };
  if (sessionId) m.sessionId = sessionId;
  pending.set(m.id, resolve);
  browserWs.send(JSON.stringify(m));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
const logs = [];
listeners.push((m) => {
  if (m.method === 'Runtime.consoleAPICalled' && m.sessionId === sessionId) logs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown' && m.sessionId === sessionId) logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
});
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);

for (const job of jobs) {
  const [w, h] = (job.size || '1280x720').split('x').map(Number);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: job.page ? `http://127.0.0.1:${port}/${job.page}` : `http://127.0.0.1:${port}/index.html?shot&mute&${job.q || ''}` }, sessionId);
  await sleep((job.wait ?? 4) * 1000);
  if (job.js) {
    const r = await send('Runtime.evaluate', { expression: job.js, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.result?.exceptionDetails) logs.push('JS: ' + r.result.exceptionDetails.exception?.description);
    else if (job.saveData) writeFileSync(job.saveData, Buffer.from(String(r.result?.result?.value).split(',')[1], 'base64')); // the JavaScript returned a data: URL
    else if (r.result?.result?.value !== undefined) logs.push('JS -> ' + JSON.stringify(r.result.result.value));
    await sleep((job.after ?? 1.5) * 1000);
  }
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(job.out, Buffer.from(shot.result.data, 'base64'));
  console.log('saved', job.out);
}
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
chrome.kill();
server.close();
await new Promise((r) => setTimeout(r, 300));
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
