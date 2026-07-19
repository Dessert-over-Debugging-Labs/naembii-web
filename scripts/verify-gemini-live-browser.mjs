import { spawn } from 'node:child_process';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = (process.argv[2] || 'http://127.0.0.1:4876').replace(/\/+$/, '');
const port = Number(process.argv[3] || 9472);

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
  `--user-data-dir=/tmp/naembi-gemini-live-${Date.now()}`,
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime exception');
  return result.result.value;
}

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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await send('Page.navigate', { url: `${baseUrl}/app` });
  await delay(1800);

  const result = await evaluate(`(async () => {
    let audioStarts = 0;
    const originalStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function(...args) {
      audioStarts += 1;
      return originalStart.apply(this, args);
    };
    try {
      show('cook3');
      hideCookHint();
      await new Promise((resolve) => setTimeout(resolve, 180));
      toggleHf3();
      const connectionDeadline = Date.now() + 24000;
      while (Date.now() < connectionDeadline && (!geminiLive?.ready || !geminiLive?.micStream)) {
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
      const micStarted = !!geminiLive?.micStream && !!geminiLive?.inputProcessor && geminiLive.micStream.getAudioTracks().every((track) => track.readyState === 'live');
      const micInputFrames = geminiLive?.sentAudioFrames || 0;
      const micInputBytes = geminiLive?.sentAudioBytes || 0;
      const micInputMimeType = geminiLive?.inputMimeType || '';
      if (!geminiLive?.ready) throw new Error('요리 비서 버튼이 Gemini Live 세션을 시작하지 않았습니다.');
      stopGeminiMicrophone();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const micStopped = !geminiLive?.micStream && !geminiLive?.inputProcessor;
      const transcriptLines = () => [...document.querySelectorAll('#vpTranscript .vp-transcript-entry')].map((entry) => entry.textContent.trim());
      const waitUntil = async (predicate, message, timeout = 24000) => {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
          if (predicate()) return;
          await new Promise((resolve) => setTimeout(resolve, 180));
        }
        throw new Error(message);
      };

      await waitUntil(() => isGeminiLiveOpen(geminiLive), '첫 인사 직전에 Gemini Live 연결이 열리지 않았습니다.');
      sendGeminiLiveMessage(geminiLive,{realtimeInput:{text:'안녕.'}});
      const greetingEpoch = geminiLive.commandEpoch;
      await waitUntil(
        () => geminiLive?.activeCommand?.epoch === greetingEpoch && geminiLive.activeCommand.completed && !!document.querySelector('#vpTranscript .vp-transcript-entry.assistant'),
        '짧은 한국어 인사에 대한 응답이 완료되지 않았습니다.'
      );
      const greetingTranscript = transcriptLines();

      const nextStepBefore = document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '';
      await waitUntil(() => isGeminiLiveOpen(geminiLive), '다음 단계 명령 직전에 Gemini Live 연결이 열리지 않았습니다.');
      sendGeminiLiveMessage(geminiLive,{realtimeInput:{text:'다음 단계로 넘어가죠.'}});
      const nextStepEpoch = geminiLive.commandEpoch;
      await waitUntil(
        () => document.querySelector('#cookTrack3 .scard.active')?.dataset.i === String(Number(nextStepBefore) + 1),
        '자연스러운 다음 단계 이동 명령이 실행되지 않았습니다.'
      );
      await waitUntil(
        () => geminiLive?.activeCommand?.epoch === nextStepEpoch && geminiLive.activeCommand.completed,
        '다음 단계 도구 응답이 완료되지 않았습니다.'
      );
      const nextStepAfter = document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '';
      const nextStepTranscript = transcriptLines();

      // 단계 변경에 따른 context reconnect와 다음 검증 명령이 겹치지 않도록 독립 Live 세션을 사용한다.
      hf3Reset();
      await new Promise((resolve) => setTimeout(resolve, 450));
      cook3Car.goTo(0);
      toggleHf3();
      await waitUntil(() => geminiLive?.ready && geminiLive?.micStream, '마지막 단계 검증용 Gemini Live 세션이 준비되지 않았습니다.');
      stopGeminiMicrophone();

      const lastStepIndex = Math.max(0, (currentRecipe?.steps?.length || 1) - 1);
      const lastStepBefore = document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '';
      await waitUntil(() => isGeminiLiveOpen(geminiLive), '마지막 단계 명령 직전에 Gemini Live 연결이 열리지 않았습니다.');
      sendGeminiLiveMessage(geminiLive,{realtimeInput:{text:'마지막 단계로 이동해 줘.'}});
      await waitUntil(
        () => document.querySelector('#cookTrack3 .scard.active')?.dataset.i === String(lastStepIndex),
        '마지막 단계 이동 명령이 실행되지 않았습니다.'
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      const lastStepAfter = document.querySelector('#cookTrack3 .scard.active')?.dataset.i || '';
      const lastStepTranscript = transcriptLines();

      // 실제 도구 응답이 길어지는 경우 다음 명령의 barge-in과 섞이지 않도록 seek는 새 Live 세션에서 검증한다.
      hf3Reset();
      await new Promise((resolve) => setTimeout(resolve, 450));
      cook3Car.goTo(0);
      toggleHf3();
      await waitUntil(() => geminiLive?.ready && geminiLive?.micStream, '영상 이동 검증용 Gemini Live 세션이 준비되지 않았습니다.');
      stopGeminiMicrophone();
      await waitUntil(() => isGeminiLiveOpen(geminiLive), '영상 이동 명령 직전에 Gemini Live 연결이 열리지 않았습니다.');
      const timeBefore = cook3Time;
      sendGeminiLiveMessage(geminiLive,{realtimeInput:{text:'현재 영상을 10초 앞으로 움직여 줘'}});
      await waitUntil(() => cook3Time >= timeBefore + 10, '영상 앞으로 10초 명령이 실행되지 않았습니다.');
      await new Promise((resolve) => setTimeout(resolve, 500));
      const seekTranscript = transcriptLines();
      return {
        transcript: transcriptLines(),
        greetingTranscript,
        nextStepTranscript,
        lastStepTranscript,
        seekTranscript,
        timeBefore,
        timeAfter: cook3Time,
        lastStepBefore,
        lastStepAfter,
        lastStepIndex: String(lastStepIndex),
        nextStepBefore,
        nextStepAfter,
        audioStarts,
        micStarted,
        micInputFrames,
        micInputBytes,
        micInputMimeType,
        micStopped,
        panel: document.getElementById('vpanel').className
      };
    } finally {
      AudioBufferSourceNode.prototype.start = originalStart;
      hf3Reset();
    }
  })()`);

  if (![...result.greetingTranscript, ...result.nextStepTranscript, ...result.lastStepTranscript, ...result.seekTranscript, ...result.transcript].some((line) => line.includes('냄비'))) {
    throw new Error(`Gemini Live 응답 전사가 화면에 표시되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (!result.greetingTranscript.some((line) => line.includes('냄비')) || result.greetingTranscript.some((line) => /한국어로.*다시/.test(line))) {
    throw new Error(`짧은 한국어 인사에 잘못된 언어 재요청이 발생했습니다: ${JSON.stringify(result)}`);
  }
  if (Number(result.nextStepAfter) !== Number(result.nextStepBefore) + 1 || result.nextStepTranscript.some((line) => /잘 못 들었어요|다시 말씀해/.test(line))) {
    throw new Error(`자연스러운 다음 단계 명령이 한 번의 정상 도구 응답으로 끝나지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (result.timeAfter < result.timeBefore + 10) {
    throw new Error(`Gemini Live seek_video가 기존 영상 제어에 연결되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (result.lastStepAfter !== result.lastStepIndex) {
    throw new Error(`Gemini Live 마지막 단계 명령이 현재 레시피의 마지막 단계로 연결되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (result.lastStepTranscript.some((line) => /last\s*step/i.test(line))) {
    throw new Error(`마지막 단계 실행 확인에 영어 표현이 섞였습니다: ${JSON.stringify(result)}`);
  }
  if (result.audioStarts < 1) {
    throw new Error(`Gemini Live 오디오 재생이 시작되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (!result.micStarted || !result.micStopped) {
    throw new Error(`Gemini Live 마이크 capture lifecycle이 동작하지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (result.micInputFrames < 1 || result.micInputBytes < 100 || result.micInputMimeType !== 'audio/pcm;rate=16000') {
    throw new Error(`Gemini Live 마이크 PCM이 16 kHz 형식으로 전송되지 않았습니다: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify({ ok: true, ...result }));
} finally {
  if (ws) ws.close();
  child.kill('SIGTERM');
  if (child.exitCode === null) {
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      delay(1500)
    ]);
  }
  if (child.exitCode === null) child.kill('SIGKILL');
}
