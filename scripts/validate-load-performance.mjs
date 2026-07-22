import { spawn } from 'node:child_process';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = (process.argv[2] || 'http://127.0.0.1:4873').replace(/\/+$/, '');
const port = Number(process.argv[3] || 9398);

const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/naembi-load-perf-cdp-${Date.now()}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function json(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return response.json();
}

async function waitForPage() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const pages = await json('/json/list');
      const page = pages.find((item) => item.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await delay(150);
  }
  throw new Error('Chrome CDP page target not found');
}

let ws;
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  const callId = ++id;
  ws.send(JSON.stringify({ id: callId, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(callId, { resolve, reject });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime exception');
  }
  return result.result.value;
}

try {
  const wsURL = await waitForPage();
  ws = new WebSocket(wsURL);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
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

  const result = await evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const youtubePlayer = resources.filter((entry) => /youtube\.com|googlevideo/.test(entry.name));
    const ytimg = resources.filter((entry) => /ytimg/.test(entry.name));
    const scripts = resources.filter((entry) => entry.initiatorType === 'script');
    const images = resources.filter((entry) => entry.initiatorType === 'img');
    const iframes = [...document.querySelectorAll('iframe')].map((frame) => frame.src);
    const youtubeFrames = iframes.filter((src) => /youtube/.test(src));
    const active = document.querySelector('.view.active')?.id || '';
    const homeReady = !!document.querySelector('#home.view.active .rcard');
    const appBytes = resources
      .filter((entry) => entry.name.includes('/app') || entry.name.includes('/index.html'))
      .reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    return {
      active,
      homeReady,
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadEventMs: Math.round(nav.loadEventEnd - nav.startTime),
      responseEndMs: Math.round(nav.responseEnd - nav.startTime),
      resourceCount: resources.length,
      scriptCount: scripts.length,
      imageCount: images.length,
      iframeCount: iframes.length,
      youtubeFrameCount: youtubeFrames.length,
      youtubePlayerRequestCount: youtubePlayer.length,
      ytimgRequestCount: ytimg.length,
      appBytes,
      iframeSources: iframes.slice(0, 4),
      slowestResources: resources
        .map((entry) => ({ name: entry.name, duration: Math.round(entry.duration), transferSize: entry.transferSize || 0 }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 8)
    };
  })()`);

  console.log(JSON.stringify(result, null, 2));

  if (result.active !== 'home' || !result.homeReady) {
    throw new Error('/app 초기 진입이 홈 화면 준비 상태로 열리지 않았습니다.');
  }
  if (result.youtubeFrameCount > 0 || result.youtubePlayerRequestCount > 0) {
    throw new Error('홈 초기 진입에서 YouTube 플레이어 iframe 또는 재생 관련 요청이 발생했습니다.');
  }
  if (result.ytimgRequestCount > 5) {
    throw new Error(`홈 초기 진입 썸네일 요청이 많습니다: ${result.ytimgRequestCount}개`);
  }
  if (result.domContentLoadedMs > 1200) {
    throw new Error(`DOMContentLoaded가 느립니다: ${result.domContentLoadedMs}ms`);
  }
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
