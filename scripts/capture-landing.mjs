import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = process.argv[2] || 'http://127.0.0.1:4190/';
const out = process.argv[3] || '/tmp/cook-wireframe-v3/cdp-mobile.png';
const mode = process.argv[4] || 'mobile';
const port = Number(process.argv[5] || 9237);
const metrics = mode === 'desktop'
  ? { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false }
  : { width: 390, height: 1200, deviceScaleFactor: 2, mobile: true };

await mkdir(dirname(out), { recursive: true });

const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/cook-wireframe-cdp-${mode}-${Date.now()}`,
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

const wsURL = await waitForPage();
const ws = new WebSocket(wsURL);
const pending = new Map();
let id = 0;

function send(method, params = {}) {
  const callId = ++id;
  ws.send(JSON.stringify({ id: callId, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(callId, { resolve, reject });
  });
}

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

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', metrics);
  if (mode === 'mobile') {
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
  }
  await send('Page.navigate', { url: baseURL });
  await delay(2600);
  await send('Runtime.evaluate', {
    expression: `
      window.scrollTo(0,0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    `
  });
  await delay(300);
  const info = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `({
      width: window.innerWidth,
      scrollY: window.scrollY,
      mobileMedia: matchMedia('(max-width:900px)').matches,
      marketing: document.body.classList.contains('marketing-open'),
      mobileHero: getComputedStyle(document.querySelector('.mobile-landing-hero')).display,
      mobileHeroTop: Math.round(document.querySelector('.mobile-landing-hero').getBoundingClientRect().top),
      demoTop: Math.round(document.querySelector('.landing-preview').getBoundingClientRect().top),
      headline: document.querySelector('.mobile-landing-hero h1, .landing-copy h1')?.innerText || '',
      hasCookingPromise: document.body.innerText.includes('요리 영상') && document.body.innerText.includes('손 안 대고'),
      hasBetaCTA: document.body.innerText.includes('출시 알림 받기') || document.body.innerText.includes('베타테스트 신청'),
      hasMascotCopy: document.body.innerText.includes('작은 냄비가') || document.body.innerText.includes('손맛에 집중'),
      hasRecipeRequest: document.body.innerText.includes('원하는 레시피 요청'),
      hasLaunchInput: document.body.innerText.includes('출시 알림'),
      hasAppPreview: !!document.getElementById('landingDemoFrame'),
      forbiddenVisibleTerms: ['Notion','notion','v2','v3','Ralph','랄프','API','Vercel','GitHub','webhook','환경변수','프로토타입','AWS','페이지 안에']
        .filter(term => document.body.innerText.includes(term))
    })`
  });
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(out, Buffer.from(shot.data, 'base64'));
  console.log(JSON.stringify({ out, mode, ...info.result.value }, null, 2));
} finally {
  ws.close();
  child.kill('SIGTERM');
}
