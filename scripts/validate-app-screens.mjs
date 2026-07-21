import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = (process.argv[2] || 'http://127.0.0.1:4190').replace(/\/+$/, '');
const outDir = resolve(process.argv[3] || '/tmp/cook-wireframe-v3/app-screens');
const port = Number(process.argv[4] || 9394);
const recipeId = process.argv[5] || 'vlPqkuHIdCc';

const viewports = [
  { name: 'mobile-390', width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  { name: 'mobile-short', width: 375, height: 667, deviceScaleFactor: 2, mobile: true },
  { name: 'iphone-16', width: 393, height: 852, deviceScaleFactor: 3, mobile: true },
  { name: 'iphone-16-pro-max', width: 430, height: 932, deviceScaleFactor: 3, mobile: true },
  { name: 'fold-closed', width: 344, height: 882, deviceScaleFactor: 3, mobile: true },
  { name: 'fold-open', width: 674, height: 842, deviceScaleFactor: 2, mobile: true },
  { name: 'desktop-shell', width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }
];

const states = [
  {
    name: 'home',
    setup: `show('home');`,
    required: ['#home .nav', '#home .soon-badge', '#popScroll.recipe-list .rcard', '.app-feedback-btn']
  },
  {
    name: 'detail',
    setup: `currentRecipe=recipeById('${recipeId}'); show('detail');`,
    required: ['#detail .nav', '#detailYoutubePlayer', '#detTitle', '#detProof .detail-proof-total', '#detProof .detail-proof-platforms>span', '.cta-bar .btn']
  },
  {
    name: 'cook3-hint',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3');`,
    required: ['#cook3 .nav', '#cook3 .cook-video', '#cookTrack3 .scard.active', '#cookHint.show', '#cook3Ctrl']
  },
  {
    name: 'cook3-core',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint();`,
    required: ['#cook3 .nav', '#cook3 .cook-video', '#cookTrack3 .scard.active', '#cook3Ctrl']
  },
  {
    name: 'timer-sheet',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint(); openTimer();`,
    required: ['#timerSheet.show .ing-panel', '.ts-edit-hint', '#tsMin', '#tsSec', '.ts-sec-adjusts button', '#timerSheet .btn']
  },
  {
    name: 'cook3-timer-running',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint(); startUnifiedTimer(180, false);`,
    required: ['#stageTimer.show', '#cook3 .cook-body.timer-active', '#cookTrack3 .scard.active', '#cook3Ctrl']
  },
  {
    name: 'video-settings',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint(); openVideoSettings();`,
    required: ['#videoSettings.show .vset-card', '#vsMasterVolRange', '#vsVolRange', '#vsVoiceVolRange', '#vsTimerVolRange', '#vsSpeedVal']
  },
  {
    name: 'ingredients-list',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint(); openIngredients('list');`,
    required: ['#ingSheet.show .ing-panel', '#ingViewList.active', '#ingViewList .ing']
  },
  {
    name: 'ingredients-check',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint(); openIngredients('check');`,
    required: ['#ingSheet.show .ing-panel', '#ingViewCheck.active', '#ingViewCheck input[type="checkbox"]']
  },
  {
    name: 'assistant-panel',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint(); toggleHf3({startLive:false});`,
    required: ['#vpanel.open', '#vpSizeHandle', '#vpScroll', '#vpIdleState', '.vp-mic', '.vp-close']
  },
  {
    name: 'assistant-panel-transcript',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint(); toggleHf3({startLive:false}); document.getElementById('vpTranscript').innerHTML='<div class="vp-transcript-entry user"><b>나</b><span>양념이 타는 것 같아.</span></div><div class="vp-transcript-entry assistant"><b>냄비</b><span>불을 한 단계 낮춰 주세요.</span></div>'; document.getElementById('vpScroll').classList.add('has-transcript');`,
    required: ['#vpanel.open.compact', '#vpTranscript .vp-transcript-entry', '.vp-mic', '.vp-close']
  },
  {
    name: 'assistant-panel-expanded',
    setup: `currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint(); if(!hf3On){toggleHf3({startLive:false});}else{resetVpVoicePanel();} setVpPanelExpanded(true); document.getElementById('vpTranscript').innerHTML='<div class="vp-transcript-entry user"><b>나</b><span>양념이 타는 것 같아.</span></div><div class="vp-transcript-entry assistant"><b>냄비</b><span>불을 한 단계 낮추고 팬 가장자리의 양념을 가운데로 모아 주세요. 물이나 면수를 한 숟갈씩 넣어 농도를 풀고 천천히 섞으면 좋아요.</span></div>'; document.getElementById('vpScroll').classList.add('has-transcript');`,
    required: ['#vpanel.open.expanded', '#cook3Ctrl.vpanel-expanded', '#vpScroll', '#vpTranscript .vp-transcript-entry', '.vp-mic', '.vp-close']
  },
  {
    name: 'complete',
    setup: `currentRecipe=recipeById('${recipeId}'); show('complete');`,
    required: ['#complete .done-view', '#doneTitle', '.done-actions .share', '.done-actions .btn.light']
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
  `--user-data-dir=/tmp/naembi-app-clip-cdp-${Date.now()}`,
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

function screenshotName(viewport, state) {
  return `${viewport.name}-${state.name}.png`;
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

  const results = [];
  const failures = [];

  for (const viewport of viewports) {
    await send('Emulation.setDeviceMetricsOverride', viewport);
    if (viewport.mobile) {
      await send('Emulation.setUserAgentOverride', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      });
    } else {
      await send('Emulation.setUserAgentOverride', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
      });
    }

    await send('Page.navigate', { url: `${baseURL}/app` });
    await delay(1800);

    for (const state of states) {
      const metrics = await evaluate(`(async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const cleanup = () => {
          try { closeIngredients(); } catch {}
          try { closeTimer(); } catch {}
          try { cancelStageTimer({ silent: true }); } catch {}
          try { closeVoice(); } catch {}
          try { closeVideoSettings(); } catch {}
          const vpanel = document.getElementById('vpanel');
          if (vpanel) vpanel.classList.remove('open','idle','listening','thinking','answering','expanded','compact');
          const cookCtrl = document.getElementById('cook3Ctrl');
          if (cookCtrl) cookCtrl.classList.remove('vpanel-open','vpanel-expanded');
          try { hf3On = false; vpClear(); } catch {}
          const feedback = document.getElementById('feedbackModal');
          if (feedback) feedback.classList.remove('show');
          document.querySelectorAll('.body,.cook-body,.hf-chat').forEach((el) => { el.scrollTop = 0; });
        };
        cleanup();
        ${state.setup}
        if (typeof lucide !== 'undefined') lucide.createIcons();
        await wait(520);
        document.querySelectorAll('.body,.cook-body,.hf-chat').forEach((el) => { el.scrollTop = 0; });
        await wait(100);

        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const roundRect = (rect) => ({
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
        const isRendered = (el) => {
          if (!el) return false;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number(style.opacity) !== 0
            && rect.width > 0
            && rect.height > 0;
        };
        const inViewport = (rect) => (
          rect.left >= -1
          && rect.top >= -1
          && rect.right <= window.innerWidth + 1
          && rect.bottom <= window.innerHeight + 1
        );
        const intersectsViewport = (rect) => (
          rect.right > 0
          && rect.bottom > 0
          && rect.left < window.innerWidth
          && rect.top < window.innerHeight
        );
        const measureSelector = (selector) => {
          const nodes = [...document.querySelectorAll(selector)];
          const rendered = nodes.filter(isRendered).map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              text: (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
              rect: roundRect(rect),
              fullyVisible: inViewport(rect),
              visible: intersectsViewport(rect)
            };
          });
          return {
            selector,
            count: nodes.length,
            renderedCount: rendered.length,
            anyVisible: rendered.some((item) => item.visible),
            anyFullyVisible: rendered.some((item) => item.fullyVisible),
            samples: rendered.slice(0, 3)
          };
        };

        const activeViews = [...document.querySelectorAll('.view.active')];
        const active = activeViews[0];
        const screen = document.querySelector('.screen');
        const body = active?.querySelector('.body');
        const bodyScrollable = body ? body.scrollHeight > body.clientHeight + 2 : false;
        const viewCanScroll = active ? /auto|scroll/.test(getComputedStyle(active).overflowY) : false;
        const viewVerticalOverflow = active
          ? active.scrollHeight > active.clientHeight + 2 && !bodyScrollable && !viewCanScroll
          : false;

        const selectors = ${JSON.stringify(state.required)}.map(measureSelector);
        const missingOrClipped = selectors
          .filter((item) => !item.anyFullyVisible)
          .map((item) => ({
            selector: item.selector,
            count: item.count,
            renderedCount: item.renderedCount,
            samples: item.samples
          }));

        const textOverflow = [...document.querySelectorAll('.view.active button,.view.active input,.view.active .btn,.ing-sheet.show button,.ing-sheet.show input,.vpanel.open input')]
          .filter(isRendered)
          .filter((el) => !el.matches('.dtab,.ai-assistant-btn'))
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              selector: el.id ? '#' + el.id : (el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : el.tagName.toLowerCase()),
              text: (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
              rect: roundRect(rect),
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              scrollHeight: el.scrollHeight,
              clientHeight: el.clientHeight
            };
          })
          .filter((item) => item.scrollWidth > item.clientWidth + 3 || item.scrollHeight > item.clientHeight + 3);

        return {
          state: ${JSON.stringify(state.name)},
          viewport,
          path: location.pathname,
          activeView: active?.id || '',
          activeViewCount: activeViews.length,
          documentOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
          bodyOverflowX: document.body.scrollWidth > window.innerWidth + 1,
          screenOverflowX: screen ? screen.scrollWidth > screen.clientWidth + 1 : false,
          activeOverflowX: active ? active.scrollWidth > active.clientWidth + 1 : false,
          viewVerticalOverflow,
          active: active ? {
            id: active.id,
            rect: roundRect(active.getBoundingClientRect()),
            scrollHeight: active.scrollHeight,
            clientHeight: active.clientHeight,
            hasScrollableBody: bodyScrollable
          } : null,
          selectors,
          missingOrClipped,
          textOverflow
        };
      })()`);

      const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      const shotPath = join(outDir, screenshotName(viewport, state));
      await writeFile(shotPath, Buffer.from(shot.data, 'base64'));

      const stateFailures = [];
      if (metrics.documentOverflowX || metrics.bodyOverflowX || metrics.screenOverflowX || metrics.activeOverflowX) {
        stateFailures.push('horizontal-overflow');
      }
      if (metrics.activeViewCount !== 1) {
        stateFailures.push(`active-view-count:${metrics.activeViewCount}`);
      }
      if (metrics.viewVerticalOverflow) {
        stateFailures.push('non-scrollable-vertical-overflow');
      }
      if (metrics.missingOrClipped.length) {
        stateFailures.push(`required-clipped:${metrics.missingOrClipped.map((item) => item.selector).join(',')}`);
      }
      if (metrics.textOverflow.length) {
        stateFailures.push(`text-overflow:${metrics.textOverflow.map((item) => item.selector).join(',')}`);
      }

      const result = {
        viewport: viewport.name,
        state: state.name,
        status: stateFailures.length ? 'FAIL' : 'PASS',
        failures: stateFailures,
        screenshot: shotPath,
        metrics
      };
      results.push(result);
      if (stateFailures.length) failures.push(result);
    }
  }

  const summary = {
    status: failures.length ? 'FAIL' : 'PASS',
    checked: results.length,
    failed: failures.length,
    outDir,
    failures: failures.map((item) => ({
      viewport: item.viewport,
      state: item.state,
      failures: item.failures,
      screenshot: item.screenshot,
      missingOrClipped: item.metrics.missingOrClipped,
          textOverflow: item.metrics.textOverflow,
          activeViewCount: item.metrics.activeViewCount,
          active: item.metrics.active
        }))
  };

  await writeFile(join(outDir, 'summary.json'), JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (failures.length) process.exitCode = 1;
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
