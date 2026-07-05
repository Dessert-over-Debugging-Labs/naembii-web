import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = (process.argv[2] || 'http://127.0.0.1:4190').replace(/\/+$/, '');
const outDir = resolve(process.argv[3] || 'assets/screens');
const port = Number(process.argv[4] || 9241);
const heroRecipeId = process.argv[5] || 'vlPqkuHIdCc';

const screens = [
  { name: 'app-home.png', route: '/app' },
  { name: 'app-search.png', route: '/app#search=콘치즈' },
  { name: 'app-detail.png', route: `/app#detail=${heroRecipeId}` },
  {
    name: 'app-cook.png',
    route: '/app#cook3',
    after: `currentRecipe=recipeById('${heroRecipeId}'); cook3Car.reset(); show('cook3'); hideCookHint(); closeVoice();`
  },
  {
    name: 'app-complete.png',
    route: '/app#complete',
    after: `currentRecipe=recipeById('${heroRecipeId}'); show('complete');`
  }
];

await mkdir(outDir, { recursive: true });

const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/naembi-screens-cdp-${Date.now()}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function json(path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!res.ok) throw new Error(`CDP HTTP ${res.status}`);
  return res.json();
}

async function waitForPage() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const pages = await json('/json/list');
      const page = pages.find(item => item.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await delay(150);
  }
  throw new Error('Chrome CDP page target not found');
}

let ws;
const pending = new Map();
let id = 0;

function send(method, params = {}) {
  const callId = ++id;
  ws.send(JSON.stringify({ id: callId, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(callId, { resolve, reject });
  });
}

try {
  const wsURL = await waitForPage();
  ws = new WebSocket(wsURL);

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const task = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) task.reject(new Error(msg.error.message));
    else task.resolve(msg.result);
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  const result = [];
  for (const screen of screens) {
    await send('Page.navigate', { url: `${baseURL}${screen.route}` });
    await delay(2600);
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        new Promise(resolve => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          if (typeof lucide !== 'undefined') lucide.createIcons();
          ${screen.after || ''}
          requestAnimationFrame(() => setTimeout(resolve, 350));
        });
      `
    });
    const info = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        path: location.pathname,
        hash: location.hash,
        marketing: document.body.classList.contains('marketing-open'),
        activeView: document.querySelector('.view.active')?.id || '',
        title: document.title
      })`
    });
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const out = join(outDir, screen.name);
    await writeFile(out, Buffer.from(shot.data, 'base64'));
    result.push({ file: out, ...info.result.value });
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
