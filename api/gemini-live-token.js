const { allowCors, clean, json, readBody } = require('./_lib/collect');

const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';
const DEFAULT_TTL_MINUTES = 30;
const DEFAULT_NEW_SESSION_SECONDS = 60;

// These tools are locked into the ephemeral token so a browser cannot expand
// the actions Gemini may request after receiving a token.
const LIVE_TOOLS = [{
  functionDeclarations: [
    {
      name: 'move_cooking_step',
      description: 'Move the visible cooking step forward or backward when the user explicitly asks.',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['next', 'previous'] }
        },
        required: ['direction']
      }
    },
    {
      name: 'go_to_cooking_step',
      description: 'Show a specific numbered cooking step when the user explicitly names a step number.',
      parameters: {
        type: 'object',
        properties: {
          step: { type: 'integer', minimum: 1, maximum: 20 }
        },
        required: ['step']
      }
    },
    {
      name: 'set_cooking_timer',
      description: 'Start or replace the cooking timer with an explicit duration in seconds.',
      parameters: {
        type: 'object',
        properties: {
          seconds: { type: 'integer', minimum: 1, maximum: 7200 }
        },
        required: ['seconds']
      }
    },
    {
      name: 'set_cooking_timer_state',
      description: 'Pause, resume, or cancel the active cooking timer when the user explicitly asks.',
      parameters: {
        type: 'object',
        properties: {
          state: { type: 'string', enum: ['pause', 'resume', 'cancel'] }
        },
        required: ['state']
      }
    },
    {
      name: 'set_video_playback',
      description: 'Play or pause the current cooking video when the user explicitly asks.',
      parameters: {
        type: 'object',
        properties: {
          state: { type: 'string', enum: ['play', 'pause'] }
        },
        required: ['state']
      }
    },
    {
      name: 'seek_video',
      description: 'Seek the cooking video backward or forward by a short, explicit number of seconds.',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['backward', 'forward'] },
          seconds: { type: 'integer', minimum: 1, maximum: 60 }
        },
        required: ['direction', 'seconds']
      }
    },
    {
      name: 'set_video_speed',
      description: 'Set the cooking video playback speed to one of the supported values when the user explicitly asks.',
      parameters: {
        type: 'object',
        properties: {
          speed: { type: 'string', enum: ['0.5', '0.75', '1', '1.25', '1.5', '2'] }
        },
        required: ['speed']
      }
    },
    {
      name: 'set_video_repeat',
      description: 'Turn repetition of the current cooking-video segment on or off when the user explicitly asks.',
      parameters: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' }
        },
        required: ['enabled']
      }
    },
    {
      name: 'show_cooking_ingredients',
      description: 'Open the current recipe ingredient list when the user explicitly asks to see ingredients.'
    }
  ]
}];

function envValue(primary, fallback) {
  return process.env[primary] || (fallback ? process.env[fallback] : '');
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function resumeHandle(payload) {
  const value = payload?.sessionResumptionHandle;
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > 16384) {
    throw new Error('세션 재개 정보가 올바르지 않습니다.');
  }
  return value;
}

function liveSystemInstruction(payload) {
  const recipe = clean(payload.recipe, 120) || '현재 레시피';
  const servings = clean(payload.servings, 40);
  const totalTime = clean(payload.totalTime, 40);
  const step = clean(payload.step, 160) || '현재 단계';
  const stepNotes = clean(payload.stepNotes, 520);
  const ingredients = clean(payload.ingredients, 720);
  return [
    '너는 냄비의 조리 중 음성 비서다.',
    '사용자는 모바일 웹으로 주방에서 요리 중이다.',
    '사용자가 물은 내용 또는 요청한 조작에 필요한 답만 한국어로 말한다. 인사, 공감, 반복, 요약, 부연 설명, 선택지, 후속 제안은 하지 않는다.',
    '기본적으로 한 문장으로 답한다. 정확한 수치, 안전 경고 또는 의도 확인이 꼭 필요할 때만 짧은 두 문장으로 답한다.',
    '묻지 않은 다음 단계, 재료, 대안, 팁을 덧붙이지 않는다.',
    '정보가 부족하거나 의도가 불명확하면 추측하지 말고 짧은 확인 질문 하나만 한다.',
    '안전하지 않은 조리 지시는 피하고, 뜨거운 기름/칼/불 사용 시 주의를 먼저 말한다.',
    '영상, 단계, 타이머, 재료 목록을 조작해 달라는 명확한 요청에만 제공된 도구를 호출한다.',
    '명확한 조작 요청은 제공된 도구를 먼저 실행하고, 결과에 필요한 말만 짧게 답한다. 도구 이름이나 내부 처리 과정은 말하지 않는다.',
    '도구로 처리할 수 없는 조리 질문은 현재 레시피와 단계 정보를 기준으로 직접 답한다.',
    '현재 단계와 무관한 이전 또는 다음 단계를 임의로 언급하지 않는다.',
    `현재 레시피: ${recipe}`,
    servings ? `기준 인분: ${servings} (인분 조절 질문은 이 기준의 배수로 계산해 답한다)` : '',
    totalTime ? `총 조리 시간: ${totalTime}` : '',
    `현재 단계: ${step}`,
    stepNotes ? `현재 단계 세부: ${stepNotes}` : '',
    ingredients ? `현재 재료: ${ingredients}` : ''
  ].filter(Boolean).join('\n');
}

function liveConfig(payload) {
  const sessionResumptionHandle = resumeHandle(payload);
  return {
    responseModalities: ['AUDIO'],
    temperature: 0.6,
    systemInstruction: liveSystemInstruction(payload),
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        prefixPaddingMs: 100,
        silenceDurationMs: 700
      }
    },
    sessionResumption: sessionResumptionHandle ? { handle: sessionResumptionHandle } : {},
    contextWindowCompression: { slidingWindow: {} },
    tools: LIVE_TOOLS
  };
}

function liveSetup(model, config) {
  return {
    model: `models/${model}`,
    generationConfig: {
      responseModalities: config.responseModalities,
      temperature: config.temperature
    },
    systemInstruction: {
      parts: [{ text: config.systemInstruction }]
    },
    inputAudioTranscription: config.inputAudioTranscription,
    outputAudioTranscription: config.outputAudioTranscription,
    realtimeInputConfig: config.realtimeInputConfig,
    sessionResumption: config.sessionResumption,
    contextWindowCompression: config.contextWindowCompression,
    tools: config.tools
  };
}

async function createLiveTokenWithRest({ apiKey, model, config, expireTime, newSessionExpireTime }) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      uses: 1,
      expireTime,
      newSessionExpireTime,
      // Supplying the complete setup locks the constrained browser session to
      // the server-selected model, prompt, transcription, and tool list.
      bidiGenerateContentSetup: liveSetup(model, config)
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || `Gemini Live 토큰 요청 실패: ${response.status}`);
  }
  return body.authToken || body;
}

async function createLiveToken({ apiKey, model, config, expireTime, newSessionExpireTime }) {
  try {
    const { GoogleGenAI } = require('@google/genai');
    const client = new GoogleGenAI({ apiKey });
    return await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: 'v1alpha' },
        liveConnectConstraints: { model, config }
      }
    });
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' || !String(error.message || '').includes('@google/genai')) {
      throw error;
    }
    return createLiveTokenWithRest({ apiKey, model, config, expireTime, newSessionExpireTime });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store, max-age=0');
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') {
    json(res, 405, { error: 'POST만 지원합니다.' });
    return;
  }

  const apiKey = envValue('NAEMBI_GEMINI_API_KEY', 'GOOGLE_API_KEY') || process.env.GEMINI_API_KEY || '';
  const model = envValue('NAEMBI_GEMINI_LIVE_MODEL') || DEFAULT_MODEL;
  const ttlMinutes = clampNumber(envValue('NAEMBI_GEMINI_LIVE_TOKEN_TTL_MINUTES'), DEFAULT_TTL_MINUTES, 1, 30);
  const newSessionSeconds = clampNumber(envValue('NAEMBI_GEMINI_LIVE_NEW_SESSION_SECONDS'), DEFAULT_NEW_SESSION_SECONDS, 15, 120);

  if (!apiKey) {
    json(res, 501, {
      ok: false,
      configured: false,
      error: 'Gemini API 키가 필요합니다. 로컬은 .env의 GEMINI_API_KEY, 배포는 NAEMBI_GEMINI_API_KEY를 설정하세요.'
    });
    return;
  }

  try {
    const body = await readBody(req);
    const expireTime = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + newSessionSeconds * 1000);
    const config = liveConfig(body);
    const token = await createLiveToken({ apiKey, model, config, expireTime, newSessionExpireTime });

    json(res, 200, {
      ok: true,
      configured: true,
      token: token.name,
      model,
      expireTime,
      newSessionExpireTime: newSessionExpireTime.toISOString(),
      responseModalities: ['AUDIO'],
      liveSetup: liveSetup(model, config)
    });
  } catch (error) {
    console.error(error);
    json(res, 500, {
      ok: false,
      configured: true,
      error: error.message || 'Gemini Live 토큰 발급에 실패했습니다.'
    });
  }
};
