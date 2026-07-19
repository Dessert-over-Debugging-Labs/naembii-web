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
    const originalFetch = window.fetch;
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
    const result = {
      modalOpen,
      requests: window.__feedbackRequests,
      status: document.querySelector('#feedbackForm [data-status]')?.textContent || '',
      button: document.querySelector('#feedbackForm button[type="submit"]')?.textContent.trim() || ''
    };
    window.fetch = originalFetch;
    return result;
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
    timerAlarmAutoStopMs = 700;
    window.__timerAlarmPlayed = 0;
    startUnifiedTimer(1, false);
    await new Promise((resolve) => setTimeout(resolve, 1120));
    const alarmPlayed = window.__timerAlarmPlayed || 0;
    const ringingAfterFinish = document.getElementById('stageTimer').classList.contains('ringing');
    await new Promise((resolve) => setTimeout(resolve, 850));
    const alarmAutoStopped = !document.getElementById('stageTimer').classList.contains('ringing');
    const doneText = document.getElementById('stageTimerTime').textContent;
    timerAlarmAutoStopMs = originalAutoStop;
    cancelStageTimer();
    return {
      timerText: doneText,
      startedTotal,
      presetPlusThirty,
      minUnderline,
      secUnderline,
      alarmPlayed,
      ringingAfterFinish,
      alarmAutoStopped
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
    setVsVol(42);
    const videoVolume = {
      value: document.getElementById('vsVolVal')?.textContent || '',
      state: vsVol,
      switchOn: document.getElementById('vsVolSw')?.classList.contains('on') || false
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
      collapsed: document.getElementById('vsVoiceVolWrap')?.classList.contains('collapsed') || false,
      switchOn: document.getElementById('vsVoiceVolSw')?.classList.contains('on') || false,
      gain: assistantVolumeGain()
    };
    toggleVsVoiceVol();
    const restored = {
      value: document.getElementById('vsVoiceVolVal')?.textContent || '',
      switchOn: document.getElementById('vsVoiceVolSw')?.classList.contains('on') || false,
      gain: Number(assistantVolumeGain().toFixed(2))
    };
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
    return { videoVolume, videoRestored, voice, muted, restored, slower, slowest };
  })()`);

  const cookRestart = await evaluate(`(async () => {
    show('cook3');
    hideCookHint();
    await new Promise((resolve) => setTimeout(resolve, 160));
    cook3Car.goTo(2);
    cook3Time = 87;
    cookYoutubeEnded = true;
    cookYoutubeLastReportedTime = 86;
    cookYoutubeAutoplayStarted = true;
    cook3Playing = true;
    startUnifiedTimer(90, false);
    openIngredients('check');
    openTimer();
    openVideoSettings();
    toggleHf3({ startLive: false });
    if (!vsLoopOn) toggleVsLoop();
    setVsLoopCount(2, document.querySelector('#vsLoopCount .vchip[data-loop="2"]'));
    setVsLoopEnd('next', document.querySelector('#vsLoopEnd .vchip[data-loop-end="next"]'));
    setVsSpeed(1.5);
    await new Promise((resolve) => setTimeout(resolve, 160));
    show('detail');
    await new Promise((resolve) => setTimeout(resolve, 140));
    startCook();
    await new Promise((resolve) => setTimeout(resolve, 260));
    return {
      active: document.querySelector('.view.active')?.id || '',
      activeStep: document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '',
      currentStep: cook3CurrentStep,
      cookTime: cook3Time,
      playing: cook3Playing,
      ended: cookYoutubeEnded,
      autoplayStarted: cookYoutubeAutoplayStarted,
      timerTotal,
      timerLeft,
      timerVisible: document.getElementById('stageTimer').classList.contains('show'),
      ingredientsOpen: document.getElementById('ingSheet').classList.contains('show'),
      timerSheetOpen: document.getElementById('timerSheet').classList.contains('show'),
      settingsOpen: document.getElementById('videoSettings').classList.contains('show'),
      voicePanelOpen: document.getElementById('vpanel').classList.contains('open'),
      voiceModalOpen: document.getElementById('voiceModal').classList.contains('show'),
      loopOn: vsLoopOn,
      loopCount: vsLoopCount,
      loopEnd: vsLoopEnd,
      speed: vsSpeed,
      hintVisible: document.getElementById('cookHint').classList.contains('show')
    };
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
    const originalFetch = window.fetch;
    const OriginalWebSocket = window.WebSocket;
    const OriginalAudioContext = window.AudioContext;
    const OriginalWebkitAudioContext = window.webkitAudioContext;
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
    const originalEnumerateDevices = navigator.mediaDevices?.enumerateDevices;
    const originalPostCookYoutube = postCookYoutube;
    let microphoneRequests = 0;
    const requestedDeviceIds = [];
    const tokenPayloads = [];
    const tracePayloads = [];
    const makeMicrophoneStream = (deviceId = 'mic-built-in') => {
      const label = deviceId === 'mic-usb' ? 'USB Studio Microphone' : 'MacBook Microphone';
      const listeners = new Map();
      const track = {
        readyState: 'live',
        enabled: true,
        muted: false,
        label,
        getSettings() { return { deviceId, sampleRate: 48000, channelCount: 1 }; },
        addEventListener(type, callback) { listeners.set(type, callback); },
        stop() { this.readyState = 'ended'; listeners.get('ended')?.(); }
      };
      return {
        getTracks() { return [track]; },
        getAudioTracks() { return [track]; }
      };
    };
    window.__geminiMessages = [];
    window.__geminiAudioSources = [];
    window.__youtubeCommands = [];
    postCookYoutube = (func, args) => {
      window.__youtubeCommands.push({ func, args: [...(args || [])] });
      return true;
    };
    class FakeAudioContext {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.sampleRate = 24000;
        this.destination = {};
      }
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createScriptProcessor() { return { connect() {}, disconnect() {}, onaudioprocess: null }; }
      createBuffer(_channels, length, rate) { return { duration: length / rate, copyToChannel() {} }; }
      createBufferSource() {
        const source = {
          buffer: null,
          onended: null,
          connect() {},
          start(startAt) { this.startAt = startAt; window.__geminiAudioSources.push(this); },
          stop() { this.onended?.(); }
        };
        return source;
      }
      close() { this.state = 'closed'; return Promise.resolve(); }
      resume() { return Promise.resolve(); }
    }
    class FakeGeminiWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      constructor(url) {
        this.url = url;
        this.readyState = FakeGeminiWebSocket.CONNECTING;
        setTimeout(() => {
          this.readyState = FakeGeminiWebSocket.OPEN;
          this.onopen?.({});
        }, 0);
      }
      send(raw) {
        const message = JSON.parse(raw);
        window.__geminiMessages.push(message);
        const respond = (data) => setTimeout(() => this.onmessage?.({ data: JSON.stringify(data) }), 16);
        if (message.setup) {
          respond({ setupComplete: {} });
          respond({ sessionResumptionUpdate: { resumable: true, newHandle: 'mobile-test-resume-handle' } });
          return;
        }
        if (message.realtimeInput?.audioStreamEnd === true) {
          respond({ sessionResumptionUpdate: { resumable: true, newHandle: 'mobile-test-resume-handle' } });
          return;
        }
        const text = message.realtimeInput?.text || '';
        if (text) {
          respond({ serverContent: { inputTranscription: { text: text.replace(/^현재 조리 단계는 .*?사용자 요청: /, '') } } });
        }
        if (message.realtimeInput?.audio) {
          respond({ serverContent: { inputTranscription: { text: '음성 입력이 감지됐어요.' } } });
          respond({ serverContent: {
            outputTranscription: { text: '현재 단계에 맞춰 도와드릴게요.' },
            turnComplete: true
          } });
          return;
        }
        if (text.includes('영상 멈춰')) {
          respond({ toolCall: { functionCalls: [
            { id: 'pause-call', name: 'set_video_playback', args: { state: 'pause' } },
            { id: 'unwanted-step-call', name: 'move_cooking_step', args: { direction: 'next' } }
          ] } });
          return;
        }
        if (text.includes('왜 자꾸')) {
          respond({ toolCall: { functionCalls: [{ id: 'complaint-step-call', name: 'move_cooking_step', args: { direction: 'next' } }] } });
          return;
        }
        if (text.includes('타이머')) {
          respond({ toolCall: { functionCalls: [{ id: 'timer-call', name: 'set_cooking_timer', args: { seconds: 60 } }] } });
          return;
        }
        if (text.includes('다음 단계')) {
          respond({ toolCall: { functionCalls: [{ id: 'step-call', name: 'move_cooking_step', args: { direction: 'next' } }] } });
          return;
        }
        if (text.includes('10초 앞으로')) {
          respond({ toolCall: { functionCalls: [{ id: 'seek-call', name: 'seek_video', args: { direction: 'forward', seconds: 10 } }] } });
          return;
        }
        if (message.toolResponse) {
          const name = message.toolResponse.functionResponses[0]?.name || '';
          respond({ serverContent: {
            outputTranscription: { text: name + ' 요청을 반영했어요.' },
            turnComplete: true
          } });
          respond({ sessionResumptionUpdate: { resumable: true, newHandle: 'mobile-test-resume-handle' } });
          return;
        }
        respond({ serverContent: {
          outputTranscription: { text: '현재 단계에 맞춰 도와드릴게요.' },
          turnComplete: true
        } });
      }
      close() {
        this.readyState = FakeGeminiWebSocket.CLOSED;
        this.onclose?.({ code: 1000, reason: 'test closed' });
      }
    }
    window.fetch = (url, options) => {
      if (String(url).endsWith('/api/ai-trace')) {
        tracePayloads.push(JSON.parse(options?.body || '{}'));
        return Promise.resolve(new Response(JSON.stringify({ ok: true, storedBy: 'test' }), {
          status: 202,
          headers: { 'content-type': 'application/json' }
        }));
      }
      if (String(url).endsWith('/api/gemini-live-token')) {
        const payload = JSON.parse(options?.body || '{}');
        tokenPayloads.push(payload);
        return Promise.resolve(new Response(JSON.stringify({
          ok: true,
          token: 'auth_tokens/test-token',
          model: 'gemini-3.1-flash-live-preview',
          liveSetup: {
            model: 'models/gemini-3.1-flash-live-preview',
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { languageCode: 'ko-KR' } },
            inputAudioTranscription: { languageHints: { languageCodes: ['ko-KR', 'en-US'] } },
            outputAudioTranscription: { languageHints: { languageCodes: ['ko-KR'] } },
            realtimeInputConfig: { automaticActivityDetection: { disabled: false, silenceDurationMs: 700 } },
            sessionResumption: payload.sessionResumptionHandle ? { handle: payload.sessionResumptionHandle } : {},
            contextWindowCompression: { slidingWindow: {} },
            tools: [{ functionDeclarations: [] }]
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
      }
      return originalFetch(url, options);
    };
    window.WebSocket = FakeGeminiWebSocket;
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async (constraints) => {
        const deviceId = constraints?.audio?.deviceId?.exact || 'mic-built-in';
        microphoneRequests += 1;
        requestedDeviceIds.push(deviceId);
        return makeMicrophoneStream(deviceId);
      }
    });
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
      configurable: true,
      value: async () => [
        { kind: 'audioinput', deviceId: 'mic-built-in', label: 'MacBook Microphone' },
        { kind: 'audioinput', deviceId: 'mic-usb', label: 'USB Studio Microphone' }
      ]
    });
    try {
      toggleHf3();
      await new Promise((resolve) => setTimeout(resolve, 250));
      const openingWaveStyle = getComputedStyle(document.querySelector('.vp-input-wave'));
      const opened = {
        panel: document.getElementById('vpanel').className,
        compact: document.getElementById('vpanel').classList.contains('compact'),
        conversationUi: !document.querySelector('#vpVoiceTitle,#vpLiveStatus,#vpVoiceHint,#vpInputMeter,#vpInputSource,#vpInputDevice,.vp-listening,.vp-voice-kicker,.vp-idle-wave') && document.getElementById('vpIdleState')?.textContent.includes('무엇이 궁금해요?') && openingWaveStyle.visibility === 'hidden' && Number(openingWaveStyle.opacity) === 0,
        microphoneRequests,
        micLive: !!geminiLive?.micStream && geminiLive.micStream.getAudioTracks().every((track) => track.readyState === 'live'),
        micLabel: document.querySelector('.vp-mic')?.getAttribute('aria-label') || '',
        handleExpanded: document.getElementById('vpSizeHandle').getAttribute('aria-expanded'),
        ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height),
        activeStep: document.querySelector('#cookTrack3 .scard.active')?.dataset.i
      };
      await new Promise((resolve) => setTimeout(resolve, 80));
      await changeGeminiInputDevice('mic-usb');
      await new Promise((resolve) => setTimeout(resolve, 100));
      const deviceSwitch = {
        inputDeviceId: geminiLive?.inputDeviceId || '',
        inputDeviceLabel: geminiLive?.inputDeviceLabel || '',
        microphoneRequests,
        requestedDeviceIds: [...requestedDeviceIds],
        micLive: !!geminiLive?.micStream && geminiLive.micStream.getAudioTracks().every((track) => track.readyState === 'live'),
        sessionReady: !!geminiLive?.ready
      };
      const signal = new Float32Array(2048);
      for (let index = 0; index < signal.length; index += 1) signal[index] = Math.sin(index / 9) * 0.14;
      const streamEndsBeforeVad = window.__geminiMessages.filter((message) => message.realtimeInput?.audioStreamEnd === true).length;
      const sentBeforeSilence = geminiLive.sentAudioFrames;
      geminiLive.inputProcessor.onaudioprocess?.({ inputBuffer: { getChannelData: () => new Float32Array(2048) } });
      const silentFramesBeforeSpeech = geminiLive.sentAudioFrames - sentBeforeSilence;
      geminiLive.inputProcessor.onaudioprocess?.({ inputBuffer: { getChannelData: () => signal } });
      geminiLive.inputProcessor.onaudioprocess?.({ inputBuffer: { getChannelData: () => signal } });
      const voiceActivity = {
        panelMicActive: document.getElementById('vpanel').classList.contains('mic-active'),
        waveVisible: document.getElementById('vpanel').classList.contains('mic-active') && getComputedStyle(document.querySelector('.vp-input-wave')).display !== 'none'
      };
      await new Promise((resolve) => setTimeout(resolve, 260));
      for (let index = 0; index < 10; index += 1) {
        geminiLive.inputProcessor.onaudioprocess?.({ inputBuffer: { getChannelData: () => new Float32Array(2048) } });
      }
      const silentWaveStyle = getComputedStyle(document.querySelector('.vp-input-wave'));
      voiceActivity.waveHidesWhenSilent = !document.getElementById('vpanel').classList.contains('mic-active') && silentWaveStyle.visibility === 'hidden' && Number(silentWaveStyle.opacity) === 0;
      await new Promise((resolve) => setTimeout(resolve, 80));
      const audioTransport = {
        capturedFrames: geminiLive.capturedAudioFrames,
        sentFrames: geminiLive.sentAudioFrames,
        sentBytes: geminiLive.sentAudioBytes,
        silentFramesBeforeSpeech,
        vadStreamEnds: window.__geminiMessages.filter((message) => message.realtimeInput?.audioStreamEnd === true).length - streamEndsBeforeVad,
        inputTranscript: [...document.querySelectorAll('#vpTranscript .vp-transcript-entry')].map((entry) => entry.textContent.trim()),
        keepsCompact: document.getElementById('vpanel').classList.contains('compact'),
        ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height)
      };
      const compactScroll = document.getElementById('vpScroll');
      const compactReply = '불을 한 단계 낮추고 팬 가장자리의 양념을 가운데로 모아 주세요. 물이나 면수를 한 숟갈씩 넣어 농도를 풀고 천천히 섞으면 좋아요. '.repeat(8);
      document.getElementById('vpTranscript').classList.add('turn-pair');
      document.getElementById('vpTranscript').innerHTML = '<div class="vp-transcript-entry user"><b>나</b><span>양념이 타는 것 같아.</span></div><div class="vp-transcript-entry assistant"><b>냄비</b><span>' + compactReply + '</span></div>';
      compactScroll.classList.add('has-transcript');
      await new Promise((resolve) => setTimeout(resolve, 80));
      const compactAssistantText = document.querySelector('#vpTranscript .vp-transcript-entry.assistant span');
      const compactScrollBefore = compactAssistantText.scrollTop;
      compactAssistantText.scrollTop = compactAssistantText.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, 40));
      const compactTranscript = {
        keepsCompact: document.getElementById('vpanel').classList.contains('compact'),
        ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height),
        scrollClientHeight: compactAssistantText.clientHeight,
        scrollHeight: compactAssistantText.scrollHeight,
        scrollOverflowY: getComputedStyle(compactAssistantText).overflowY,
        scrollMoved: compactAssistantText.scrollTop > compactScrollBefore
      };
      document.getElementById('vpSizeHandle').click();
      await new Promise((resolve) => setTimeout(resolve, 160));
      const longAssistantReply = '불을 한 단계 낮추고 팬 가장자리의 양념을 가운데로 모아 주세요. 물이나 면수를 한 숟갈씩 넣어 농도를 풀고 천천히 섞으면 좋아요. '.repeat(12);
      document.getElementById('vpTranscript').classList.add('turn-pair');
      document.getElementById('vpTranscript').innerHTML = '<div class="vp-transcript-entry user"><b>나</b><span>양념이 타는 것 같아.</span></div><div class="vp-transcript-entry assistant"><b>냄비</b><span>' + longAssistantReply + '</span></div>';
      document.getElementById('vpScroll').classList.add('has-transcript');
      await new Promise((resolve) => setTimeout(resolve, 240));
      const vpScroll = document.getElementById('vpScroll');
      const expandedAssistantText = document.querySelector('#vpTranscript .vp-transcript-entry.assistant span');
      const scrollBefore = expandedAssistantText.scrollTop;
      expandedAssistantText.scrollTop = expandedAssistantText.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, 60));
      const resized = {
        panel: document.getElementById('vpanel').className,
        handleExpanded: document.getElementById('vpSizeHandle').getAttribute('aria-expanded'),
        handleValue: document.getElementById('vpSizeHandle').getAttribute('aria-valuenow'),
        ctrlHeight: Math.round(document.getElementById('cook3Ctrl').getBoundingClientRect().height),
        ctrlHasExpandedClass: document.getElementById('cook3Ctrl').classList.contains('vpanel-expanded'),
        scrollClientHeight: expandedAssistantText.clientHeight,
        scrollHeight: expandedAssistantText.scrollHeight,
        scrollTopAfter: expandedAssistantText.scrollTop,
        scrollOverflowY: getComputedStyle(expandedAssistantText).overflowY,
        scrollMoved: expandedAssistantText.scrollTop > scrollBefore
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
      const initialContextPayload = tokenPayloads.at(-1) || {};
      cook3Car.goTo(2);
      await new Promise((resolve) => setTimeout(resolve, 560));
      const contextRefresh = {
        tokenRequests: tokenPayloads.length,
        initialStep: initialContextPayload.step || '',
        refreshedStep: tokenPayloads.at(-1)?.step || '',
        refreshedNotes: tokenPayloads.at(-1)?.stepNotes || '',
        sessionResumptionHandle: tokenPayloads.at(-1)?.sessionResumptionHandle || '',
        activeStep: document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '',
        contextKey: geminiLive?.contextKey || '',
        micLive: !!geminiLive?.micStream && geminiLive.micStream.getAudioTracks().every((track) => track.readyState === 'live'),
        microphoneRequests
      };
      clearGeminiPlayback(geminiLive);
      geminiLive.responseInFlight = false;
      const outOfOrderAudioBefore = window.__geminiAudioSources.length;
      const outOfOrderCommand = createGeminiActiveCommand(geminiLive, 'audio');
      outOfOrderCommand.startedAt = Date.now() - 5000;
      outOfOrderCommand.audioEndedAt = Date.now() - 500;
      beginVpTranscriptTurn(geminiLive, { awaitingInput: true });
      const outOfOrderPcm = new Uint8Array(960);
      const outOfOrderPcmData = btoa(String.fromCharCode(...outOfOrderPcm));
      handleGeminiServerContent(geminiLive, {
        modelTurn: { parts: [{ inlineData: { data: outOfOrderPcmData, mimeType: 'audio/pcm;rate=24000' } }] },
        turnComplete: true
      });
      const outOfOrderBuffered = {
        eventCount: outOfOrderCommand.pendingServerContent?.length || 0,
        audioDelta: window.__geminiAudioSources.length - outOfOrderAudioBefore,
        completed: !!outOfOrderCommand.completed
      };
      handleGeminiServerContent(geminiLive, {
        inputTranscription: { text: '지금 단계가 어떻게 돼?' }
      });
      await new Promise((resolve) => setTimeout(resolve, 650));
      handleGeminiServerContent(geminiLive, {
        outputTranscription: { text: '전사 순서가 바뀌어도 현재 답변이에요.' }
      });
      await new Promise((resolve) => setTimeout(resolve, 1120));
      const outOfOrderResponse = {
        ...outOfOrderBuffered,
        audioDeltaAfterInput: window.__geminiAudioSources.length - outOfOrderAudioBefore,
        completedAfterInput: !!outOfOrderCommand.completed,
        userText: ensureVpTranscriptState(geminiLive).userText,
        assistantText: ensureVpTranscriptState(geminiLive).assistantText
      };
      clearGeminiPlayback(geminiLive);
      geminiLive.responseInFlight = true;
      const interruptedCommand = createGeminiActiveCommand(geminiLive, 'audio');
      interruptedCommand.audioEndedAt = Date.now() - 500;
      beginVpTranscriptTurn(geminiLive, { awaitingInput: true });
      handleGeminiServerContent(geminiLive, {
        inputTranscription: { text: '이전 턴의 늦은 전사' },
        outputTranscription: { text: '이전 턴의 늦은 답변' }
      });
      const interruptionBeforeBoundary = {
        awaiting: !!interruptedCommand.awaitingInterruptionBoundary,
        userText: ensureVpTranscriptState(geminiLive).userText,
        buffered: interruptedCommand.pendingServerContent?.length || 0
      };
      handleGeminiServerContent(geminiLive, {
        interrupted: true,
        inputTranscription: { text: '현재 발화는 그대로 보존해 줘' }
      });
      const interruptionAtBoundary = {
        userText: ensureVpTranscriptState(geminiLive).userText,
        buffered: interruptedCommand.pendingServerContent?.length || 0,
        ignoresOldTurnComplete: !!geminiLive.ignoreInterruptedTurnComplete
      };
      handleGeminiServerContent(geminiLive, { turnComplete: true });
      handleGeminiServerContent(geminiLive, {
        outputTranscription: { text: '현재 턴의 답변만 남아요.' },
        turnComplete: true
      });
      await new Promise((resolve) => setTimeout(resolve, 1120));
      const interruptionBoundary = {
        ...interruptionBeforeBoundary,
        atBoundary: interruptionAtBoundary,
        completed: !!interruptedCommand.completed,
        assistantText: ensureVpTranscriptState(geminiLive).assistantText
      };
      geminiLive.responseInFlight = true;
      const preBoundaryOnlyCommand = createGeminiActiveCommand(geminiLive, 'audio');
      preBoundaryOnlyCommand.audioEndedAt = Date.now() - 500;
      beginVpTranscriptTurn(geminiLive, { awaitingInput: true });
      handleGeminiServerContent(geminiLive, {
        inputTranscription: { text: '경계 전에 도착한 현재 발화' }
      });
      handleGeminiServerContent(geminiLive, { interrupted: true });
      const preBoundaryOnlyAtInterruption = {
        userText: ensureVpTranscriptState(geminiLive).userText,
        trusted: preBoundaryOnlyCommand.inputTranscriptTrusted
      };
      handleGeminiServerContent(geminiLive, { turnComplete: true });
      handleGeminiServerContent(geminiLive, {
        outputTranscription: { text: '현재 응답은 보존됐어요.' },
        turnComplete: true
      });
      await new Promise((resolve) => setTimeout(resolve, 1120));
      const preBoundaryOnlyInput = {
        ...preBoundaryOnlyAtInterruption,
        completed: !!preBoundaryOnlyCommand.completed,
        assistantText: ensureVpTranscriptState(geminiLive).assistantText
      };
      const partialSpeechStepBefore = document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '';
      createGeminiActiveCommand(geminiLive, 'audio');
      beginVpTranscriptTurn(geminiLive, { awaitingInput: true });
      geminiLive.vadSpeaking = true;
      updateVpTranscript(geminiLive, 'user', '다음 단계로 넘어가 줘 그런데 아직 말하는 중이야');
      handleGeminiToolCall(geminiLive, { functionCalls: [
        { id: 'partial-step-call', name: 'move_cooking_step', args: { direction: 'next' } }
      ] });
      await new Promise((resolve) => setTimeout(resolve, 3800));
      geminiLive.vadSpeaking = false;
      const partialSpeechStepAfter = document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '';
      const lateTranscriptStepBefore = partialSpeechStepAfter;
      createGeminiActiveCommand(geminiLive, 'audio');
      geminiLive.activeCommand.audioEndedAt = Date.now();
      beginVpTranscriptTurn(geminiLive, { awaitingInput: true });
      updateVpTranscript(geminiLive, 'user', '다음 단계로 넘어가 줘');
      handleGeminiToolCall(geminiLive, { functionCalls: [
        { id: 'late-transcript-step-call', name: 'move_cooking_step', args: { direction: 'next' } }
      ] });
      await new Promise((resolve) => setTimeout(resolve, 180));
      updateVpTranscript(geminiLive, 'user', '다음 단계로 넘어가 줘라고 한 게 아니야');
      await new Promise((resolve) => setTimeout(resolve, 520));
      const lateTranscriptStepAfter = document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '';
      const sendVoiceIntent = async (text) => {
        sendGeminiLiveMessage(geminiLive, { realtimeInput: { text } });
        await new Promise((resolve) => setTimeout(resolve, 220));
      };
      document.getElementById('vpTranscript').replaceChildren();
      await sendVoiceIntent('타이머 1분 맞춰줘');
      const timerTotalAfterTool = timerTotal;
      const afterTimerStep = document.querySelector('#cookTrack3 .scard.active')?.dataset.i;
      const beforePauseStep = document.querySelector('#cookTrack3 .scard.active')?.dataset.i;
      await sendVoiceIntent('영상 멈춰 줘');
      const afterPauseStep = document.querySelector('#cookTrack3 .scard.active')?.dataset.i;
      await sendVoiceIntent('다음 단계로 왜 자꾸 이동하는 거야?');
      const afterComplaintStep = document.querySelector('#cookTrack3 .scard.active')?.dataset.i;
      await sendVoiceIntent('다음 단계로 넘어가줘');
      await new Promise((resolve) => setTimeout(resolve, 520));
      const afterNextStep = document.querySelector('#cookTrack3 .scard.active')?.dataset.i;
      const timeBeforeSeek = cook3Time;
      await sendVoiceIntent('영상 10초 앞으로 움직여줘');
      const timeAfterSeek = cook3Time;
      const transcript = [...document.querySelectorAll('#vpTranscript .vp-transcript-entry')].map((entry) => entry.textContent.trim());
      const toolResponseBatches = window.__geminiMessages.filter((message) => message.toolResponse).map((message) => message.toolResponse.functionResponses || []);
      const toolResponses = toolResponseBatches.flat().map((response) => response?.name || '');
      const unwantedMoveResponse = toolResponseBatches.flat().find((response) => response?.id === 'unwanted-step-call')?.response || {};
      const complaintMoveResponse = toolResponseBatches.flat().find((response) => response?.id === 'complaint-step-call')?.response || {};
      const partialSpeechResponse = toolResponseBatches.flat().find((response) => response?.id === 'partial-step-call')?.response || {};
      const lateTranscriptResponse = toolResponseBatches.flat().find((response) => response?.id === 'late-transcript-step-call')?.response || {};
      setVsVol(42);
      window.__youtubeCommands.length = 0;
      const sourceStart = window.__geminiAudioSources.length;
      const pcm = new Uint8Array(960);
      const pcmData = btoa(String.fromCharCode(...pcm));
      scheduleGeminiPcm(geminiLive, { data: pcmData, mimeType: 'audio/pcm;rate=24000' });
      scheduleGeminiPcm(geminiLive, { data: pcmData, mimeType: 'audio/pcm;rate=24000' });
      const duckSources = window.__geminiAudioSources.slice(sourceStart);
      const duckedVolume = window.__youtubeCommands.filter((command) => command.func === 'setVolume').at(-1)?.args?.[0];
      duckSources[0]?.onended?.();
      const staysDucked = cookYoutubeDucked;
      const volumeAfterFirstChunk = window.__youtubeCommands.filter((command) => command.func === 'setVolume').at(-1)?.args?.[0];
      duckSources[1]?.onended?.();
      const restoredVolume = window.__youtubeCommands.filter((command) => command.func === 'setVolume').at(-1)?.args?.[0];
      const ducking = { duckedVolume, staysDucked, volumeAfterFirstChunk, restoredVolume, finalDucked: cookYoutubeDucked };
      cancelStageTimer();
      return {
        opened,
        deviceSwitch,
        audioTransport,
        compactTranscript,
        voiceActivity,
        resized,
        intermediate,
        contextRefresh,
        outOfOrderResponse,
        interruptionBoundary,
        preBoundaryOnlyInput,
        partialSpeechStepBefore,
        partialSpeechStepAfter,
        partialSpeechResponse,
        lateTranscriptStepBefore,
        lateTranscriptStepAfter,
        lateTranscriptResponse,
        ducking,
        panel: document.getElementById('vpanel').className,
        afterTimerStep,
        beforePauseStep,
        afterPauseStep,
        afterComplaintStep,
        afterNextStep,
        timerTotalAfterTool,
        timeBeforeSeek,
        timeAfterSeek,
        transcript,
        toolResponses,
        unwantedMoveResponse,
        complaintMoveResponse,
        tracePayloads
      };
    } finally {
      hf3Reset();
      postCookYoutube = originalPostCookYoutube;
      window.fetch = originalFetch;
      window.WebSocket = OriginalWebSocket;
      window.AudioContext = OriginalAudioContext;
      window.webkitAudioContext = OriginalWebkitAudioContext;
      if (originalGetUserMedia) {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
          configurable: true,
          value: originalGetUserMedia
        });
      }
      if (originalEnumerateDevices) {
        Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
          configurable: true,
          value: originalEnumerateDevices
        });
      }
    }
  })()`);

  const result = { home, search, feedback, timer, ingredients, settings, cookRestart, tutorial, assistant };
  console.log(JSON.stringify(result, null, 2));

  if (home.marketing || home.active !== 'home') {
    throw new Error('/app 모바일 진입이 홈 화면으로 열리지 않았습니다.');
  }
  if (home.feedbackVisible === 'none') {
    throw new Error('앱 내부 피드백 버튼이 보이지 않습니다.');
  }
  if (search.active !== 'searchPage' || !search.creatorHeadVisible || !search.creatorRows.some((row) => row.includes('Maangchi'))) {
    throw new Error('Maangchi 검색이 크리에이터 결과로 분리되지 않았습니다.');
  }
  if (search.foodChipTexts.includes('Maangchi') || !search.creatorChipTexts.includes('Maangchi')) {
    throw new Error('크리에이터 빠른 검색어가 요리 칩과 분리되지 않았습니다.');
  }
  if (search.recipeCards.length < 1 || !search.recipeCards.every((card) => card.title && !/^Maangchi$/i.test(card.title))) {
    throw new Error('크리에이터 검색의 요리 결과가 실제 레시피 카드로 표시되지 않았습니다.');
  }
  if (!feedback.modalOpen || !feedback.requests.some((request) => request.url.endsWith('/api/feedback'))) {
    throw new Error('피드백 제출이 /api/feedback으로 이어지지 않았습니다.');
  }
  if (!feedback.status.includes('접수')) {
    throw new Error('피드백 제출 성공 메시지가 표시되지 않았습니다.');
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
  if (!timer.ringingAfterFinish || timer.timerText !== '완료' || timer.alarmPlayed < 1) {
    throw new Error('타이머 완료 시 알림 상태와 알림음 호출이 확인되지 않았습니다.');
  }
  if (!timer.alarmAutoStopped) {
    throw new Error('타이머 완료 알림이 지정 시간 뒤 자동으로 멈추지 않았습니다.');
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
  if (!settings.voice.title.includes('소리·재생') || settings.voice.value !== '35' || settings.voice.range !== '35' || settings.voice.gain !== 0.35) {
    throw new Error('소리·재생 설정의 요리비서 볼륨이 반영되지 않았습니다.');
  }
  if (settings.videoVolume.value !== '42' || settings.videoVolume.state !== 42 || !settings.videoVolume.switchOn || settings.videoRestored.state !== 42 || !settings.videoRestored.switchOn) {
    throw new Error('영상 볼륨 설정값이 음소거/복구 뒤에도 유지되지 않았습니다.');
  }
  if (!settings.muted.collapsed || settings.muted.switchOn || settings.muted.gain !== 0 || !settings.restored.switchOn || settings.restored.gain !== 0.35) {
    throw new Error('요리비서 볼륨 스위치가 음소거/복구 상태를 반영하지 못했습니다.');
  }
  if (settings.slower.value !== '0.75×' || settings.slower.active !== '0.75×' || settings.slower.downDisabled || settings.slower.upDisabled) {
    throw new Error('재생속도 - 조절이 0.75× 단계로 동작하지 않았습니다.');
  }
  if (settings.slowest.value !== '0.5×' || settings.slowest.active !== '0.5×' || !settings.slowest.downDisabled) {
    throw new Error('재생속도 최저 단계와 - 버튼 비활성화가 동작하지 않았습니다.');
  }
  if (cookRestart.active !== 'cook3' || cookRestart.activeStep !== '0' || cookRestart.currentStep !== 0 || cookRestart.cookTime !== 0) {
    throw new Error(`상세에서 다시 요리 시작 시 첫 단계 초기 화면으로 돌아가지 않습니다: ${JSON.stringify(cookRestart)}`);
  }
  if (cookRestart.timerTotal !== 0 || cookRestart.timerLeft !== 0 || cookRestart.timerVisible || cookRestart.ingredientsOpen || cookRestart.timerSheetOpen || cookRestart.settingsOpen || cookRestart.voicePanelOpen || cookRestart.voiceModalOpen) {
    throw new Error(`상세에서 다시 요리 시작 시 이전 조리 오버레이가 남아 있습니다: ${JSON.stringify(cookRestart)}`);
  }
  if (cookRestart.loopOn || cookRestart.loopCount !== 0 || cookRestart.loopEnd !== 'stop' || cookRestart.speed !== 1 || cookRestart.playing || cookRestart.ended || cookRestart.autoplayStarted || !cookRestart.hintVisible) {
    throw new Error(`상세에서 다시 요리 시작 시 영상/반복 상태가 초기화되지 않았습니다: ${JSON.stringify(cookRestart)}`);
  }
  if (!tutorial.visible || !tutorial.insideCookBody || tutorial.screenCoverage > 0.2 || tutorial.overlapRatio > 0.35) {
    throw new Error('조리 튜토리얼이 화면 내부 패널로 보이지 않거나 조리 카드를 과하게 가립니다.');
  }
  if (!tutorial.reopensAfterClose || !tutorial.hiddenAfterNever) {
    throw new Error('조리 튜토리얼 다시 보기/다시 보지 않기 흐름이 동작하지 않습니다.');
  }
  if (!assistant.opened.panel.includes('open') || !assistant.opened.compact || assistant.opened.ctrlHeight > 170 || assistant.opened.activeStep !== '0') {
    throw new Error('요리비서 패널이 열리지 않았거나 조리 단계를 변경했습니다.');
  }
  if (!assistant.opened.conversationUi || assistant.opened.microphoneRequests < 1 || !assistant.opened.micLive || !assistant.opened.micLabel.includes('음소거')) {
    throw new Error('요리 비서 버튼이 마이크 권한과 Gemini Live 음성 세션을 즉시 시작하지 않았습니다.');
  }
  if (assistant.deviceSwitch.inputDeviceId !== 'mic-usb' || !assistant.deviceSwitch.inputDeviceLabel.includes('USB Studio Microphone') || assistant.deviceSwitch.microphoneRequests < 2 || !assistant.deviceSwitch.requestedDeviceIds.includes('mic-usb') || !assistant.deviceSwitch.micLive || !assistant.deviceSwitch.sessionReady) {
    throw new Error('입력 장치 전환과 Live 세션 유지를 확인하지 못했습니다.');
  }
  if (assistant.audioTransport.capturedFrames < 3 || assistant.audioTransport.sentFrames < 2 || assistant.audioTransport.sentBytes < 100 || assistant.audioTransport.silentFramesBeforeSpeech !== 0 || assistant.audioTransport.vadStreamEnds < 1 || !assistant.audioTransport.inputTranscript.some((line) => line.includes('음성 입력')) || !assistant.audioTransport.keepsCompact || assistant.audioTransport.ctrlHeight > assistant.opened.ctrlHeight + 2) {
    throw new Error('마이크 PCM 입력과 Gemini 전사 표시가 함께 동작하지 않습니다.');
  }
  if (!assistant.compactTranscript.keepsCompact || assistant.compactTranscript.ctrlHeight > assistant.opened.ctrlHeight + 2 || !/auto|scroll/.test(assistant.compactTranscript.scrollOverflowY) || assistant.compactTranscript.scrollHeight <= assistant.compactTranscript.scrollClientHeight || !assistant.compactTranscript.scrollMoved) {
    throw new Error('요리비서 전사가 고정 높이 패널 안에서 스크롤되지 않습니다.');
  }
  if (!assistant.voiceActivity.panelMicActive || !assistant.voiceActivity.waveVisible || !assistant.voiceActivity.waveHidesWhenSilent) {
    throw new Error('사용자 음성 입력 중 요동치는 파형이 표시되지 않습니다.');
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
  if (assistant.contextRefresh.tokenRequests < 2 || !assistant.contextRefresh.initialStep.includes('1/5') || !assistant.contextRefresh.refreshedStep.includes('3/5') || !assistant.contextRefresh.refreshedNotes.includes('양파') || assistant.contextRefresh.sessionResumptionHandle !== 'mobile-test-resume-handle' || assistant.contextRefresh.activeStep !== '2' || !assistant.contextRefresh.contextKey.includes(':cooking:3') || !assistant.contextRefresh.micLive || assistant.contextRefresh.microphoneRequests !== assistant.deviceSwitch.microphoneRequests) {
    throw new Error('조리 단계 이동 뒤 Gemini Live 프롬프트를 현재 단계로 재연결하지 못했습니다.');
  }
  if (assistant.outOfOrderResponse.eventCount < 1 || assistant.outOfOrderResponse.audioDelta !== 0 || assistant.outOfOrderResponse.completed || assistant.outOfOrderResponse.audioDeltaAfterInput < 1 || !assistant.outOfOrderResponse.completedAfterInput || !assistant.outOfOrderResponse.userText.includes('지금 단계') || !assistant.outOfOrderResponse.assistantText.includes('전사 순서')) {
    throw new Error('입력 전사보다 먼저 온 Gemini 응답을 안전하게 보관했다가 현재 턴에 복원하지 못했습니다.');
  }
  if (!assistant.interruptionBoundary.awaiting || assistant.interruptionBoundary.userText || assistant.interruptionBoundary.buffered < 1 || !assistant.interruptionBoundary.atBoundary.userText.includes('현재 발화') || assistant.interruptionBoundary.atBoundary.buffered !== 0 || !assistant.interruptionBoundary.atBoundary.ignoresOldTurnComplete || !assistant.interruptionBoundary.completed || assistant.interruptionBoundary.assistantText.includes('이전 턴') || !assistant.interruptionBoundary.assistantText.includes('현재 턴')) {
    throw new Error('Gemini interruption 경계에서 이전 턴 전사·응답을 버리고 현재 턴만 보존하지 못했습니다.');
  }
  if (!assistant.preBoundaryOnlyInput.userText.includes('경계 전에 도착한 현재 발화') || assistant.preBoundaryOnlyInput.trusted !== false || !assistant.preBoundaryOnlyInput.completed || !assistant.preBoundaryOnlyInput.assistantText.includes('현재 응답')) {
    throw new Error('interrupted보다 먼저 온 경계 전 전사를 기록하되 도구 실행용으로 신뢰하지 못했습니다.');
  }
  if (assistant.afterTimerStep !== '2' || assistant.timerTotalAfterTool !== 60 || assistant.afterNextStep !== '3') {
    throw new Error('Gemini Live 타이머/다음 단계 tool call이 기존 조리 함수로 연결되지 않았습니다.');
  }
  const blockedToolCodes = ['TOOL_INTENT_MISMATCH', 'NON_COMMAND_UTTERANCE', 'USER_UTTERANCE_NOT_FINAL'];
  if (assistant.afterPauseStep !== assistant.beforePauseStep || assistant.afterComplaintStep !== assistant.beforePauseStep || !blockedToolCodes.includes(assistant.unwantedMoveResponse.code) || !blockedToolCodes.includes(assistant.complaintMoveResponse.code)) {
    throw new Error('사용자가 요청하지 않은 조리 단계 도구 호출이 실행되었습니다.');
  }
  if (assistant.partialSpeechStepAfter !== assistant.partialSpeechStepBefore || assistant.partialSpeechResponse.code !== 'USER_UTTERANCE_NOT_FINAL') {
    throw new Error('음성 발화가 끝나기 전에 조리 단계 도구가 실행되었습니다.');
  }
  if (assistant.lateTranscriptStepAfter !== assistant.lateTranscriptStepBefore || assistant.lateTranscriptResponse.code !== 'NON_COMMAND_UTTERANCE') {
    throw new Error('VAD 종료 직후 늦게 도착한 부정 전사보다 먼저 조리 단계 도구가 실행되었습니다.');
  }
  if (assistant.timeAfterSeek < assistant.timeBeforeSeek + 10) {
    throw new Error('Gemini Live 영상 이동 tool call이 기존 영상 제어 함수로 연결되지 않았습니다.');
  }
  if (assistant.transcript.length !== 2 || !assistant.transcript[0].includes('나영상 10초 앞으로 움직여줘') || !assistant.transcript[1].includes('냄비seek_video 요청을 반영했어요.')) {
    throw new Error('요리비서 전사가 현재 사용자 발화와 AI 답변 한 쌍만 유지하지 못했습니다.');
  }
  if (assistant.ducking.duckedVolume !== 25 || !assistant.ducking.staysDucked || assistant.ducking.volumeAfterFirstChunk !== 25 || assistant.ducking.restoredVolume !== 42 || assistant.ducking.finalDucked) {
    throw new Error('Gemini 음성 재생 중 영상 소리 자동 감소 및 복구가 동작하지 않았습니다.');
  }
  for (const name of ['set_cooking_timer', 'move_cooking_step', 'seek_video']) {
    if (!assistant.toolResponses.includes(name)) {
      throw new Error(`Gemini Live ${name} tool response가 전송되지 않았습니다.`);
    }
  }
  if (assistant.tracePayloads.length < 6 || assistant.tracePayloads.some((payload) => !payload.turnId || !payload.sessionId || !payload.visitorId || !payload.sessionStartedAt || !payload.userText || !Number.isInteger(payload.turnNumber) || !['completed', 'interrupted', 'abandoned'].includes(payload.turnStatus))) {
    throw new Error('Gemini Live 완료 턴이 Langfuse payload로 전송되지 않았습니다.');
  }
  const traceSessions = new Set(assistant.tracePayloads.map((payload) => payload.sessionId));
  if (traceSessions.size !== 1 || new Set(assistant.tracePayloads.map((payload) => payload.turnId)).size !== assistant.tracePayloads.length) {
    throw new Error('Langfuse 턴이 하나의 세션으로 묶이지 않거나 turnId가 중복됩니다.');
  }
  const orderedTurnNumbers = assistant.tracePayloads.map((payload) => payload.turnNumber);
  if (new Set(assistant.tracePayloads.map((payload) => payload.visitorId)).size !== 1 || orderedTurnNumbers.some((number, index) => index > 0 && number <= orderedTurnNumbers[index - 1])) {
    throw new Error('Langfuse 가명 사용자 또는 대화 턴 순서가 일관되지 않습니다.');
  }
  const moveTrace = assistant.tracePayloads.find((payload) => payload.userText.includes('다음 단계'));
  if (!moveTrace || moveTrace.stepIndex !== 3 || moveTrace.totalSteps !== 5 || !moveTrace.recipe.includes('순두부찌개')) {
    throw new Error('Langfuse 턴에 질문 시점의 레시피·조리 단계가 보존되지 않았습니다.');
  }
  const pauseTrace = assistant.tracePayloads.find((payload) => payload.userText.includes('영상 멈춰'));
  if (!pauseTrace || !pauseTrace.toolCalls?.some((call) => call.name === 'set_video_playback' && call.allowed) || !pauseTrace.toolCalls?.some((call) => call.name === 'move_cooking_step' && !call.allowed)) {
    throw new Error('Langfuse 턴에 실행·차단된 도구 결정이 함께 기록되지 않았습니다.');
  }
  if (assistant.tracePayloads.some((payload) => ['audio', 'inlineData', 'pendingPcm', 'resumeReplay'].some((key) => Object.hasOwn(payload, key)))) {
    throw new Error('Langfuse payload에 원본 오디오 데이터가 포함됐습니다.');
  }
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
