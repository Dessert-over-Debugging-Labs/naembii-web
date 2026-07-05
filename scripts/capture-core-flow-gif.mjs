import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = (process.argv[2] || 'http://127.0.0.1:4190').replace(/\/+$/, '');
const out = resolve(process.argv[3] || 'assets/screens/naembi-core-flow.gif');
const port = Number(process.argv[4] || 9249);
const framesDir = resolve(`/tmp/naembi-core-flow-frames-${Date.now()}`);
const heroRecipeId = 'vlPqkuHIdCc';

await mkdir(framesDir, { recursive: true });

const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/naembi-flow-cdp-${Date.now()}`,
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

async function evaluate(expression) {
  return send('Runtime.evaluate', { awaitPromise: true, expression });
}

async function capture(name, duration = 360) {
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const file = join(framesDir, `${String(frames.length).padStart(2, '0')}-${name}.png`);
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  frames.push({ file, duration });
}

const frames = [];

const installDemoLayer = `
  (() => {
    const root = document.querySelector('.screen') || document.body;
    if (!root || document.getElementById('demoFinger')) return;
    const style = document.createElement('style');
    style.id = 'demoFingerStyle';
    style.textContent = \`
      #demoFinger{
        position:absolute;left:0;top:0;z-index:920;width:34px;height:34px;border-radius:50%;
        background:rgba(239,90,60,.88);border:3px solid #fff;
        box-shadow:0 10px 26px rgba(31,38,46,.34),0 0 0 8px rgba(239,90,60,.18);
        transform:translate(24px,92px) scale(1);transition:transform .34s cubic-bezier(.32,.72,0,1),opacity .2s;
        pointer-events:none;opacity:1;
      }
      #demoFinger::after{content:"";position:absolute;inset:9px;border-radius:50%;background:#fff;}
      #demoFinger.tap{animation:demoTap .42s ease;}
      @keyframes demoTap{0%{box-shadow:0 10px 26px rgba(31,38,46,.34),0 0 0 8px rgba(239,90,60,.18);}70%{box-shadow:0 10px 26px rgba(31,38,46,.28),0 0 0 18px rgba(239,90,60,0);}100%{box-shadow:0 10px 26px rgba(31,38,46,.34),0 0 0 8px rgba(239,90,60,.18);}}
    \`;
    document.head.appendChild(style);
    const finger = document.createElement('div');
    finger.id = 'demoFinger';
    root.appendChild(finger);
    window.__moveDemoFinger = (x, y, tap = false) => {
      finger.style.opacity = '1';
      finger.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(1)';
      finger.classList.toggle('tap', false);
      if (tap) {
        void finger.offsetWidth;
        finger.classList.add('tap');
      }
    };
    window.__hideDemoFinger = () => { finger.style.opacity = '0'; };
  })();
`;

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

  await send('Page.navigate', { url: `${baseURL}/app` });
  await delay(2600);
  await evaluate(`
    new Promise(resolve => {
      currentRecipe = recipeById('${heroRecipeId}');
      show('home');
      document.querySelector('#home .body').scrollTop = 0;
      ${installDemoLayer}
      window.__moveDemoFinger(314, 74, false);
      requestAnimationFrame(() => setTimeout(resolve, 350));
    });
  `);
  await capture('home', 560);

  await evaluate(`window.__moveDemoFinger(42, 74, true);`);
  await delay(420);
  await capture('tap-search', 220);

  await evaluate(`
    new Promise(resolve => {
      openSearch('');
      setTimeout(() => {
        ${installDemoLayer}
        window.__moveDemoFinger(54, 72, false);
        resolve(true);
      }, 300);
    });
  `);
  await capture('search-empty', 260);

  for (const query of ['콘', '콘치', '콘치즈']) {
    await evaluate(`
      new Promise(resolve => {
        const input = document.getElementById('recipeSearchInput');
        if (input) input.value = '${query}';
        runRecipeSearch('${query}');
        setTimeout(resolve, 180);
      });
    `);
    await capture(`typing-${query}`, 220);
  }

  await evaluate(`window.__moveDemoFinger(82, 292, true);`);
  await delay(380);
  await capture('tap-result', 220);

  await evaluate(`
    new Promise(resolve => {
      goDetail('${heroRecipeId}');
      setTimeout(() => {
        ${installDemoLayer}
        window.__moveDemoFinger(318, 780, false);
        resolve(true);
      }, 500);
    });
  `);
  await capture('detail', 520);

  await evaluate(`window.__moveDemoFinger(318, 780, true);`);
  await delay(380);
  await capture('tap-start', 220);

  await evaluate(`
    new Promise(resolve => {
      startCook();
      setTimeout(() => {
        hideCookHint();
        ${installDemoLayer}
        window.__moveDemoFinger(178, 760, false);
        resolve(true);
      }, 800);
    });
  `);
  await capture('cook', 520);

  await evaluate(`window.__moveDemoFinger(178, 760, true);`);
  await delay(380);
  await capture('tap-voice', 220);

  await evaluate(`
    new Promise(resolve => {
      toggleHf3();
      setTimeout(resolve, 2300);
    });
  `);
  await capture('voice-answer', 720);

  await evaluate(`
    new Promise(resolve => {
      hf3Reset();
      finishCook();
      setTimeout(() => {
        ${installDemoLayer}
        window.__moveDemoFinger(58, 670, false);
        resolve(true);
      }, 800);
    });
  `);
  await capture('complete-share', 680);

  const py = `
import sys
from PIL import Image
out = sys.argv[1]
pairs = sys.argv[2:]
imgs = []
durations = []
for i in range(0, len(pairs), 2):
    path = pairs[i]
    duration = int(pairs[i + 1])
    img = Image.open(path).convert('RGBA')
    img = img.resize((390, 844), Image.Resampling.LANCZOS)
    imgs.append(img.convert('P', palette=Image.ADAPTIVE, colors=128))
    durations.append(duration)
imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=durations, loop=0, optimize=True)
`;
  const args = [py, out, ...frames.flatMap(frame => [frame.file, String(frame.duration)])];
  const gif = spawnSync('python3', ['-c', ...args], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 4 });
  if (gif.status !== 0) {
    throw new Error(gif.stderr || 'GIF encode failed');
  }

  console.log(JSON.stringify({ out, frames: frames.length, frameFiles: frames.map(frame => frame.file) }, null, 2));
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
  await rm(framesDir, { recursive: true, force: true });
}
