import { spawn } from 'node:child_process';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = (process.argv[2] || 'http://127.0.0.1:4876').replace(/\/+$/, '');
const port = Number(process.argv[3] || 9473);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required',
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/naembi-gemini-reconnect-${Date.now()}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

async function json(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return response.json();
}

async function pageTarget() {
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
let nextId = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
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

// This is installed before app.html runs. It keeps the test independent from a
// real Gemini credential and gives the page a server-controlled disconnect.
const browserHarness = String.raw`(() => {
  const nativeFetch = window.fetch.bind(window);
  const harness = window.__geminiReconnectHarness = {
    tokenRequests: [],
    traceRequests: [],
    sockets: [],
    tokenCount: 0,
    handle: 'test-resume-handle-1',
    rejectNextResume: false
  };

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.pathname === '/api/ai-trace') {
      try { harness.traceRequests.push(JSON.parse(String(init.body || '{}'))); } catch {}
      return new Response(JSON.stringify({ ok: true }), { status: 202, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname !== '/api/gemini-live-token') return nativeFetch(input, init);
    let body = {};
    try { body = JSON.parse(String(init.body || '{}')); } catch {}
    harness.tokenRequests.push(body);
    const number = ++harness.tokenCount;
    return new Response(JSON.stringify({
      ok: true,
      configured: true,
      token: 'test-token-' + number,
      model: 'test-live-model',
      liveSetup: {
        model: 'models/test-live-model',
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { languageCode: 'ko-KR' } },
        systemInstruction: { parts: [{ text: 'Deterministic browser reconnect test.' }] },
        inputAudioTranscription: { languageHints: { languageCodes: ['ko-KR', 'en-US'] } },
        outputAudioTranscription: { languageHints: { languageCodes: ['ko-KR'] } },
        sessionResumption: body.sessionResumptionHandle ? { handle: body.sessionResumptionHandle } : {},
        contextWindowCompression: { slidingWindow: {} }
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
      this.url = String(url);
      this.readyState = FakeWebSocket.CONNECTING;
      this.sent = [];
      this.closeInfo = null;
      this.listeners = new Map();
      this.number = harness.sockets.push(this);
      setTimeout(() => {
        if (this.readyState !== FakeWebSocket.CONNECTING) return;
        this.readyState = FakeWebSocket.OPEN;
        this.dispatch('open', { target: this });
      }, 10);
    }

    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(callback);
    }

    removeEventListener(type, callback) {
      this.listeners.get(type)?.delete(callback);
    }

    dispatch(type, event) {
      const handler = this['on' + type];
      if (typeof handler === 'function') handler.call(this, event);
      for (const callback of this.listeners.get(type) || []) callback.call(this, event);
    }

    send(value) {
      if (this.readyState !== FakeWebSocket.OPEN) throw new Error('Fake WebSocket is not open');
      const raw = String(value);
      let message;
      try { message = JSON.parse(raw); } catch { message = raw; }
      this.sent.push(message);
      if (message?.setup) {
        if (harness.rejectNextResume && message.setup.sessionResumption?.handle) {
          harness.rejectNextResume = false;
          setTimeout(() => this.serverClose(1008, ''), 10);
          return;
        }
        setTimeout(() => this.serverMessage({ setupComplete: {} }), 10);
        if (this.number === 1) {
          setTimeout(() => this.serverMessage({
            sessionResumptionUpdate: { resumable: true, newHandle: harness.handle }
          }), 20);
        }
        return;
      }
      if (message?.realtimeInput?.audioStreamEnd === true) {
        setTimeout(() => this.serverMessage({
          sessionResumptionUpdate: { resumable: true, newHandle: harness.handle }
        }), 20);
      }
    }

    serverMessage(message) {
      if (this.readyState !== FakeWebSocket.OPEN) return;
      this.dispatch('message', { data: JSON.stringify(message), target: this });
    }

    serverClose(code = 1006, reason = 'simulated network drop') {
      if (this.readyState >= FakeWebSocket.CLOSING) return;
      this.readyState = FakeWebSocket.CLOSED;
      this.closeInfo = { code, reason, server: true };
      this.dispatch('close', { code, reason, wasClean: false, target: this });
    }

    close(code = 1000, reason = '') {
      if (this.readyState >= FakeWebSocket.CLOSING) return;
      this.readyState = FakeWebSocket.CLOSED;
      this.closeInfo = { code, reason, server: false };
      this.dispatch('close', { code, reason, wasClean: code === 1000, target: this });
    }
  }

  window.WebSocket = FakeWebSocket;
})();`;

try {
  ws = new WebSocket(await pageTarget());
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
  await send('Page.addScriptToEvaluateOnNewDocument', { source: browserHarness });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await send('Page.navigate', { url: `${baseUrl}/app` });
  await delay(1800);

  const result = await evaluate(`(async () => {
    const harness = window.__geminiReconnectHarness;
    const waitFor = async (predicate, timeout, label) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error(label);
    };
    const pcm = (sample) => {
      // The AudioWorklet emits roughly 64 ms chunks at the 16 kHz target rate.
      const values = new Int16Array(1024);
      values.fill(sample);
      return values.buffer;
    };
    const sentMessages = (socket) => socket.sent.filter((message) => message && typeof message === 'object');
    const audioMessages = (socket) => sentMessages(socket).filter((message) => message.realtimeInput?.audio?.data);
    const audioStreamEnds = (socket) => sentMessages(socket).filter((message) => message.realtimeInput?.audioStreamEnd === true);
    const firstPcmSample = (message) => {
      const binary = atob(message.realtimeInput.audio.data);
      if (binary.length < 2) return null;
      const value = binary.charCodeAt(0) | (binary.charCodeAt(1) << 8);
      return value >= 0x8000 ? value - 0x10000 : value;
    };
    const feed = async (live, sample, level, count, interval = 25) => {
      for (let index = 0; index < count; index += 1) {
        sendGeminiPcm(live, pcm(sample), level);
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    };
    const finishUtterance = async (live, sample) => {
      const deadline = Date.now() + 2400;
      while (Date.now() < deadline) {
        sendGeminiPcm(live, pcm(sample), 0.0001);
        await new Promise((resolve) => setTimeout(resolve, 80));
        const socket = harness.sockets.at(-1);
        if (audioStreamEnds(socket).length) return;
      }
      throw new Error('VAD가 발화 종료 후 audioStreamEnd를 보내지 않았습니다.');
    };

    try {
      show('cook3');
      hideCookHint();
      await new Promise((resolve) => setTimeout(resolve, 180));
      toggleHf3();
      await waitFor(
        () => geminiLive?.ready && geminiLive?.micStream && harness.sockets.length === 1,
        8000,
        '첫 Gemini Live/microphone 연결이 준비되지 않았습니다.'
      );

      const live = geminiLive;
      const stream = live.micStream;
      const track = stream.getAudioTracks()[0];
      const firstSocket = harness.sockets[0];
      const transcriptLines = () => [...document.querySelectorAll('#vpTranscript .vp-transcript-entry')]
        .map((entry) => entry.textContent.trim());
      const activeCookStep = () => document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '';

      handleGeminiServerContent(live, {
        inputTranscription: {
          text: 'Aí é que tá o calcanhar de Aquiles. A receita é o jeito.',
          languageCode: 'pt-BR'
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 80));
      const afterForeignTranscript = {
        lines: transcriptLines(),
        notice: document.getElementById('vpNotice')?.textContent || '',
        unsupportedCount: live.unsupportedTranscriptCount || 0
      };
      handleGeminiServerContent(live, {
        inputTranscription: {
          text: '안녕.',
          languageCode: 'pt-BR'
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 80));
      const afterMisclassifiedKoreanTranscript = transcriptLines();
      handleGeminiServerContent(live, {
        inputTranscription: {
          text: '옥수수 콘 4큰술',
          languageCode: 'ko-KR'
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 80));
      const afterKoreanTranscript = transcriptLines();
      const transcriptLanguageGuard = {
        rejectedForeign: !afterForeignTranscript.lines.some((line) => /Aquiles|Aí|receita/.test(line)),
        noticeShown: /잘 못 들었어요/.test(afterForeignTranscript.notice),
        acceptedMisclassifiedKorean: afterMisclassifiedKoreanTranscript.some((line) => line.includes('안녕')),
        acceptedKorean: afterKoreanTranscript.some((line) => line.includes('옥수수 콘 4큰술')),
        unsupportedCount: afterForeignTranscript.unsupportedCount
      };
      live.transcript = null;
      clearVpTranscript();
      clearVpNotice();

      cook3Car.goTo(0);
      document.getElementById('vpanel')?.classList.add('open', 'compact', 'mic-active');
      const vpScroll = document.getElementById('vpScroll');
      const vpTranscript = document.getElementById('vpTranscript');
      const longReply = '냄비가 불을 한 단계 낮추고 팬 가장자리의 양념을 가운데로 모아 달라고 안내해요. '.repeat(12);
      vpScroll.classList.add('has-transcript');
      vpTranscript.classList.add('turn-pair');
      vpTranscript.replaceChildren(
        createVpTranscriptEntry('user', '양념이 타는 것 같아.'),
        createVpTranscriptEntry('assistant', longReply)
      );
      await new Promise((resolve) => setTimeout(resolve, 80));
      const assistantSpan = document.querySelector('#vpTranscript .vp-transcript-entry.assistant span');
      const stepBeforePanelGesture = activeCookStep();
      assistantSpan.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 180 }));
      await new Promise((resolve) => setTimeout(resolve, 80));
      const stepAfterPanelWheel = activeCookStep();
      assistantSpan.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 11, clientY: 340 }));
      assistantSpan.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 11, clientY: 230 }));
      assistantSpan.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 11, clientY: 230 }));
      await new Promise((resolve) => setTimeout(resolve, 80));
      const stepAfterPanelDrag = activeCookStep();
      const transcriptScrollIsolation = {
        assistantScrollable: assistantSpan.scrollHeight > assistantSpan.clientHeight,
        stepBeforePanelGesture,
        stepAfterPanelWheel,
        stepAfterPanelDrag,
        stageUnchanged: stepBeforePanelGesture === stepAfterPanelWheel && stepBeforePanelGesture === stepAfterPanelDrag
      };
      vpTranscript.replaceChildren();
      vpTranscript.classList.remove('turn-pair', 'assistant-only');
      vpScroll.classList.remove('has-transcript');
      document.getElementById('vpanel')?.classList.remove('mic-active');

      // Make PCM input deterministic while leaving the real fake-media track live.
      if (live.inputProcessor?.port) live.inputProcessor.port.onmessage = null;
      if (live.inputProcessor) live.inputProcessor.onaudioprocess = null;
      if (live.inputMonitorFrame) cancelAnimationFrame(live.inputMonitorFrame);
      live.inputMonitorFrame = null;
      try { live.inputSource?.disconnect(live.inputProcessor); } catch {}
      if (typeof resetGeminiLocalVad === 'function') resetGeminiLocalVad(live);

      await waitFor(
        () => live.sessionResumptionHandle === harness.handle,
        1500,
        'sessionResumptionUpdate의 handle이 저장되지 않았습니다.'
      );

      firstSocket.serverClose();
      await new Promise((resolve) => setTimeout(resolve, 120));
      const micAfterClose = {
        sameLive: geminiLive === live,
        sameStream: geminiLive?.micStream === stream,
        sameTrack: geminiLive?.micStream?.getAudioTracks?.()[0] === track,
        trackState: track?.readyState || '',
        trackEnabled: track?.enabled !== false,
        audioContextState: live.audioContext?.state || ''
      };

      await waitFor(
        () => harness.sockets.length >= 2 && geminiLive === live && geminiLive?.ready,
        8000,
        'WebSocket 종료 뒤 Gemini Live transport가 자동 재연결되지 않았습니다.'
      );
      const secondSocket = harness.sockets[1];
      const secondSetup = sentMessages(secondSocket).find((message) => message.setup)?.setup || null;
      const tokenRequestsAfterReconnect = harness.tokenRequests.length;
      const reconnectTokenPayload = harness.tokenRequests[1] || {};
      if (typeof resetGeminiLocalVad === 'function') resetGeminiLocalVad(live);
      secondSocket.sent = secondSocket.sent.filter((message) =>
        !message?.realtimeInput?.audio?.data && message?.realtimeInput?.audioStreamEnd !== true
      );

      // Low-level PCM should only fill the local pre-roll and must not be sent.
      await feed(live, 1111, 0.0001, 4);
      const audioBeforeSpeech = audioMessages(secondSocket).length;

      // The speech edge flushes pre-roll, then the silence edge flushes the turn.
      await feed(live, 2222, 0.08, 7);
      await finishUtterance(live, 900);
      const firstUtteranceMessages = audioMessages(secondSocket);
      const firstUtteranceSamples = firstUtteranceMessages.map(firstPcmSample);
      const firstEndCount = audioStreamEnds(secondSocket).length;
      await waitFor(
        () => live.resumeCheckpointSafe && !live.resumeReplay?.length,
        1500,
        '첫 발화 뒤 안전한 session checkpoint를 받지 못했습니다.'
      );

      // Simulate a five-minute idle gap without making the test wait five minutes.
      live.lastAudioAt = Date.now() - 5 * 60 * 1000;
      live.lastNonSilentAt = Date.now() - 5 * 60 * 1000;
      live.inputLevel = 0;
      // A later utterance must wake the same assistant without a button press.
      await feed(live, 3333, 0.0001, 4);
      const audioCountBeforeSecondSpeech = audioMessages(secondSocket).length;
      await feed(live, 4444, 0.08, 7);
      const secondEndDeadline = Date.now() + 2400;
      while (Date.now() < secondEndDeadline && audioStreamEnds(secondSocket).length < firstEndCount + 1) {
        sendGeminiPcm(live, pcm(800), 0.0001);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      const finalAudioMessages = audioMessages(secondSocket);
      const finalSamples = finalAudioMessages.map(firstPcmSample);
      const finalEndCount = audioStreamEnds(secondSocket).length;
      await waitFor(
        () => live.resumeCheckpointSafe && !live.resumeReplay?.length,
        1500,
        '장시간 무음 뒤 발화의 안전한 session checkpoint를 받지 못했습니다.'
      );

      // A BFCache-style page suspension releases hardware, but it must retain
      // the logical session handle and reconnect without another button press.
      const boundaryCommand = live.activeCommand || createGeminiActiveCommand(live, 'audio');
      boundaryCommand.awaitingInterruptionBoundary = true;
      boundaryCommand.completed = false;
      const bfcacheHide = typeof PageTransitionEvent === 'function'
        ? new PageTransitionEvent('pagehide', { persisted: true })
        : Object.assign(new Event('pagehide'), { persisted: true });
      window.dispatchEvent(bfcacheHide);
      await waitFor(
        () => geminiLive === live && !live.micStream && !live.ready,
        1500,
        'pagehide에서 마이크 하드웨어를 안전하게 놓지 못했습니다.'
      );
      const pageSuspend = {
        sameLive: geminiLive === live,
        handle: live.sessionResumptionHandle,
        micReleased: !live.micStream,
        boundaryCleared: !boundaryCommand.awaitingInterruptionBoundary,
        commandInvalidated: !!boundaryCommand.completed
      };
      window.dispatchEvent(new Event('pageshow'));
      await waitFor(
        () => harness.sockets.length >= 3 && geminiLive === live && live.ready && live.micStream?.getAudioTracks?.()[0]?.readyState === 'live',
        8000,
        'pageshow에서 마이크와 Gemini Live 연결이 자동 복구되지 않았습니다.'
      );
      const thirdSocket = harness.sockets[2];
      const thirdSetup = sentMessages(thirdSocket).find((message) => message.setup)?.setup || null;
      const pageResume = {
        sameLive: geminiLive === live,
        handleInPayload: harness.tokenRequests[2]?.sessionResumptionHandle || '',
        handleInSetup: thirdSetup?.sessionResumption?.handle || '',
        micLive: live.micStream?.getAudioTracks?.()[0]?.readyState === 'live'
      };

      // An invalid/expired resume handle must not cause an infinite reconnect
      // loop. A structured 1008 setup failure falls back to one fresh session.
      harness.rejectNextResume = true;
      thirdSocket.serverClose(1006, 'trigger invalid resume test');
      await waitFor(
        () => harness.sockets.length >= 5 && geminiLive === live && live.ready,
        10000,
        '유효하지 않은 resume handle 뒤 fresh session fallback이 완료되지 않았습니다.'
      );
      const fallbackSocket = harness.sockets[4];
      const fallbackSetup = sentMessages(fallbackSocket).find((message) => message.setup)?.setup || null;
      const invalidResumeFallback = {
        handleCleared: !live.sessionResumptionHandle,
        payloadHandle: harness.tokenRequests[4]?.sessionResumptionHandle || '',
        setupHandle: fallbackSetup?.sessionResumption?.handle || '',
        ready: live.ready
      };

      // If a socket dies inside a non-resumable user turn, replay the entire
      // bounded utterance on the next connection instead of sending only its tail.
      if (typeof resetGeminiLocalVad === 'function') resetGeminiLocalVad(live);
      await feed(live, 555, 0.0001, 4);
      await feed(live, 5555, 0.08, 6);
      const replayedCommand = live.activeCommand;
      const replayedCommandEpoch = replayedCommand?.epoch || 0;
      fallbackSocket.serverClose(1006, 'mid-utterance drop');
      await waitFor(
        () => harness.sockets.length >= 6 && geminiLive === live && live.ready,
        8000,
        '발화 도중 종료 후 transport가 자동 재연결되지 않았습니다.'
      );
      const replaySocket = harness.sockets[5];
      await waitFor(
        () => audioMessages(replaySocket).some((message) => firstPcmSample(message) === 5555),
        1500,
        '발화 도중 유실된 PCM이 새 연결로 replay되지 않았습니다.'
      );
      // Headless fake-mic silence can finish local VAD during reconnect; keep
      // this synthetic utterance open so its end boundary is deterministic.
      live.vadSpeaking = true;
      live.vadSilenceMs = 0;
      finishGeminiVadSpeech(live);
      await waitFor(() => audioStreamEnds(replaySocket).length > 0, 1000, 'replay 발화의 audioStreamEnd가 전송되지 않았습니다.');
      const replaySamples = audioMessages(replaySocket).map(firstPcmSample);
      const midSpeechReplay = {
        preRollIndex: replaySamples.indexOf(555),
        speechIndex: replaySamples.indexOf(5555),
        streamEnds: audioStreamEnds(replaySocket).length,
        commandPreserved: live.activeCommand === replayedCommand && !replayedCommand?.completed,
        commandEpoch: live.activeCommand?.epoch || 0
      };
      replaySocket.serverMessage({ serverContent: { inputTranscription: { text: '영상 10초 앞으로 움직여 줘' } } });
      await new Promise((resolve) => setTimeout(resolve, 450));
      const replayTraceTurnId = ensureVpTranscriptState(live).traceTurnId;
      const toolTimeBefore = cook3Time;
      replaySocket.serverMessage({ toolCall: { functionCalls: [{ id: 'replay-tool-a', name: 'seek_video', args: { direction: 'forward', seconds: 10 } }] } });
      await waitFor(
        () => sentMessages(replaySocket).some((message) => message.toolResponse?.functionResponses?.some((response) => response.id === 'replay-tool-a')),
        2000,
        'replay된 발화의 도구 응답이 전송되지 않았습니다.'
      );
      const toolTimeAfterFirst = cook3Time;
      const commandResultCountAfterFirst = live.toolCommandResults.size;
      replaySocket.serverMessage({ toolCall: { functionCalls: [{ id: 'replay-tool-b', name: 'seek_video', args: { seconds: 10, direction: 'forward' } }] } });
      await waitFor(
        () => sentMessages(replaySocket).some((message) => message.toolResponse?.functionResponses?.some((response) => response.id === 'replay-tool-b')),
        2000,
        'replay된 발화의 중복 도구 응답이 전송되지 않았습니다.'
      );
      replaySocket.serverMessage({ serverContent: {
        outputTranscription: { text: '영상을 10초 앞으로 이동했어요.' },
        turnComplete: true
      } });
      await new Promise((resolve) => setTimeout(resolve, 1120));
      const replayTrace = harness.traceRequests.find((payload) => payload.turnId === replayTraceTurnId) || {};
      const replayToolDedupe = {
        firstDelta: toolTimeAfterFirst - toolTimeBefore,
        commandResultCountAfterFirst,
        commandResultCountAfterSecond: live.toolCommandResults.size,
        commandCompleted: !!replayedCommand?.completed,
        userText: replayTrace.userText || replayedCommand?.text || '',
        assistantText: replayTrace.assistantText || '',
        traceLogged: !!replayTrace.turnId,
        sameEpoch: replayedCommandEpoch === replayedCommand?.epoch
      };

      // A resumption checkpoint can arrive in the middle of speech. Audio added
      // after that checkpoint must make the turn unsafe again and be replayed.
      if (typeof resetGeminiLocalVad === 'function') resetGeminiLocalVad(live);
      await feed(live, 666, 0.0001, 4);
      await feed(live, 6666, 0.08, 5);
      replaySocket.serverMessage({ sessionResumptionUpdate: { resumable: true, newHandle: 'tail-checkpoint-handle' } });
      await new Promise((resolve) => setTimeout(resolve, 40));
      await feed(live, 7777, 0.08, 4);
      const checkpointBeforeDrop = {
        safe: live.resumeCheckpointSafe,
        replaySamples: (live.resumeReplay || []).filter((event) => event.type === 'audio').map((event) => new Int16Array(event.buffer)[0]),
        awaitingBoundary: !!live.activeCommand?.awaitingInterruptionBoundary,
        replayableCommand: hasReplayableGeminiActiveCommand(live)
      };
      replaySocket.serverClose(1006, 'post-checkpoint tail drop');
      await waitFor(
        () => harness.sockets.length >= 7 && geminiLive === live && live.ready,
        8000,
        'checkpoint 이후 audio tail 재연결이 완료되지 않았습니다.'
      );
      const tailReplaySocket = harness.sockets[6];
      await new Promise((resolve) => setTimeout(resolve, 300));
      const checkpointTailReplay = {
        tailPresent: audioMessages(tailReplaySocket).some((message) => firstPcmSample(message) === 7777),
        safeReset: live.resumeCheckpointSafe === false,
        checkpointBeforeDrop,
        sentSamples: audioMessages(tailReplaySocket).map(firstPcmSample)
      };
      return {
        micAfterClose,
        socketCount: harness.sockets.length,
        tokenRequestCount: tokenRequestsAfterReconnect,
        resumedPayloadHandle: reconnectTokenPayload.sessionResumptionHandle || '',
        resumedHandle: secondSetup?.sessionResumption?.handle || '',
        contextCompression: !!secondSetup?.contextWindowCompression?.slidingWindow,
        sameLiveAfterReconnect: geminiLive === live,
        audioBeforeSpeech,
        firstUtteranceSamples,
        firstEndCount,
        audioCountBeforeSecondSpeech,
        finalSamples,
        finalEndCount,
        pageSuspend,
        pageResume,
        invalidResumeFallback,
        midSpeechReplay,
        replayToolDedupe,
        checkpointTailReplay,
        transcriptLanguageGuard,
        transcriptScrollIsolation,
        sentAudioFrames: live.sentAudioFrames || 0,
        sentAudioBytes: live.sentAudioBytes || 0
      };
    } finally {
      hf3Reset();
    }
  })()`);

  if (!result.micAfterClose.sameLive || !result.micAfterClose.sameStream || !result.micAfterClose.sameTrack ||
      result.micAfterClose.trackState !== 'live' || !result.micAfterClose.trackEnabled) {
    throw new Error(`WebSocket close가 로컬 마이크까지 종료했습니다: ${JSON.stringify(result)}`);
  }
  if (result.socketCount < 2 || result.tokenRequestCount < 2 || !result.sameLiveAfterReconnect) {
    throw new Error(`Gemini Live transport 자동 재연결이 불완전합니다: ${JSON.stringify(result)}`);
  }
  if (result.resumedPayloadHandle !== 'test-resume-handle-1' || result.resumedHandle !== 'test-resume-handle-1') {
    throw new Error(`재연결 setup에 이전 session resumption handle이 없습니다: ${JSON.stringify(result)}`);
  }
  if (!result.contextCompression) {
    throw new Error(`장시간 세션용 contextWindowCompression이 setup에서 유지되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (result.audioBeforeSpeech !== 0) {
    throw new Error(`VAD가 무음 PCM을 Gemini에 전송했습니다: ${JSON.stringify(result)}`);
  }
  const firstPreRoll = result.firstUtteranceSamples.indexOf(1111);
  const firstSpeech = result.firstUtteranceSamples.indexOf(2222);
  if (firstPreRoll < 0 || firstSpeech < 0 || firstPreRoll > firstSpeech || result.firstEndCount < 1) {
    throw new Error(`첫 발화의 pre-roll/PCM/audioStreamEnd 순서가 올바르지 않습니다: ${JSON.stringify(result)}`);
  }
  const secondPreRoll = result.finalSamples.findIndex((sample, index) => index >= result.audioCountBeforeSecondSpeech && sample === 3333);
  const secondSpeech = result.finalSamples.findIndex((sample, index) => index >= result.audioCountBeforeSecondSpeech && sample === 4444);
  if (secondPreRoll < 0 || secondSpeech < 0 || secondPreRoll > secondSpeech || result.finalEndCount < result.firstEndCount + 1) {
    throw new Error(`장시간 무음 뒤 후속 발화가 새 utterance로 전송되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (!result.pageSuspend.sameLive || !result.pageSuspend.micReleased || !result.pageSuspend.boundaryCleared || !result.pageSuspend.commandInvalidated || result.pageSuspend.handle !== 'test-resume-handle-1' ||
      !result.pageResume.sameLive || !result.pageResume.micLive || result.pageResume.handleInPayload !== 'test-resume-handle-1' || result.pageResume.handleInSetup !== 'test-resume-handle-1') {
    throw new Error(`페이지 중단·복귀에서 세션 컨텍스트와 마이크가 자동 복구되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (!result.invalidResumeFallback.handleCleared || result.invalidResumeFallback.payloadHandle || result.invalidResumeFallback.setupHandle || !result.invalidResumeFallback.ready) {
    throw new Error(`유효하지 않은 session resumption handle이 fresh session으로 복구되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (result.midSpeechReplay.preRollIndex < 0 || result.midSpeechReplay.speechIndex < 0 || result.midSpeechReplay.preRollIndex > result.midSpeechReplay.speechIndex || result.midSpeechReplay.streamEnds < 1 || !result.midSpeechReplay.commandPreserved || result.midSpeechReplay.commandEpoch < 1) {
    throw new Error(`발화 도중 연결 종료 뒤 전체 utterance replay가 동작하지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (result.replayToolDedupe.firstDelta !== 10 || result.replayToolDedupe.commandResultCountAfterFirst !== result.replayToolDedupe.commandResultCountAfterSecond || !result.replayToolDedupe.commandCompleted || !result.replayToolDedupe.traceLogged || !result.replayToolDedupe.sameEpoch || !result.replayToolDedupe.userText.includes('영상 10초') || !result.replayToolDedupe.assistantText.includes('이동했어요')) {
    throw new Error(`replay 후 새 call id로 반복된 도구가 중복 실행됐습니다: ${JSON.stringify(result)}`);
  }
  if (!result.checkpointTailReplay.tailPresent || !result.checkpointTailReplay.safeReset) {
    throw new Error(`resumption checkpoint 이후 audio tail replay가 동작하지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (!result.transcriptLanguageGuard.rejectedForeign || !result.transcriptLanguageGuard.noticeShown || !result.transcriptLanguageGuard.acceptedMisclassifiedKorean || !result.transcriptLanguageGuard.acceptedKorean) {
    throw new Error(`전사 언어 품질 게이트가 동작하지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (!result.transcriptScrollIsolation.assistantScrollable || !result.transcriptScrollIsolation.stageUnchanged) {
    throw new Error(`요리비서 답변 스크롤이 조리 단계 제스처와 격리되지 않았습니다: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify({ ok: true, ...result }));
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
}
