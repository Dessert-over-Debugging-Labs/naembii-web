import { spawn } from 'node:child_process';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = (process.argv[2] || 'http://127.0.0.1:4873').replace(/\/+$/, '');
const port = Number(process.argv[3] || 9407);
const recipeId = process.argv[4] || 'vlPqkuHIdCc';

const viewports = [
  { name: 'mobile-320', width: 320, height: 568, deviceScaleFactor: 2, mobile: true },
  { name: 'mobile-390', width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
];

const states = [
  {
    name: 'home',
    setup: `localStorage.setItem('naembiAssistantOnboardingSeen','1'); show('home');`,
    font: [
      ['home-section-title', '#home .section-t', ['--font-size-lg']],
      ['home-coming-soon', '#home .soon-badge', ['--font-size-sm']]
    ],
    icon: [
      ['home-coming-soon-icon', '#home .soon-badge svg', ['--icon-size-xs']]
    ]
  },
  {
    name: 'cook-core',
    setup: `localStorage.setItem('naembiAssistantOnboardingSeen','1'); currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint({ startPlayback: false });`,
    font: [
      ['cook-nav-title', '#cook3 .cook-nav .title', ['--cook-step-title-size']],
      ['cook-step-title', '#cookTrack3 .scard.active .sc-title', ['--cook-step-title-size', '--font-size-lg']],
      ['cook-control-label', '#cook3Ctrl .cbtn small', ['--font-size-sm']]
    ],
    icon: [
      ['cook-nav-icon', '#cook3 .cook-nav svg', ['--icon-size-lg']],
      ['cook-control-icon', '#cook3Ctrl .cbtn:not(.ai-assistant-btn) .cic svg', ['--icon-size-control']],
      ['cook-assistant-icon', '#hf3 .cic.ai-assistant svg', ['--icon-size-xl']]
    ]
  },
  {
    name: 'assistant-panel',
    setup: `localStorage.setItem('naembiAssistantOnboardingSeen','1'); currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint({ startPlayback: false }); toggleHf3({ startLive: false });`,
    font: [
      ['assistant-idle-copy', '#vpIdleState p', ['--font-size-lg', '--font-size-base']]
    ],
    icon: [
      ['assistant-close-icon', '#vpanel .vp-close svg', ['--icon-size-panel']],
      ['assistant-mic-icon', '#vpanel .vp-mic svg', ['--icon-size-panel']]
    ]
  },
  {
    name: 'assistant-transcript',
    setup: `localStorage.setItem('naembiAssistantOnboardingSeen','1'); currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint({ startPlayback: false }); toggleHf3({ startLive: false }); document.getElementById('vpTranscript').innerHTML='<div class="vp-transcript-entry user"><b>나</b><span>양념이 타는 것 같아.</span></div><div class="vp-transcript-entry assistant"><b>냄비</b><span>불을 한 단계 낮춰 주세요.</span></div>'; document.getElementById('vpScroll').classList.add('has-transcript');`,
    font: [
      ['assistant-reply-copy', '#vpTranscript .vp-transcript-entry.assistant span', ['--font-size-md', '--font-size-base']]
    ],
    icon: []
  },
  {
    name: 'assistant-onboarding',
    setup: `localStorage.removeItem('naembiAssistantOnboardingSeen'); currentRecipe=recipeById('${recipeId}'); show('cook3'); showAssistantOnboarding({ force: true });`,
    font: [
      ['onboarding-title', '#assistantOnboardingTitle', ['--font-size-md', '--font-size-sm']],
      ['onboarding-desc', '#assistantOnboardingDesc', ['--font-size-sm', '--font-size-xs']],
      ['onboarding-action', '.assistant-onboarding-actions button:not([hidden])', ['--font-size-sm']]
    ],
    icon: [
      ['onboarding-icon', '.assistant-onboarding-icon svg', ['--icon-size-md']]
    ]
  },
  {
    name: 'video-settings',
    setup: `localStorage.setItem('naembiAssistantOnboardingSeen','1'); currentRecipe=recipeById('${recipeId}'); show('cook3'); hideCookHint({ startPlayback: false }); openVideoSettings();`,
    font: [
      ['settings-title', '#videoSettings .vset-head b', ['--font-size-lg', '--font-size-base']],
      ['settings-label', '#videoSettings .vset-label', ['--font-size-md', '--font-size-compact']]
    ],
    icon: [
      ['settings-close-icon', '#videoSettings .vset-head .x svg', ['--icon-size-md']],
      ['settings-label-icon', '#videoSettings .vset-label svg', ['--icon-size-label', '--icon-size-sm']]
    ]
  }
];

const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/naembi-design-system-cdp-${Date.now()}`,
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
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime exception');
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

  const failures = [];
  const results = [];

  for (const viewport of viewports) {
    await send('Emulation.setDeviceMetricsOverride', viewport);
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    await send('Page.navigate', { url: `${baseURL}/app` });
    await delay(1700);

    for (const state of states) {
      const checks = await evaluate(`(async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        try { closeIngredients(); } catch {}
        try { closeTimer(); } catch {}
        try { closeVideoSettings(); } catch {}
        try { cancelStageTimer({ silent: true }); } catch {}
        try { hf3Reset(); } catch {}
        ${state.setup}
        if (typeof lucide !== 'undefined') lucide.createIcons();
        await wait(420);
        const rootStyle = getComputedStyle(document.documentElement);
        const tokenValue = (name) => Number.parseFloat(rootStyle.getPropertyValue(name));
        const tokens = {};
        ${JSON.stringify([
          '--font-size-xs',
          '--font-size-sm',
          '--font-size-compact',
          '--font-size-md',
          '--font-size-base',
          '--font-size-lg',
          '--font-size-xl',
          '--font-size-2xl',
          '--icon-size-xs',
          '--icon-size-sm',
          '--icon-size-panel',
          '--icon-size-label',
          '--icon-size-md',
          '--icon-size-control',
          '--icon-size-lg',
          '--icon-size-xl',
          '--touch-target',
          '--cook-step-title-size'
        ])}.forEach((name) => { tokens[name] = tokenValue(name); });
        const visible = (el) => {
          if (!el) return false;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
        };
        const readSize = (el, property) => Number.parseFloat(getComputedStyle(el)[property]);
        const check = (kind, label, selector, tokenNames, property) => {
          const nodes = [...document.querySelectorAll(selector)].filter(visible);
          if (!nodes.length) return [{ kind, label, selector, error: 'not-rendered' }];
          return nodes.slice(0, 8).map((node) => {
            const size = readSize(node, property);
            const allowed = tokenNames.map((name) => tokens[name]).filter(Number.isFinite);
            const ok = allowed.some((value) => Math.abs(value - size) <= 0.6);
            return {
              kind,
              label,
              selector,
              text: (node.innerText || node.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 60),
              size,
              allowed,
              ok
            };
          });
        };
        const fontChecks = ${JSON.stringify(state.font)}.flatMap(([label, selector, tokenNames]) => check('font', label, selector, tokenNames, 'fontSize'));
        const iconChecks = ${JSON.stringify(state.icon)}.flatMap(([label, selector, tokenNames]) => {
          const width = check('icon-width', label, selector, tokenNames, 'width');
          const height = check('icon-height', label, selector, tokenNames, 'height');
          return [...width, ...height];
        });
        const tokenChecks = Object.entries(tokens).map(([name, value]) => ({ name, value, ok: Number.isFinite(value) && value > 0 }));
        return { viewport: ${JSON.stringify(viewport.name)}, state: ${JSON.stringify(state.name)}, tokens, tokenChecks, checks: [...fontChecks, ...iconChecks] };
      })()`);

      const stateFailures = [
        ...checks.tokenChecks.filter((item) => !item.ok).map((item) => ({ type: 'token', ...item })),
        ...checks.checks.filter((item) => !item.ok).map((item) => ({ type: 'component', ...item }))
      ];
      const result = {
        viewport: viewport.name,
        state: state.name,
        status: stateFailures.length ? 'FAIL' : 'PASS',
        failures: stateFailures
      };
      results.push(result);
      if (stateFailures.length) failures.push(result);
    }
  }

  console.log(JSON.stringify({ results, failures }, null, 2));

  if (failures.length) {
    throw new Error(`Design token validation failed: ${failures.map((item) => `${item.viewport}/${item.state}`).join(', ')}`);
  }
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
