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

  const search = await evaluate(`(async () => {
    openSearch('Maangchi');
    await new Promise((resolve) => setTimeout(resolve, 220));
    const creatorRows = [...document.querySelectorAll('#creatorResults .creator-row')].map((row) => row.textContent.trim().replace(/\\s+/g, ' '));
    const recipeCards = [...document.querySelectorAll('#searchResults .rcard')].map((card) => ({
      title: card.querySelector('.cap b')?.textContent.trim() || '',
      meta: card.querySelector('.cap small')?.textContent.trim() || ''
    }));
    return {
      active: document.querySelector('.view.active')?.id || '',
      creatorHeadVisible: document.getElementById('creatorResultHead').classList.contains('show'),
      creatorRows,
      recipeCards,
      foodChipTexts: [...document.querySelectorAll('.search-chips:not(.creator) button')].map((button) => button.textContent.trim()),
      creatorChipTexts: [...document.querySelectorAll('.search-chips.creator button')].map((button) => button.textContent.trim())
    };
  })()`);

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

  const tutorial = await evaluate(`(async () => {
    show('cook3');
    await new Promise((resolve) => setTimeout(resolve, 260));
    const hint = document.getElementById('cookHint');
    const card = document.querySelector('#cookTrack3 .scard.active');
    const body = document.querySelector('#cook3 .cook-body');
    const rect = hint.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const area = Math.max(1, rect.width * rect.height);
    const screenArea = window.innerWidth * window.innerHeight;
    const overlapX = Math.max(0, Math.min(rect.right, cardRect.right) - Math.max(rect.left, cardRect.left));
    const overlapY = Math.max(0, Math.min(rect.bottom, cardRect.bottom) - Math.max(rect.top, cardRect.top));
    const overlapRatio = (overlapX * overlapY) / Math.max(1, cardRect.width * cardRect.height);
    const initialVisible = hint.classList.contains('show');
    hideCookHint();
    await new Promise((resolve) => setTimeout(resolve, 100));
    show('detail');
    show('cook3');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const reopensAfterClose = document.getElementById('cookHint').classList.contains('show');
    dismissHintForever();
    await new Promise((resolve) => setTimeout(resolve, 100));
    show('detail');
    show('cook3');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const hiddenAfterNever = !document.getElementById('cookHint').classList.contains('show');
    return {
      visible: initialVisible,
      rect: { width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) },
      bodyRect: { top: Math.round(bodyRect.top), bottom: Math.round(bodyRect.bottom) },
      screenCoverage: Number((area / screenArea).toFixed(3)),
      overlapRatio: Number(overlapRatio.toFixed(3)),
      insideCookBody: rect.top >= bodyRect.top - 1 && rect.bottom <= bodyRect.bottom + 1,
      reopensAfterClose,
      hiddenAfterNever
    };
  })()`);

  const assistant = await evaluate(`(async () => {
    toggleHf3();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const opened = {
      panel: document.getElementById('vpanel').className,
      user: document.getElementById('vpUser').textContent,
      answer: document.getElementById('vpAi').textContent,
      liveStatus: document.getElementById('vpLiveStatus').textContent,
      handleExpanded: document.getElementById('vpSizeHandle').getAttribute('aria-expanded'),
      ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height),
      queuedTimers: vpTimers.length,
      activeStep: document.querySelector('#cookTrack3 .scard.active')?.dataset.i
    };
    document.getElementById('vpSizeHandle').click();
    await new Promise((resolve) => setTimeout(resolve, 160));
    const resized = {
      panel: document.getElementById('vpanel').className,
      handleExpanded: document.getElementById('vpSizeHandle').getAttribute('aria-expanded'),
      ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height)
    };
    document.getElementById('vpPromptInput').value = '타이머 1분 맞춰줘';
    document.querySelector('.vp-chat-form button').click();
    await new Promise((resolve) => setTimeout(resolve, 900));
    return {
      opened,
      resized,
      panel: document.getElementById('vpanel').className,
      user: document.getElementById('vpUser').textContent,
      answer: document.getElementById('vpAi').textContent,
      quickCount: document.querySelectorAll('#vpQuick button').length,
      activeStep: document.querySelector('#cookTrack3 .scard.active')?.dataset.i
    };
  })()`);

  const result = { home, search, feedback, timer, ingredients, tutorial, assistant };
  console.log(JSON.stringify(result, null, 2));

  if (home.marketing || home.active !== 'home') {
    throw new Error('/app 모바일 진입이 홈 화면으로 열리지 않았습니다.');
  }
  if (home.feedbackVisible === 'none') {
    throw new Error('앱 내부 피드백 버튼이 보이지 않습니다.');
  }
  if (search.active !== 'searchPage' || !search.creatorHeadVisible || !search.creatorRows.some((row) => row.includes('Maangchi'))) {
    throw new Error('Maangchi 검색이 창작자 결과로 분리되지 않았습니다.');
  }
  if (search.foodChipTexts.includes('Maangchi') || !search.creatorChipTexts.includes('Maangchi')) {
    throw new Error('창작자 빠른 검색어가 요리 칩과 분리되지 않았습니다.');
  }
  if (search.recipeCards.length < 1 || !search.recipeCards.every((card) => card.title && !/^Maangchi$/i.test(card.title))) {
    throw new Error('창작자 검색의 요리 결과가 실제 레시피 카드로 표시되지 않았습니다.');
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
  if (!tutorial.visible || !tutorial.insideCookBody || tutorial.screenCoverage > 0.2 || tutorial.overlapRatio > 0.35) {
    throw new Error('조리 튜토리얼이 화면 내부 패널로 보이지 않거나 조리 카드를 과하게 가립니다.');
  }
  if (!tutorial.reopensAfterClose || !tutorial.hiddenAfterNever) {
    throw new Error('조리 튜토리얼 다시 보기/다시 보지 않기 흐름이 동작하지 않습니다.');
  }
  if (!assistant.opened.panel.includes('open') || assistant.opened.queuedTimers !== 0 || assistant.opened.activeStep !== '0') {
    throw new Error('요리비서 패널이 열리자마자 자동 대화/단계 진행을 시작했습니다.');
  }
  if (!assistant.opened.user.includes('궁금') || !assistant.opened.answer.includes('직접 물어보면')) {
    throw new Error('요리비서 대기 상태 안내가 표시되지 않았습니다.');
  }
  if (!assistant.opened.liveStatus.includes('마이크 버튼')) {
    throw new Error('Gemini Live 모바일 권한 확인 안내가 표시되지 않았습니다.');
  }
  if (assistant.opened.handleExpanded !== 'false' || assistant.resized.handleExpanded !== 'true' || assistant.resized.ctrlHeight <= assistant.opened.ctrlHeight) {
    throw new Error('요리비서 패널 크기 조절 바가 기본/확장 상태를 전환하지 못했습니다.');
  }
  if (!assistant.user.includes('타이머 1분') || assistant.quickCount < 3 || assistant.activeStep !== '0') {
    throw new Error('요리비서 질문 입력/추천 질문이 동작하지 않았습니다.');
  }
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
