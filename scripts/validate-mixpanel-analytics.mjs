import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NAEMBI_PLAYWRIGHT_PATH || 'playwright');

const baseURL = (process.argv[2] || 'http://127.0.0.1:4873').replace(/\/+$/, '');
const sensitiveKeys = new Set(['email', 'name', 'note', 'message', 'url', 'link', 'recipeUrl', 'recipe_url', 'raw_query', 'query', 'page', 'hash']);
const sensitiveSamples = [
  'tester@example.com',
  '치즈 녹이는 타이밍이 궁금해요',
  'https://youtube.com/watch?v=secret',
  '모바일 피드백 원문입니다',
  '원문 검색어 샘플'
];

function fail(message, detail = {}) {
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

async function installAnalyticsRoutes(page) {
  await page.route('**/api/public-config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        app: 'naembi-web',
        phase: 'beta',
        environment: 'test',
        mixpanel: { enabled: true, token: 'test-mixpanel-token', debug: false }
      })
    });
  });

  await page.route('https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: `
        window.__mixpanelSdkCalls = [];
        var previous = window.mixpanel;
        if (!previous || !previous._i) {
          window.__mixpanelSdkCalls.push({ type: 'bootstrap_missing' });
          console.error('Mixpanel error: "mixpanel" object not initialized. Ensure you are using the latest version of the Mixpanel JS Library along with the snippet we provide.');
        } else {
          var initQueue = previous._i.slice();
          var preLoadQueue = Array.isArray(previous) ? previous.slice() : [];
          window.mixpanel = {
            init: function(token, config) { window.__mixpanelSdkCalls.push({ type: 'init', token: token, config: config }); },
            register: function(props) { window.__mixpanelSdkCalls.push({ type: 'register', props: props }); },
            track: function(event, props) { window.__mixpanelSdkCalls.push({ type: 'track', event: event, props: props }); }
          };
          initQueue.forEach(function(item) {
            window.__mixpanelSdkCalls.push({ type: 'init', token: item[0], config: item[1] });
          });
          preLoadQueue.forEach(function(item) {
            window.__mixpanelSdkCalls.push({ type: 'queued', method: item[0], args: item.slice(1) });
          });
        }
      `
    });
  });

  await page.route('**/api/beta-signup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, storedBy: 'test', requestId: 'beta-test' })
    });
  });

  await page.route('**/api/feedback', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, storedBy: 'test', requestId: 'feedback-test' })
    });
  });
}

async function events(page) {
  return page.evaluate(() => window.__naembiTrackedEvents || []);
}

async function sdkCalls(page) {
  return page.evaluate(() => window.__mixpanelSdkCalls || []);
}

function eventNames(list) {
  return list.map((item) => item.event);
}

function assertHas(list, name, predicate = () => true) {
  const found = list.find((item) => item.event === name && predicate(item.props || {}));
  if (!found) fail(`필수 이벤트 누락: ${name}`, { names: eventNames(list) });
  return found;
}

function assertNoSensitiveProps(list) {
  for (const item of list) {
    const props = item.props || {};
    for (const key of Object.keys(props)) {
      if (sensitiveKeys.has(key)) fail(`민감 키가 이벤트에 포함됨: ${item.event}.${key}`, props);
    }
    const values = Object.values(props).map((value) => String(value));
    for (const sample of sensitiveSamples) {
      if (values.some((value) => value.includes(sample))) {
        fail(`민감 원문이 이벤트 값에 포함됨: ${item.event}`, props);
      }
    }
  }
}

async function waitForEvent(page, name, predicate = () => true, timeout = 5000) {
  await page.waitForFunction(
    ({ eventName }) => (window.__naembiTrackedEvents || []).some((item) => item.event === eventName),
    { eventName: name },
    { timeout }
  );
  const list = await events(page);
  return assertHas(list, name, predicate);
}

async function installVoiceMocks(page) {
  await page.evaluate(() => {
    const fakeStream = { getTracks: () => [{ stop() {} }] };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => fakeStream }
    });
    class QaSpeechRecognition {
      start() {
        window.__qaRecognition = this;
        setTimeout(() => this.onstart?.(), 20);
      }
      stop() {
        setTimeout(() => this.onend?.(), 20);
      }
      abort() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: QaSpeechRecognition });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
    window.__qaEmitFinalSpeech = (text) => {
      const recognition = window.__qaRecognition;
      if (!recognition) return;
      const result = { 0: { transcript: text }, length: 1, isFinal: true };
      recognition.onresult?.({ resultIndex: 0, results: [result] });
      setTimeout(() => recognition.onend?.(), 40);
    };
  });
}

async function runAppChecks(page) {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof show === 'function' && typeof goDetail === 'function' && document.querySelector('#home.active'));
  await waitForEvent(page, 'open_app');

  await page.evaluate(() => goDetail('vHU4_QbslRA'));
  await waitForEvent(page, 'select_recipe', (props) => props.recipe_id === 'vHU4_QbslRA');

  await page.evaluate(() => startCook());
  await waitForEvent(page, 'start_cook', (props) => props.recipe_id === 'vHU4_QbslRA');

  await page.evaluate(() => openIngredients('check'));
  await waitForEvent(page, 'open_ingredients', (props) => props.view === 'check');

  await page.evaluate(() => startUnifiedTimer(1, false, 'manual_input'));
  await waitForEvent(page, 'timer_start', (props) => props.seconds === 1);
  await waitForEvent(page, 'timer_complete', (props) => props.seconds === 1, 4000);

  await installVoiceMocks(page);
  await page.evaluate(() => {
    if (!document.getElementById('cook3')?.classList.contains('active')) startCook();
    if (typeof ensureGeminiLive !== 'function' || typeof runGeminiTool !== 'function') {
      throw new Error('Gemini Live voice functions are missing');
    }
    if (!hf3On) toggleHf3({ startLive: false });
  });
  await waitForEvent(page, 'voice_assistant_open');

  await page.evaluate(() => finishCook());
  await waitForEvent(page, 'complete_recipe');

  await page.evaluate(() => shareCompletedRecipe());
  await waitForEvent(page, 'share_click', (props) => props.share_type === 'complete_landing');

  await page.evaluate(() => openFeedback('analytics-validation'));
  await page.fill('#feedbackForm textarea[name="message"]', '모바일 피드백 원문입니다');
  await page.locator('#feedbackForm button[type="submit"]').click();
  await waitForEvent(page, 'feedback_submit', (props) => props.success === true);

  const list = await events(page);
  assertNoSensitiveProps(list);
  return list;
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul'
  });
  const page = await context.newPage();
  await installAnalyticsRoutes(page);

  const appEvents = await runAppChecks(page);
  const appSdk = await sdkCalls(page);
  if (appSdk.some((call) => call.type === 'bootstrap_missing')) {
    fail('앱 화면 Mixpanel SDK bootstrap stub이 없습니다.', { appSdk });
  }
  if (!appSdk.some((call) => call.type === 'init' && call.token === 'test-mixpanel-token')) {
    fail('Mixpanel SDK init 호출이 없습니다.', { appSdk });
  }
  const required = [
    'open_app',
    'select_recipe',
    'start_cook',
    'open_ingredients',
    'timer_start',
    'timer_complete',
    'voice_assistant_open',
    'complete_recipe',
    'share_click',
    'feedback_submit'
  ];
  const combined = [...appEvents];
  const names = new Set(eventNames(combined));
  const missing = required.filter((name) => !names.has(name));
  if (missing.length) fail('필수 이벤트 누락', { missing, names: [...names] });

  console.log(JSON.stringify({
    ok: true,
    appEvents: appEvents.length,
    sdkTrackCalls: appSdk.filter((call) => call.type === 'track').length,
    requiredEvents: required.length
  }, null, 2));
} finally {
  await browser.close();
}
