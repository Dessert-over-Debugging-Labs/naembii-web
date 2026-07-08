import { spawn } from 'node:child_process';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = (process.argv[2] || 'http://127.0.0.1:4873').replace(/\/+$/, '');
const port = Number(process.argv[3] || 9387);

const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/naembi-cdp-validate-${Date.now()}`,
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
  await delay(2200);

  const home = await evaluate(`({
    path: location.pathname,
    marketing: document.body.classList.contains('marketing-open'),
    active: document.querySelector('.view.active')?.id || '',
    feedbackVisible: getComputedStyle(document.querySelector('.app-feedback-btn')).display
  })`);

  const feedback = await evaluate(`(async () => {
    window.__feedbackRequests = [];
    window.fetch = (url, opts) => {
      window.__feedbackRequests.push({ url: String(url), body: opts && opts.body });
      return Promise.resolve(new Response(JSON.stringify({ ok: true, storedBy: ['local-test'], requestId: 'test_feedback' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }));
    };
    document.querySelector('.app-feedback-btn').click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const modalOpen = document.getElementById('feedbackModal').classList.contains('show');
    document.querySelector('#feedbackForm textarea[name="message"]').value = '모바일 내부 피드백 제출 검증';
    document.querySelector('#feedbackForm button[type="submit"]').click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      modalOpen,
      requests: window.__feedbackRequests,
      status: document.querySelector('#feedbackForm [data-status]')?.textContent || '',
      button: document.querySelector('#feedbackForm button[type="submit"]')?.textContent.trim() || ''
    };
  })()`);

  const timer = await evaluate(`(async () => {
    show('cook3');
    hideCookHint();
    await new Promise((resolve) => setTimeout(resolve, 200));
    openTimer();
    const input = document.getElementById('tsMin');
    input.value = '7';
    tsInputChanged(input.value);
    document.querySelector('#timerSheet .btn').click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      timerText: document.getElementById('stageTimerTime').textContent,
      timerTotal,
      visible: document.getElementById('stageTimer').classList.contains('show')
    };
  })()`);

  const ingredients = await evaluate(`(async () => {
    show('cook3');
    hideCookHint();
    closeTimer();
    await new Promise((resolve) => setTimeout(resolve, 150));
    openIngredients();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const defaultState = {
      sheetOpen: document.getElementById('ingSheet').classList.contains('show'),
      listActive: document.getElementById('ingViewList').classList.contains('active'),
      checkActive: document.getElementById('ingViewCheck').classList.contains('active'),
      cardCount: document.querySelectorAll('#ingViewList .ing').length,
      checkboxCount: document.querySelectorAll('#ingViewCheck input[type="checkbox"]').length
    };
    document.querySelector('[data-ing-view="check"]').click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const checkState = {
      listActive: document.getElementById('ingViewList').classList.contains('active'),
      checkActive: document.getElementById('ingViewCheck').classList.contains('active'),
      checkboxCount: document.querySelectorAll('#ingViewCheck input[type="checkbox"]').length
    };
    closeIngredients();
    return { defaultState, checkState };
  })()`);

  const assistant = await evaluate(`(async () => {
    toggleHf3();
    await new Promise((resolve) => setTimeout(resolve, 250));
    document.getElementById('vpPromptInput').value = '타이머 1분 맞춰줘';
    document.querySelector('.vp-chat-form button').click();
    await new Promise((resolve) => setTimeout(resolve, 900));
    return {
      panel: document.getElementById('vpanel').className,
      user: document.getElementById('vpUser').textContent,
      answer: document.getElementById('vpAi').textContent,
      quickCount: document.querySelectorAll('#vpQuick button').length
    };
  })()`);

  const result = { home, feedback, timer, ingredients, assistant };
  console.log(JSON.stringify(result, null, 2));

  if (home.marketing || home.active !== 'home') {
    throw new Error('/app 모바일 진입이 홈 화면으로 열리지 않았습니다.');
  }
  if (home.feedbackVisible === 'none') {
    throw new Error('앱 내부 피드백 버튼이 보이지 않습니다.');
  }
  if (!feedback.modalOpen || !feedback.requests.some((request) => request.url.endsWith('/api/feedback'))) {
    throw new Error('피드백 제출이 /api/feedback으로 이어지지 않았습니다.');
  }
  if (!feedback.status.includes('접수')) {
    throw new Error('피드백 제출 성공 메시지가 표시되지 않았습니다.');
  }
  if (!timer.visible || timer.timerTotal !== 420) {
    throw new Error('타이머 직접 입력 7분이 반영되지 않았습니다.');
  }
  if (!ingredients.defaultState.sheetOpen || !ingredients.defaultState.listActive || ingredients.defaultState.checkActive) {
    throw new Error('재료 시트가 기본 목록 보기로 열리지 않았습니다.');
  }
  if (ingredients.defaultState.cardCount < 3 || ingredients.defaultState.checkboxCount < ingredients.defaultState.cardCount) {
    throw new Error('재료 목록 보기와 체크리스트 보기가 함께 렌더링되지 않았습니다.');
  }
  if (ingredients.checkState.listActive || !ingredients.checkState.checkActive) {
    throw new Error('재료 체크리스트 추가 보기로 전환되지 않았습니다.');
  }
  if (!assistant.user.includes('타이머 1분') || assistant.quickCount < 3) {
    throw new Error('요리비서 질문 입력/추천 질문이 동작하지 않았습니다.');
  }
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
