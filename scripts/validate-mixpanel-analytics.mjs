import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NAEMBI_PLAYWRIGHT_PATH || 'playwright');

const baseURL = (process.argv[2] || 'http://127.0.0.1:4873').replace(/\/+$/, '');
const sensitiveKeys = new Set(['email', 'name', 'note', 'message', 'url', 'link', 'recipeUrl', 'recipe_url', 'raw_query', 'query', 'page']);
const sensitiveSamples = [
  'tester@example.com',
  '치즈 녹이는 타이밍이 궁금해요',
  'https://youtube.com/watch?v=secret',
  '모바일 피드백 원문입니다'
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
        window.mixpanel = {
          init: function(token, config) { window.__mixpanelSdkCalls.push({ type: 'init', token: token, config: config }); },
          register: function(props) { window.__mixpanelSdkCalls.push({ type: 'register', props: props }); },
          track: function(event, props) { window.__mixpanelSdkCalls.push({ type: 'track', event: event, props: props }); }
        };
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

async function runLandingChecks(page) {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await waitForEvent(page, 'landing_view');

  await page.evaluate(() => {
    const cta = document.querySelector('.hero-actions .btn.primary');
    cta?.addEventListener('click', (event) => event.preventDefault(), { capture: true, once: true });
    cta?.click();
  });
  await waitForEvent(page, 'hero_cta_click');

  await page.fill('#betaForm input[name="email"]', 'tester@example.com');
  await page.locator('#betaForm button[type="submit"]').click();
  await waitForEvent(page, 'beta_signup_submit', (props) => props.success === true);

  await page.fill('#recipeRequestForm input[name="recipeName"]', '콘치즈 불닭');
  await page.fill('#recipeRequestForm input[name="recipeUrl"]', 'https://youtube.com/watch?v=secret');
  await page.locator('#recipeRequestForm button[type="submit"]').click();
  await waitForEvent(page, 'recipe_request_submit', (props) => props.success === true && props.has_youtube_url === true);

  await page.locator('.choice-chip[data-value="quick"]').first().click();
  await waitForEvent(page, 'assistant_survey_select');

  const list = await events(page);
  assertHas(list, 'hero_cta_click', () => true);
  assertNoSensitiveProps(list);
  return list;
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
  await page.goto(`${baseURL}/app`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof show === 'function' && typeof executeRecipeSearch === 'function');
  await waitForEvent(page, 'open_app');

  await page.evaluate(() => executeRecipeSearch('명란 파스타'));
  await waitForEvent(page, 'search_submit', (props) => props.query_type && props.result_count >= 0);
  await waitForEvent(page, 'search_result_view');

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

  const landingEvents = await runLandingChecks(page);
  const landingSdk = await sdkCalls(page);
  if (!landingSdk.some((call) => call.type === 'init' && call.token === 'test-mixpanel-token')) {
    fail('Mixpanel SDK init 호출이 없습니다.', { landingSdk });
  }

  const appEvents = await runAppChecks(page);
  const appSdk = await sdkCalls(page);
  const required = [
    'landing_view',
    'beta_signup_submit',
    'recipe_request_submit',
    'open_app',
    'search_submit',
    'search_result_view',
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
  const combined = [...landingEvents, ...appEvents];
  const names = new Set(eventNames(combined));
  const missing = required.filter((name) => !names.has(name));
  if (missing.length) fail('필수 이벤트 누락', { missing, names: [...names] });

  console.log(JSON.stringify({
    ok: true,
    landingEvents: landingEvents.length,
    appEvents: appEvents.length,
    sdkTrackCalls: appSdk.filter((call) => call.type === 'track').length,
    requiredEvents: required.length
  }, null, 2));
} finally {
  await browser.close();
}
