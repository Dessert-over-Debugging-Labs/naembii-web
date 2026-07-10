const baseUrl = (process.argv[2] || 'http://127.0.0.1:4876').replace(/\/$/, '');
const timeoutMs = Number(process.argv[3] || 45000);
const endpoint = `${baseUrl}/api/gemini-live-token`;
const websocketBase = 'wss://generativelanguage.googleapis.com/ws/' +
  'google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
const verbose = process.env.NAEMBI_GEMINI_LIVE_VERBOSE === '1';

function debug(message) {
  if (verbose) console.log(`[gemini-live] ${message}`);
}

async function messageText(data) {
  if (typeof data === 'string') return data;
  if (data instanceof Blob) return data.text();
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return String(data || '');
}

function fail(message) {
  throw new Error(message);
}

const tokenResponse = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    recipe: '순두부찌개',
    step: '파기름 내기',
    stepNotes: '대파를 식용유에 볶아 향을 내는 단계',
    ingredients: '순두부 1팩, 고추참치 1캔, 대파 조금'
  })
});
const tokenData = await tokenResponse.json().catch(() => ({}));
if (!tokenResponse.ok || !tokenData.ok || !tokenData.token || !tokenData.liveSetup) {
  fail(tokenData.error || `Gemini Live 토큰 발급 실패: ${tokenResponse.status}`);
}
const systemInstruction = tokenData.liveSetup?.systemInstruction?.parts?.[0]?.text || '';
if (!systemInstruction.includes('후속 제안은 하지 않는다.') || !systemInstruction.includes('기본적으로 한 문장으로 답한다.')) {
  fail('Gemini Live의 간결 응답 시스템 프롬프트가 토큰 설정에 포함되지 않았습니다.');
}
debug('token issued');

const summary = {
  setupComplete: false,
  outputTranscript: false,
  audioChunk: false,
  toolCall: false,
  toolResponseSent: false
};
let phase = 'setup';
let completed = false;

await new Promise((resolve, reject) => {
  const websocket = new WebSocket(`${websocketBase}?access_token=${encodeURIComponent(tokenData.token)}`);
  const timeout = setTimeout(() => finish(new Error('Gemini Live 검증 시간이 초과됐어요.')), timeoutMs);

  function finish(error) {
    if (completed) return;
    completed = true;
    clearTimeout(timeout);
    try { websocket.close(); } catch {}
    if (error) reject(error);
    else resolve();
  }

  function send(message) {
    websocket.send(JSON.stringify(message));
  }

  websocket.addEventListener('open', () => {
    debug('websocket open');
    send({ setup: tokenData.liveSetup });
  });

  websocket.addEventListener('message', async (event) => {
    let message;
    try {
      message = JSON.parse(await messageText(event.data));
    } catch {
      return;
    }

    if (message.setupComplete) {
      summary.setupComplete = true;
      phase = 'question';
      debug('setup complete');
      send({ realtimeInput: { text: '양념이 타는 것 같아. 지금 어떻게 하면 좋을까?' } });
      return;
    }

    const content = message.serverContent;
    if (content) {
      if (content.outputTranscription?.text) summary.outputTranscript = true;
      for (const part of content.modelTurn?.parts || []) {
        if (part.inlineData?.data) summary.audioChunk = true;
      }
      if (phase === 'question' && content.turnComplete) {
        phase = 'tool';
        debug('question turn complete');
        send({ realtimeInput: { text: '현재 영상을 10초 앞으로 움직여줘. 반드시 seek_video 도구를 호출해.' } });
      } else if (phase === 'tool-response' && content.turnComplete && summary.toolResponseSent) {
        finish();
      }
    }

    if (message.toolCall?.functionCalls?.length) {
      const calls = message.toolCall.functionCalls;
      summary.toolCall = true;
      debug(`tool call: ${calls.map((call) => call.name).join(', ')}`);
      const responses = calls.map((call) => ({
        id: call.id,
        name: call.name,
        response: {
          result: {
            ok: true,
            simulated: true,
            name: call.name,
            args: call.args || {}
          }
        }
      }));
      send({ toolResponse: { functionResponses: responses } });
      summary.toolResponseSent = true;
      phase = 'tool-response';
    }
  });

  websocket.addEventListener('error', () => {
    debug('websocket error');
    finish(new Error('Gemini Live WebSocket 오류가 발생했어요.'));
  });
  websocket.addEventListener('close', (event) => {
    debug(`websocket close: ${event.code} ${event.reason || ''}`);
    if (!completed) finish(new Error('Gemini Live WebSocket이 검증 완료 전에 종료됐어요.'));
  });
});

if (!summary.setupComplete || !summary.outputTranscript || !summary.audioChunk || !summary.toolCall || !summary.toolResponseSent) {
  fail(`Gemini Live 검증이 불완전합니다: ${JSON.stringify(summary)}`);
}

console.log(JSON.stringify({ ok: true, ...summary }));
