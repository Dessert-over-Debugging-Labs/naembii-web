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

  for (const query of ['콘치즈']) {
    await evaluate(`
      new Promise(resolve => {
        const input = document.getElementById('recipeSearchInput');
        if (input) input.value = '${query}';
        syncRecipeSearchInput(input, 'searchClearBtn');
        setTimeout(resolve, 180);
      });
    `);
    await capture(`typing-${query}`, 220);
  }

  await evaluate(`
    new Promise(resolve => {
      executeRecipeSearch('콘치즈');
      setTimeout(() => {
        ${installDemoLayer}
        window.__moveDemoFinger(82, 310, false);
        resolve(true);
      }, 360);
    });
  `);
  await capture('search-results', 320);

  await evaluate(`window.__moveDemoFinger(82, 310, true);`);
  await delay(380);

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
      window.SpeechRecognition = function DemoSpeechRecognition() {};
      toggleHf3();
      setVpPanelExpanded(true);
      window.__moveDemoFinger(315, 505, false);
      setTimeout(resolve, 420);
    });
  `);
  await capture('voice-ready-mic-off', 700);

  await evaluate(`
    new Promise(resolve => {
      setVpVoiceState('listening', '마이크 ON · 듣는 중', 'ok');
      setVpTranscript('듣고 있어요', { interim: true, hint: '말을 마치면 자동으로 인식 결과를 확정해요.' });
      document.getElementById('vpUser').textContent = '';
      document.getElementById('vpAi').textContent = '질문을 마칠 때까지 기다릴게요.';
      window.__moveDemoFinger(315, 505, true);
      setTimeout(() => window.__hideDemoFinger(), 220);
      setTimeout(resolve, 360);
    });
  `);
  await capture('voice-mic-on-listening', 680);

  await evaluate(`
    new Promise(resolve => {
      setVpTranscript('모짜렐라 없으면', { interim: true, hint: '인식 중이에요.' });
      document.getElementById('vpUser').textContent = '';
      setTimeout(resolve, 260);
    });
  `);
  await capture('voice-interim-transcript', 620);

  await evaluate(`
    new Promise(resolve => {
      setVpTranscript('모짜렐라 없으면 어떻게 해?', { hint: '인식 완료 · 이 내용으로 답변할게요.' });
      setVpVoiceState('recognized', '인식 완료', 'ok');
      document.getElementById('vpAi').textContent = '';
      setTimeout(resolve, 260);
    });
  `);
  await capture('voice-final-transcript', 520);

  await evaluate(`
    new Promise(resolve => {
      setVpVoiceState('responding', '응답 생성 중', '');
      setVpVolumeStatus(true);
      document.getElementById('vpAi').textContent = '답변을 준비하고 있어요…';
      setTimeout(resolve, 320);
    });
  `);
  await capture('voice-response-generating', 680);

  await evaluate(`
    new Promise(resolve => {
      setVpVoiceState('complete', '응답 완료', 'ok');
      setVpVolumeStatus(false);
      document.getElementById('vpAi').textContent = '체다치즈로 바꿔도 괜찮아요. 짠맛이 강하니 설탕은 조금 줄여주세요.';
      document.getElementById('vpScroll').scrollTop = 0;
      window.__hideDemoFinger();
      setTimeout(resolve, 320);
    });
  `);
  await capture('voice-response-complete', 1250);

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
  await capture('complete-share', 560);

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
    img = Image.open(path).convert('RGB')
    img = img.resize((390, 844), Image.Resampling.LANCZOS)
    imgs.append(img)
    durations.append(duration)
palette_source = Image.new('RGB', (390, 844 * len(imgs)))
for index, img in enumerate(imgs):
    palette_source.paste(img, (0, 844 * index))
palette = palette_source.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
indexed = [img.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for img in imgs]
indexed[0].save(out, save_all=True, append_images=indexed[1:], duration=durations, loop=0, optimize=False, disposal=1)
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
