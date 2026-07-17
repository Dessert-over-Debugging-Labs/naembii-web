import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = process.argv[2] || 'http://127.0.0.1:4190/';
const out = process.argv[3] || '/tmp/cook-wireframe-v3/cdp-mobile.png';
const mode = process.argv[4] || 'mobile';
const port = Number(process.argv[5] || 9237);
const metricsByMode = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  tablet: { width: 768, height: 1100, deviceScaleFactor: 1, mobile: true },
  desktop: { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false }
};
const metrics = metricsByMode[mode] || metricsByMode.mobile;

await mkdir(dirname(out), { recursive: true });

const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1',
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

let wsURL = '';
try {
  wsURL = await waitForPage();
} catch (error) {
  child.kill('SIGTERM');
  throw error;
}
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
  if (mode === 'mobile' || mode === 'tablet') {
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
  }
  await send('Page.navigate', { url: baseURL });
  await delay(2600);
  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `
      new Promise(resolve => {
        history.scrollRestoration = 'manual';
        let count = 0;
        const pin = () => {
          window.scrollTo(0,0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          count += 1;
          if (count < 18) requestAnimationFrame(pin);
          else setTimeout(() => {
            window.scrollTo(0,0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            resolve(true);
          }, 120);
        };
        pin();
      });
    `
  });
  await delay(300);
  const info = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `({
      width: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      scrollY: window.scrollY,
      mobileMedia: matchMedia('(max-width:900px)').matches,
      path: location.pathname,
      headline: document.querySelector('h1')?.innerText || '',
      heroTop: Math.round(document.querySelector('.hero')?.getBoundingClientRect().top || 0),
      heroHeight: Math.round(document.querySelector('.hero')?.getBoundingClientRect().height || 0),
      betaTop: Math.round((document.querySelector('#beta')?.getBoundingClientRect().top || 0) + window.scrollY),
      landingSections: [...document.querySelectorAll('nav,.hero,main>section,.footer')].map((node, index) => {
        const rect = node.getBoundingClientRect();
        return {
          index,
          tag: node.tagName.toLowerCase(),
          id: node.id || '',
          className: String(node.className || ''),
          label: node.getAttribute('aria-label') || node.querySelector('.section-kicker')?.textContent || '',
          top: Math.round(rect.top + window.scrollY),
          height: Math.round(rect.height),
          bottom: Math.round(rect.bottom + window.scrollY)
        };
      }),
      mobileScrollScreens: Math.round((document.documentElement.scrollHeight / window.innerHeight) * 100) / 100,
      hasCookingPromise: document.body.innerText.includes('SNS 요리 영상') && document.body.innerText.includes('따라 하다 막혔죠'),
      hasBetaCTA: document.body.innerText.includes('미리 써보기 신청') || document.body.innerText.includes('먼저 써보기 신청') || document.body.innerText.includes('출시 소식 받기'),
      hasMascotCopy: document.body.innerText.includes('작은 냄비가') || document.body.innerText.includes('옆에서 챙겨요'),
      hasRecipeRequest: document.body.innerText.includes('보고 싶은 요리 보내기') || document.body.innerText.includes('요리 보내기'),
      hasLaunchInput: document.body.innerText.includes('미리 써보기 신청') || document.body.innerText.includes('먼저 써보기 신청') || document.body.innerText.includes('출시 소식 받기'),
      hasMobileAppCTA: document.body.innerText.includes('지금 써보기') || document.body.innerText.includes('먼저 경험해보기'),
      hasAppPreview: document.querySelectorAll('img[src^="/assets/screens/"]').length >= 5,
      hasAssistantSurvey: !!document.querySelector('[data-assistant-survey="true"]') && document.body.innerText.includes('오늘 어떤 요리를 따라 해볼까요?') && document.body.innerText.includes('바로 만들어보기'),
      hasInteractiveGif: !!document.querySelector('img[src="/assets/screens/naembi-core-flow.gif"]'),
      heroPrimaryCtaVisible: (() => {
        const cta = document.querySelector('.hero-actions .primary');
        const rect = cta?.getBoundingClientRect();
        return !!rect && rect.top >= 0 && rect.bottom <= window.innerHeight;
      })(),
      heroPhoneStartsInFirstViewport: (() => {
        const phone = document.querySelector('.phone-showcase');
        const rect = phone?.getBoundingClientRect();
        return !!rect && rect.top > 0 && rect.top < window.innerHeight;
      })(),
      heroPhoneFullyVisibleInFirstViewport: (() => {
        const phone = document.querySelector('.phone-showcase');
        const rect = phone?.getBoundingClientRect();
        return !!rect && rect.top > 0 && rect.bottom <= window.innerHeight;
      })(),
      heroScrollPressureLow: (() => {
        const hero = document.querySelector('.hero');
        const rect = hero?.getBoundingClientRect();
        return !!rect && rect.height <= window.innerHeight * 1.28;
      })(),
      mobileScreensUseHorizontalScroll: (() => {
        const screens = document.querySelector('.screens');
        const style = screens ? getComputedStyle(screens) : null;
        return !matchMedia('(max-width:620px)').matches || !!style && style.display === 'flex' && /(auto|scroll)/.test(style.overflowX);
      })(),
      heroProofHiddenOnMobile: (() => {
        const proof = document.querySelector('.hero-proof');
        return !matchMedia('(max-width:620px)').matches || !proof || getComputedStyle(proof).display === 'none';
      })(),
      hasVisibleAppPreview: (() => {
        const shots = [...document.querySelectorAll('img[src^="/assets/screens/"]')];
        return shots.some(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0;
        });
      })(),
      screenImages: [...document.querySelectorAll('img[src^="/assets/screens/"]')].map(img => {
        const rect = img.getBoundingClientRect();
        const naturalRatio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
        const renderedRatio = rect.width && rect.height ? rect.width / rect.height : 0;
        const ratioDelta = naturalRatio && renderedRatio ? Math.abs(naturalRatio - renderedRatio) : 0;
        return {
          src: img.getAttribute('src'),
          objectFit: getComputedStyle(img).objectFit,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          naturalRatio: Math.round(naturalRatio * 1000) / 1000,
          renderedRatio: Math.round(renderedRatio * 1000) / 1000,
          ratioDelta: Math.round(ratioDelta * 1000) / 1000,
          visible: rect.width > 0 && rect.height > 0
        };
      }),
      croppedScreenImages: [...document.querySelectorAll('img[src^="/assets/screens/"]')].filter(img => {
        const rect = img.getBoundingClientRect();
        const naturalRatio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
        const renderedRatio = rect.width && rect.height ? rect.width / rect.height : 0;
        return getComputedStyle(img).objectFit === 'cover' || (naturalRatio && renderedRatio && Math.abs(naturalRatio - renderedRatio) > 0.03);
      }).map(img => img.getAttribute('src')),
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
