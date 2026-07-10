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
      const timeBefore = cook3Time;
      const micStarted = !!geminiLive?.micStream && !!geminiLive?.inputProcessor && geminiLive.micStream.getAudioTracks().every((track) => track.readyState === 'live');
      const micInputFrames = geminiLive?.sentAudioFrames || 0;
      const micInputBytes = geminiLive?.sentAudioBytes || 0;
      const micInputMimeType = geminiLive?.inputMimeType || '';
      if (!geminiLive?.ready) throw new Error('요리 비서 버튼이 Gemini Live 세션을 시작하지 않았습니다.');
      stopGeminiMicrophone();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const micStopped = !geminiLive?.micStream && !geminiLive?.inputProcessor;
      sendGeminiLiveMessage(geminiLive,{realtimeInput:{text:'현재 영상을 10초 앞으로 움직여줘. 반드시 제공된 도구를 사용해.'}});
      const deadline = Date.now() + 24000;
      while (Date.now() < deadline) {
        const transcript = [...document.querySelectorAll('#vpTranscript .vp-transcript-entry')].map((entry) => entry.textContent.trim());
        if (transcript.some((line) => line.includes('냄비')) && cook3Time >= timeBefore + 10) {
          return {
            transcript,
            timeBefore,
            timeAfter: cook3Time,
            audioStarts,
            micStarted,
            micInputFrames,
            micInputBytes,
            micInputMimeType,
            micStopped,
            panel: document.getElementById('vpanel').className
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
      return {
        transcript: [...document.querySelectorAll('#vpTranscript .vp-transcript-entry')].map((entry) => entry.textContent.trim()),
        timeBefore,
        timeAfter: cook3Time,
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

  if (!result.transcript.some((line) => line.includes('냄비'))) {
    throw new Error(`Gemini Live 응답 전사가 화면에 표시되지 않았습니다: ${JSON.stringify(result)}`);
  }
  if (result.timeAfter < result.timeBefore + 10) {
    throw new Error(`Gemini Live seek_video가 기존 영상 제어에 연결되지 않았습니다: ${JSON.stringify(result)}`);
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
}
