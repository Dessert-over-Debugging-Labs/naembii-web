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
    feedbackVisible: getComputedStyle(document.querySelector('.app-feedback-btn')).display,
    recipeCardMeta: [...document.querySelectorAll('#home #popScroll .rcard .cap small, #home #recScroll .rcard .cap small, #home #trendScroll .rcard .cap small')].map((item) => item.textContent.trim())
  })`);

  const search = await evaluate(`(async () => {
    localStorage.removeItem('naembi.recentSearches.v1');
    openSearch();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const initial = {
      active: document.querySelector('.view.active')?.id || '',
      recipeCards: document.querySelectorAll('#searchPage .rcard').length,
      fixedSuggestions: document.querySelectorAll('#searchPage .search-chip-group').length,
      emptyText: document.getElementById('recentSearches')?.textContent.trim() || ''
    };
    const startInput = document.getElementById('recipeSearchInput');
    startInput.value = '명란 파스타';
    startInput.dispatchEvent(new Event('input', { bubbles: true }));
    startInput.closest('form').requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 220));
    const nativeCancelRulePresent = [...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) =>
      rule.selectorText?.includes('::-webkit-search-cancel-button') &&
      rule.style.display === 'none' &&
      (rule.style.webkitAppearance === 'none' || rule.style.appearance === 'none')
    ));
    const submitted = {
      active: document.querySelector('.view.active')?.id || '',
      query: document.getElementById('searchQueryLabel')?.textContent.trim() || '',
      recipeCount: document.querySelectorAll('#searchResults .rcard').length,
      nativeCancelRulePresent,
      visibleCustomClearCount: [...document.querySelectorAll('#searchResultsPage .search-live button[id$="ClearBtn"]')].filter((button) => getComputedStyle(button).display !== 'none').length
    };
    openSearch();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const recentAfterSubmit = [...document.querySelectorAll('.recent-search-query span')].map((item) => item.textContent.trim());
    executeRecipeSearch('Maangchi');
    await new Promise((resolve) => setTimeout(resolve, 220));
    const creatorRows = [...document.querySelectorAll('#creatorResults .creator-row')].map((row) => row.textContent.trim().replace(/\\s+/g, ' '));
    const recipeCards = [...document.querySelectorAll('#searchResults .rcard')].map((card) => ({
      title: card.querySelector('.cap b')?.textContent.trim() || '',
      meta: card.querySelector('.cap small')?.textContent.trim() || ''
    }));
    const resultActive = document.querySelector('.view.active')?.id || '';
    const creatorHeadVisible = document.getElementById('creatorResultHead').classList.contains('show');
    openSearch();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const recentBeforeDelete = [...document.querySelectorAll('.recent-search-query span')].map((item) => item.textContent.trim());
    document.querySelector('.recent-search-remove')?.click();
    const recentAfterDelete = [...document.querySelectorAll('.recent-search-query span')].map((item) => item.textContent.trim());
    clearRecentSearches();
    const recentAfterClear = readRecentSearches();
    return {
      initial,
      submitted,
      recentAfterSubmit,
      resultActive,
      creatorHeadVisible,
      creatorRows,
      recipeCards,
      recentBeforeDelete,
      recentAfterDelete,
      recentAfterClear
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

  const recipeNotes = await evaluate(`(async () => {
    localStorage.removeItem(LOCAL_RECIPE_NOTE_KEY);
    currentRecipe = recipeById('vlPqkuHIdCc');
    show('complete');
    await new Promise((resolve) => setTimeout(resolve, 220));
    openRecipeReview();
    await new Promise((resolve) => setTimeout(resolve, 120));
    setRecipeReviewRating(4.5);
    document.querySelector('#recipeReviewForm textarea[name="message"]').value = '치즈는 1분 더 녹이니 더 좋았어요.';
    document.querySelector('#recipeReviewForm button[type="submit"]').click();
    await new Promise((resolve) => setTimeout(resolve, 880));
    const reviewSaved = localNotesFor(currentRecipe.id, 'review').length;
    const reviewRating = localNotesFor(currentRecipe.id, 'review')[0]?.rating || 0;
    showTipWrite();
    await new Promise((resolve) => setTimeout(resolve, 160));
    document.querySelectorAll('#tipTags button')[1].click();
    document.querySelector('#tipForm textarea[name="message"]').value = '모짜렐라 대신 체다를 쓰면 설탕을 조금 줄이는 게 좋아요.';
    document.querySelector('#tipForm button[type="submit"]').click();
    await new Promise((resolve) => setTimeout(resolve, 900));
    const tipSaved = localNotesFor(currentRecipe.id, 'tip').length;
    const activeAfterTip = document.querySelector('.view.active')?.id || '';
    const doneSavedText = document.getElementById('doneSavedNotes')?.textContent || '';
    show('detail');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const detailText = document.getElementById('detTipPreview').textContent + document.getElementById('detReviewPreview').textContent;
    const proofText = document.getElementById('detProof').textContent;
    const tipPreviewText = document.getElementById('detTipPreview').textContent;
    const reviewPreviewText = document.getElementById('detReviewPreview').textContent;
    const reviewPreviewColumns = getComputedStyle(document.querySelector('.detail-review-list')).gridTemplateColumns.split(' ').filter(Boolean).length;
    show('tips');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const tipsText = document.getElementById('tipsList').textContent;
    show('reviews');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const reviewsText = document.getElementById('reviewsList').textContent;
    show('home');
    await new Promise((resolve) => setTimeout(resolve, 180));
    const communityText = document.getElementById('communityStrip').textContent;
    show('complete');
    await new Promise((resolve) => setTimeout(resolve, 120));
    const doneButtons = [...document.querySelectorAll('#complete .done-record-actions button,#complete .done-actions button,#complete .done-next button')].map((button) => button.textContent.trim());
    const donePrimaryIconCount = document.querySelectorAll('#complete .done-next:not(.secondary) button svg').length;
    document.querySelector('#complete .done-next button').click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    return {
      reviewSaved,
      reviewRating,
      tipSaved,
      activeAfterTip,
      doneSavedText,
      detailText,
      proofText,
      tipPreviewText,
      reviewPreviewText,
      reviewPreviewColumns,
      tipsText,
      reviewsText,
      communityText,
      doneButtons,
      donePrimaryIconCount,
      activeAfterHome: document.querySelector('.view.active')?.id || ''
    };
  })()`);

  const accountNotification = await evaluate(`(async () => {
    show('home');
    await new Promise((resolve) => setTimeout(resolve, 120));
    document.querySelector('[aria-label="게스트 계정 보기"]').click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const account = {
      active: document.querySelector('.view.active')?.id || '',
      text: document.getElementById('accountPlan').textContent
    };
    show('home');
    await new Promise((resolve) => setTimeout(resolve, 120));
    document.querySelector('.noti').click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const notification = {
      active: document.querySelector('.view.active')?.id || '',
      text: document.getElementById('notificationPlan').textContent
    };
    document.querySelector('#notificationPlan .plan-actions .btn').click();
    await new Promise((resolve) => setTimeout(resolve, 160));
    const modal = {
      open: document.getElementById('feedbackModal').classList.contains('show'),
      title: document.getElementById('feedbackTitle').textContent,
      source: document.querySelector('#feedbackForm input[name="source"]').value
    };
    closeFeedback();
    return { account, notification, modal };
  })()`);

  const timer = await evaluate(`(async () => {
    show('cook3');
    hideCookHint();
    await new Promise((resolve) => setTimeout(resolve, 200));
    openTimer();
    const minInput = document.getElementById('tsMin');
    const secInput = document.getElementById('tsSec');
    minInput.value = '7';
    secInput.value = '20';
    tsInputChanged();
    document.querySelector('.ts-sec-adjusts button:nth-child(2)').click();
    const minUnderline = getComputedStyle(minInput).borderBottomWidth;
    const secUnderline = getComputedStyle(secInput).borderBottomWidth;
    document.querySelector('#timerSheet .btn').click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const startedTotal = timerTotal;
    cancelStageTimer();
    openTimer();
    document.querySelector('.ts-presets button:nth-child(4)').click();
    document.querySelector('.ts-sec-adjusts button:nth-child(3)').click();
    const presetPlusThirty = tsDraftSeconds;
    closeTimer();
    const originalAutoStop = timerAlarmAutoStopMs;
    const originalRepeat = timerAlarmRepeatMs;
    timerAlarmAutoStopMs = 1500;
    timerAlarmRepeatMs = 450;
    window.__timerAlarmPlayed = 0;
    window.__timerAlarmToneStarts = 0;
    startUnifiedTimer(1, false);
    await new Promise((resolve) => setTimeout(resolve, 1620));
    const alarmPlayed = window.__timerAlarmPlayed || 0;
    const alarmToneStarts = window.__timerAlarmToneStarts || 0;
    const ringingAfterFinish = document.getElementById('stageTimer').classList.contains('ringing');
    const timerRect = document.getElementById('stageTimer').getBoundingClientRect();
    const videoRect = document.querySelector('#cook3 .cook-video').getBoundingClientRect();
    const progressRect = document.querySelector('#cook3 .cook-progress').getBoundingClientRect();
    const timerBelowVideo = timerRect.top >= videoRect.bottom - 1;
    const timerAboveProgress = timerRect.bottom <= progressRect.top + 1;
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const alarmAutoStopped = !document.getElementById('stageTimer').classList.contains('ringing');
    const doneText = document.getElementById('stageTimerTime').textContent;
    timerAlarmAutoStopMs = originalAutoStop;
    timerAlarmRepeatMs = originalRepeat;
    cancelStageTimer();
    return {
      timerText: doneText,
      startedTotal,
      presetPlusThirty,
      minUnderline,
      secUnderline,
      alarmPlayed,
      alarmToneStarts,
      ringingAfterFinish,
      alarmAutoStopped,
      timerBelowVideo,
      timerAboveProgress
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

  const settings = await evaluate(`(async () => {
    show('cook3');
    hideCookHint();
    await new Promise((resolve) => setTimeout(resolve, 160));
    openVideoSettings();
    setVsMasterVol(80);
    const master = {
      value: document.getElementById('vsMasterVolVal')?.textContent || '',
      range: document.getElementById('vsMasterVolRange')?.value || '',
      switchOn: document.getElementById('vsMasterVolSw')?.classList.contains('on') || false,
      volumeRowCount: document.querySelectorAll('#videoSettings .vset-volume-row').length,
      singleLineRows: [...document.querySelectorAll('#videoSettings .vset-volume-row')].every((row) => {
        const children = [...row.children].map((child) => child.getBoundingClientRect());
        return children.every((rect) => rect.top >= row.getBoundingClientRect().top && rect.bottom <= row.getBoundingClientRect().bottom);
      })
    };
    setVsVol(42);
    const videoVolume = {
      value: document.getElementById('vsVolVal')?.textContent || '',
      state: vsVol,
      switchOn: document.getElementById('vsVolSw')?.classList.contains('on') || false,
      effective: effectiveOutputVolume(vsVol)
    };
    toggleVsVol();
    toggleVsVol();
    const videoRestored = {
      value: document.getElementById('vsVolVal')?.textContent || '',
      state: vsVol,
      switchOn: document.getElementById('vsVolSw')?.classList.contains('on') || false
    };
    setVsVoiceVol(35);
    const voice = {
      title: document.querySelector('#videoSettings .vset-head b')?.textContent.trim() || '',
      value: document.getElementById('vsVoiceVolVal')?.textContent || '',
      range: document.getElementById('vsVoiceVolRange')?.value || '',
      switchOn: document.getElementById('vsVoiceVolSw')?.classList.contains('on') || false,
      gain: Number(assistantVolumeGain().toFixed(2))
    };
    toggleVsVoiceVol();
    const muted = {
      disabled: document.getElementById('vsVoiceVolRange')?.disabled || false,
      value: document.getElementById('vsVoiceVolVal')?.textContent || '',
      switchOn: document.getElementById('vsVoiceVolSw')?.classList.contains('on') || false,
      gain: assistantVolumeGain()
    };
    toggleVsVoiceVol();
    const restored = {
      value: document.getElementById('vsVoiceVolVal')?.textContent || '',
      switchOn: document.getElementById('vsVoiceVolSw')?.classList.contains('on') || false,
      gain: Number(assistantVolumeGain().toFixed(2))
    };
    setVsTimerVol(25);
    const timerVolume = {
      value: document.getElementById('vsTimerVolVal')?.textContent || '',
      switchOn: document.getElementById('vsTimerVolSw')?.classList.contains('on') || false,
      gain: Number(timerVolumeGain().toFixed(2))
    };
    toggleVsTimerVol();
    const timerMuted = {
      disabled: document.getElementById('vsTimerVolRange')?.disabled || false,
      value: document.getElementById('vsTimerVolVal')?.textContent || '',
      gain: timerVolumeGain()
    };
    toggleVsTimerVol();
    toggleVsMasterVol();
    const masterMuted = {
      disabled: document.getElementById('vsMasterVolRange')?.disabled || false,
      value: document.getElementById('vsMasterVolVal')?.textContent || '',
      assistantGain: assistantVolumeGain(),
      timerGain: timerVolumeGain(),
      videoVolume: effectiveOutputVolume(vsVol)
    };
    toggleVsMasterVol();
    setVsSpeed(1);
    adjustVsSpeed(-1);
    const slower = {
      value: document.getElementById('vsSpeedVal')?.textContent || '',
      active: document.querySelector('#vsSpeed .vchip.on')?.textContent.trim() || '',
      downDisabled: document.getElementById('vsSpeedDown')?.disabled || false,
      upDisabled: document.getElementById('vsSpeedUp')?.disabled || false
    };
    adjustVsSpeed(-1);
    const slowest = {
      value: document.getElementById('vsSpeedVal')?.textContent || '',
      active: document.querySelector('#vsSpeed .vchip.on')?.textContent.trim() || '',
      downDisabled: document.getElementById('vsSpeedDown')?.disabled || false
    };
    closeVideoSettings();
    return { master, videoVolume, videoRestored, voice, muted, restored, timerVolume, timerMuted, masterMuted, slower, slowest };
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
    const cardRectAfterHide = card.getBoundingClientRect();
    const cardShiftAfterHide = Math.abs(cardRectAfterHide.top - cardRect.top);
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
      cardShiftAfterHide: Number(cardShiftAfterHide.toFixed(2)),
      reopensAfterClose,
      hiddenAfterNever
    };
  })()`);

  const assistant = await evaluate(`(async () => {
    show('cook3');
    hideCookHint();
    await new Promise((resolve) => setTimeout(resolve, 180));
    toggleHf3();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const opened = {
      panel: document.getElementById('vpanel').className,
      user: document.getElementById('vpUser').textContent,
      answer: document.getElementById('vpAi').textContent,
      liveStatus: document.getElementById('vpLiveStatus').textContent,
      promptInputExists: !!document.getElementById('vpPromptInput'),
      inputModeText: document.querySelector('.vp-input-mode')?.textContent.trim().replace(/\\s+/g, ' ') || '',
      handleExpanded: document.getElementById('vpSizeHandle').getAttribute('aria-expanded'),
      ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height),
      queuedTimers: vpTimers.length,
      activeStep: document.querySelector('#cookTrack3 .scard.active')?.dataset.i
    };
    document.getElementById('vpSizeHandle').click();
    await new Promise((resolve) => setTimeout(resolve, 160));
    const longAnswer = Array(10).fill('양념이 타는 것 같으면 불을 한 단계 낮추고 팬 가장자리의 양념을 가운데로 모아주세요. 물이나 면수를 한 숟갈씩 넣어 농도를 풀고, 재료는 한 번에 많이 뒤집지 말고 천천히 섞으면 좋아요.').join(' ');
    document.getElementById('vpUser').textContent = '질문이 길어져도 읽을 수 있어?';
    document.getElementById('vpAi').textContent = longAnswer;
    await new Promise((resolve) => setTimeout(resolve, 240));
    const vpScroll = document.getElementById('vpScroll');
    const scrollBefore = vpScroll.scrollTop;
    vpScroll.scrollTop = vpScroll.scrollHeight;
    await new Promise((resolve) => setTimeout(resolve, 60));
    const resized = {
      panel: document.getElementById('vpanel').className,
      handleExpanded: document.getElementById('vpSizeHandle').getAttribute('aria-expanded'),
      handleValue: document.getElementById('vpSizeHandle').getAttribute('aria-valuenow'),
      ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height),
      ctrlHasExpandedClass: document.getElementById('cook3Ctrl').classList.contains('vpanel-expanded'),
      scrollClientHeight: vpScroll.clientHeight,
      scrollHeight: vpScroll.scrollHeight,
      scrollTopAfter: vpScroll.scrollTop,
      scrollOverflowY: getComputedStyle(vpScroll).overflowY,
      scrollMoved: vpScroll.scrollTop > scrollBefore
    };
    const handle = document.getElementById('vpSizeHandle');
    const rect = handle.getBoundingClientRect();
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientY: rect.top + 12 }));
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientY: rect.top + 92 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientY: rect.top + 92 }));
    await new Promise((resolve) => setTimeout(resolve, 240));
    const intermediate = {
      ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height),
      handleValue: document.getElementById('vpSizeHandle').getAttribute('aria-valuenow')
    };
    const originalPostCookYoutube = postCookYoutube;
    window.__ytVolumeCommands = [];
    postCookYoutube = (func, args) => {
      if (func === 'setVolume') window.__ytVolumeCommands.push(args?.[0]);
      return true;
    };
    cookYoutubeMuted = false;
    window.__vpVideoDuckEvents = 0;
    window.__vpVideoDuckRestores = 0;
    setVsVol(80);
    const beforePromptStep = document.querySelector('#cookTrack3 .scard.active')?.dataset.i;
    document.querySelector('#vpQuick button').click();
    await new Promise((resolve) => setTimeout(resolve, 780));
    const ducked = {
      commands: [...window.__ytVolumeCommands],
      duckEvents: window.__vpVideoDuckEvents || 0,
      restores: window.__vpVideoDuckRestores || 0,
      answerClass: document.getElementById('vpanel').className
    };
    await new Promise((resolve) => setTimeout(resolve, 2600));
    const restored = {
      commands: [...window.__ytVolumeCommands],
      duckEvents: window.__vpVideoDuckEvents || 0,
      restores: window.__vpVideoDuckRestores || 0,
      currentVolumeSetting: vsVol,
      user: document.getElementById('vpUser').textContent,
      answer: document.getElementById('vpAi').textContent
    };
    postCookYoutube = originalPostCookYoutube;
    return {
      opened,
      resized,
      intermediate,
      panel: document.getElementById('vpanel').className,
      user: document.getElementById('vpUser').textContent,
      answer: document.getElementById('vpAi').textContent,
      quickCount: document.querySelectorAll('#vpQuick button').length,
      beforePromptStep,
      ducked,
      restored,
      activeStep: document.querySelector('#cookTrack3 .scard.active')?.dataset.i
    };
  })()`);

  const result = { home, search, feedback, recipeNotes, accountNotification, timer, ingredients, settings, tutorial, assistant };
  console.log(JSON.stringify(result, null, 2));

  if (home.marketing || home.active !== 'home') {
    throw new Error('/app 모바일 진입이 홈 화면으로 열리지 않았습니다.');
  }
  if (home.feedbackVisible === 'none') {
    throw new Error('앱 내부 피드백 버튼이 보이지 않습니다.');
  }
  if (!home.recipeCardMeta.length || home.recipeCardMeta.some((meta) => meta.includes('인분'))) {
    throw new Error('홈 레시피 카드에서 인분 표시가 제거되지 않았습니다.');
  }
  if (search.initial.active !== 'searchPage' || search.initial.recipeCards !== 0 || search.initial.fixedSuggestions !== 0 || !search.initial.emptyText.includes('아직 검색한 요리가 없어요')) {
    throw new Error('검색 시작 화면이 최근 검색 전용 상태로 열리지 않았습니다.');
  }
  if (search.submitted.active !== 'searchResultsPage' || !search.submitted.query.includes('명란 파스타') || search.submitted.recipeCount < 1) {
    throw new Error('검색 제출 후 별도 결과 목록 화면으로 이동하지 않았습니다.');
  }
  if (!search.submitted.nativeCancelRulePresent || search.submitted.visibleCustomClearCount !== 1) {
    throw new Error('검색 입력에 X 아이콘이 중복 표시될 수 있습니다.');
  }
  if (!search.recentAfterSubmit.includes('명란 파스타') || search.recentBeforeDelete[0] !== 'Maangchi') {
    throw new Error('최근 검색어가 최신순으로 저장되지 않았습니다.');
  }
  if (search.resultActive !== 'searchResultsPage' || !search.creatorHeadVisible || !search.creatorRows.some((row) => row.includes('Maangchi'))) {
    throw new Error('Maangchi 검색이 크리에이터 결과로 분리되지 않았습니다.');
  }
  if (search.recipeCards.length < 1 || !search.recipeCards.every((card) => card.title && !/^Maangchi$/i.test(card.title))) {
    throw new Error('크리에이터 검색의 요리 결과가 실제 레시피 카드로 표시되지 않았습니다.');
  }
  if (!search.recipeCards.every((card) => card.meta.includes('인분'))) {
    throw new Error('검색 결과 카드의 인분 정보가 함께 제거됐습니다.');
  }
  if (search.recentAfterDelete.includes('Maangchi') || search.recentAfterClear.length !== 0) {
    throw new Error('최근 검색어 개별 삭제 또는 전체 삭제가 저장소에 반영되지 않았습니다.');
  }
  if (!feedback.modalOpen || !feedback.requests.some((request) => request.url.endsWith('/api/feedback'))) {
    throw new Error('피드백 제출이 /api/feedback으로 이어지지 않았습니다.');
  }
  if (!feedback.status.includes('접수')) {
    throw new Error('피드백 제출 성공 메시지가 표시되지 않았습니다.');
  }
  if (recipeNotes.reviewSaved < 1 || recipeNotes.tipSaved < 1) {
    throw new Error('요리 후기와 조리 팁이 로컬 저장소에 저장되지 않았습니다.');
  }
  if (recipeNotes.reviewRating !== 4.5) {
    throw new Error('요리 후기 별점이 0.5점 단위로 저장되지 않았습니다.');
  }
  if (recipeNotes.activeAfterTip !== 'complete' || !recipeNotes.doneSavedText.includes('치즈는 1분 더') || !recipeNotes.doneSavedText.includes('체다')) {
    throw new Error('완료 화면에서 후기·팁 저장 후 결과를 이어서 확인할 수 없습니다.');
  }
  if (!recipeNotes.detailText.includes('조리 팁') || !recipeNotes.detailText.includes('최근 후기') || !recipeNotes.detailText.includes('완전 성공') || !recipeNotes.detailText.includes('체다') || !recipeNotes.proofText.includes('후기') || !recipeNotes.proofText.includes('팁')) {
    throw new Error('상세의 분리된 후기·팁 영역에서 저장 결과가 보이지 않습니다.');
  }
  if (!recipeNotes.tipPreviewText.includes('전체보기') || !recipeNotes.tipsText.includes('체다') || !recipeNotes.reviewPreviewText.includes('전체보기') || recipeNotes.reviewPreviewColumns !== 2 || !recipeNotes.reviewsText.includes('치즈는 1분 더') || !recipeNotes.communityText.includes('게스트 저장')) {
    throw new Error('팁·후기 전체보기 또는 최근 후기 2열 미리보기가 올바르게 동작하지 않습니다.');
  }
  if (!recipeNotes.doneButtons.includes('홈으로 가기') || !recipeNotes.doneButtons.includes('후기 남기기') || !recipeNotes.doneButtons.includes('팁 남기기') || recipeNotes.donePrimaryIconCount !== 2 || recipeNotes.activeAfterHome !== 'home') {
    throw new Error('완료 화면의 홈 이동과 요리 후기 액션이 동작하지 않았습니다.');
  }
  if (accountNotification.account.active !== 'accountPlan' || !accountNotification.account.text.includes('게스트로') || !accountNotification.account.text.includes('이 브라우저')) {
    throw new Error('홈 계정 아이콘이 게스트 저장 안내 화면으로 연결되지 않았습니다.');
  }
  if (accountNotification.notification.active !== 'notificationPlan' || !accountNotification.notification.text.includes('영상 링크') || !accountNotification.notification.text.includes('알림')) {
    throw new Error('홈 알림 아이콘이 영상 링크/알림 예정 화면으로 연결되지 않았습니다.');
  }
  if (!accountNotification.modal.open || accountNotification.modal.source !== 'notification-recipe-request' || !accountNotification.modal.title.includes('영상')) {
    throw new Error('알림 예정 화면의 영상 제보하기가 레시피 요청 모달로 이어지지 않았습니다.');
  }
  if (timer.startedTotal !== 450) {
    throw new Error('타이머 직접 입력 7분 20초와 +10초 조정이 반영되지 않았습니다.');
  }
  if (timer.presetPlusThirty !== 630) {
    throw new Error('타이머 10분 상태에서 +30초 조정이 10분 30초로 반영되지 않았습니다.');
  }
  if (!parseFloat(timer.minUnderline) || !parseFloat(timer.secUnderline)) {
    throw new Error('타이머 직접 입력 가능 상태를 보여주는 밑줄 affordance가 없습니다.');
  }
  if (!timer.ringingAfterFinish || timer.timerText !== '완료' || timer.alarmPlayed < 2 || timer.alarmToneStarts < 2) {
    throw new Error('타이머 완료 시 알림 상태와 알림음 호출이 확인되지 않았습니다.');
  }
  if (!timer.alarmAutoStopped) {
    throw new Error('타이머 완료 알림이 지정 시간 뒤 자동으로 멈추지 않았습니다.');
  }
  if (!timer.timerBelowVideo || !timer.timerAboveProgress) {
    throw new Error('타이머가 조리 영상 바로 아래 독립 영역에 배치되지 않았습니다.');
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
  if (settings.master.value !== '80' || settings.master.range !== '80' || !settings.master.switchOn || settings.master.volumeRowCount !== 4 || !settings.master.singleLineRows) {
    throw new Error('마스터·영상·요리비서·타이머 볼륨이 한 줄형 설정으로 표시되지 않았습니다.');
  }
  if (!settings.voice.title.includes('소리·재생') || settings.voice.value !== '35' || settings.voice.range !== '35' || settings.voice.gain !== 0.28) {
    throw new Error('소리·재생 설정의 요리비서 볼륨이 반영되지 않았습니다.');
  }
  if (settings.videoVolume.value !== '42' || settings.videoVolume.state !== 42 || settings.videoVolume.effective !== 34 || !settings.videoVolume.switchOn || settings.videoRestored.state !== 42 || !settings.videoRestored.switchOn) {
    throw new Error('영상 볼륨 설정값이 음소거/복구 뒤에도 유지되지 않았습니다.');
  }
  if (!settings.muted.disabled || settings.muted.value !== 'OFF' || settings.muted.switchOn || settings.muted.gain !== 0 || !settings.restored.switchOn || settings.restored.gain !== 0.28) {
    throw new Error('요리비서 볼륨 스위치가 음소거/복구 상태를 반영하지 못했습니다.');
  }
  if (settings.timerVolume.value !== '25' || !settings.timerVolume.switchOn || settings.timerVolume.gain !== 0.2 || !settings.timerMuted.disabled || settings.timerMuted.value !== 'OFF' || settings.timerMuted.gain !== 0) {
    throw new Error('타이머 알림음 볼륨과 음소거 상태가 독립적으로 반영되지 않았습니다.');
  }
  if (!settings.masterMuted.disabled || settings.masterMuted.value !== 'OFF' || settings.masterMuted.assistantGain !== 0 || settings.masterMuted.timerGain !== 0 || settings.masterMuted.videoVolume !== 0) {
    throw new Error('마스터 볼륨 음소거가 전체 출력에 반영되지 않았습니다.');
  }
  if (settings.slower.value !== '0.75×' || settings.slower.active !== '0.75×' || settings.slower.downDisabled || settings.slower.upDisabled) {
    throw new Error('재생속도 - 조절이 0.75× 단계로 동작하지 않았습니다.');
  }
  if (settings.slowest.value !== '0.5×' || settings.slowest.active !== '0.5×' || !settings.slowest.downDisabled) {
    throw new Error('재생속도 최저 단계와 - 버튼 비활성화가 동작하지 않았습니다.');
  }
  if (!tutorial.visible || !tutorial.insideCookBody || tutorial.screenCoverage > 0.2 || tutorial.overlapRatio > 0.35) {
    throw new Error('조리 튜토리얼이 화면 내부 패널로 보이지 않거나 조리 카드를 과하게 가립니다.');
  }
  if (tutorial.cardShiftAfterHide > 1) {
    throw new Error('스와이프 안내를 닫을 때 현재 조리 단계 카드 위치가 움직입니다.');
  }
  if (!tutorial.reopensAfterClose || !tutorial.hiddenAfterNever) {
    throw new Error('조리 튜토리얼 다시 보기/다시 보지 않기 흐름이 동작하지 않습니다.');
  }
  if (!assistant.opened.panel.includes('open') || assistant.opened.queuedTimers !== 0 || assistant.opened.activeStep !== '0') {
    throw new Error('요리비서 패널이 열리자마자 자동 대화/단계 진행을 시작했습니다.');
  }
  if (assistant.opened.user.trim() || !assistant.opened.answer.includes('말하기')) {
    throw new Error('요리비서 대기 상태 안내가 표시되지 않았습니다.');
  }
  if (!assistant.opened.liveStatus.includes('마이크 OFF')) {
    throw new Error('요리비서 마이크 OFF 상태가 표시되지 않았습니다.');
  }
  if (assistant.opened.promptInputExists || !assistant.opened.inputModeText.includes('음성 또는 추천 질문')) {
    throw new Error('요리비서 패널이 직접 입력 대신 음성/준비 질문 흐름으로 보이지 않습니다.');
  }
  if (assistant.opened.handleExpanded !== 'false' || assistant.resized.handleExpanded !== 'true' || !assistant.resized.ctrlHasExpandedClass || assistant.resized.ctrlHeight < assistant.opened.ctrlHeight + 90) {
    throw new Error('요리비서 패널 크기 조절 바가 기본/확장 상태를 전환하지 못했습니다.');
  }
  if (assistant.intermediate.ctrlHeight >= assistant.resized.ctrlHeight - 20 || assistant.intermediate.ctrlHeight <= assistant.opened.ctrlHeight + 20) {
    throw new Error('요리비서 패널 드래그가 중간 높이에 머물지 못했습니다.');
  }
  if (!/auto|scroll/.test(assistant.resized.scrollOverflowY) || assistant.resized.scrollHeight <= assistant.resized.scrollClientHeight || !assistant.resized.scrollMoved) {
    throw new Error('요리비서 긴 답변이 패널 내부에서 스크롤되지 않습니다.');
  }
  if (assistant.quickCount < 3 || assistant.beforePromptStep !== '0' || assistant.activeStep !== '0' || !assistant.user.trim() || !assistant.answer.trim()) {
    throw new Error('요리비서 추천 질문 선택이 답변으로 이어지지 않았습니다.');
  }
  const expectedRestoredVideoVolume = Math.round(assistant.restored.currentVolumeSetting * Number(settings.master.value) / 100);
  if (new Set(assistant.ducked.commands).size < 4 || !assistant.ducked.commands.some((value) => value > 0 && value < expectedRestoredVideoVolume) || new Set(assistant.restored.commands).size < 6 || !assistant.restored.commands.includes(expectedRestoredVideoVolume) || assistant.restored.currentVolumeSetting !== 80 || assistant.restored.restores < assistant.ducked.restores + 1) {
    throw new Error('요리비서 답변 중 영상 볼륨 낮춤과 복구가 확인되지 않았습니다.');
  }
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
