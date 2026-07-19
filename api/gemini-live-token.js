const { allowCors, clean, json, readBody } = require('./_lib/collect');

const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';
const DEFAULT_TTL_MINUTES = 30;
const DEFAULT_NEW_SESSION_SECONDS = 60;
const LIVE_INPUT_LANGUAGE_CODES = ['ko-KR', 'en-US'];
const LIVE_OUTPUT_LANGUAGE_CODES = ['ko-KR'];
const LIVE_BASE_ADAPTATION_PHRASES = [
  '냄비',
  '요리 비서',
  '옥수수',
  '인분',
  '큰술',
  '작은술',
  '타이머',
  '조리 단계',
  '재료 보기',
  '유튜브',
  'YouTube'
];

// These tools are locked into the ephemeral token so a browser cannot expand
// the actions Gemini may request after receiving a token.
const LIVE_TOOLS = [{
  functionDeclarations: [
    {
      name: 'move_cooking_step',
      description: 'Move the visible cooking step only when the current user utterance explicitly commands next or previous. Never call for questions, explanations, complaints, or a video/timer request.',
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
      description: 'Show a specific cooking step when the current user utterance explicitly requests a numbered or ordinal step, the first/starting step, or the last/final step. Map first/starting to step 1 and last/final to the current totalSteps from context. A question or incidental mention of a step is not a command.',
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
      description: 'Start or replace the cooking timer only when the current user utterance explicitly requests a timer with the exact duration. Never infer the duration.',
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
      description: 'Pause, resume, or cancel the timer only when the current user utterance explicitly requests that exact timer action.',
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
      description: 'Play or pause only the cooking video when the current user utterance explicitly requests that exact video action. Never move the cooking step together with this tool unless separately requested.',
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
      description: 'Seek the cooking video only when the current user utterance explicitly gives the exact direction and number of seconds. Never infer either value.',
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
      description: 'Set video speed only when the current user utterance explicitly gives the exact supported speed. Never infer a numeric speed from vague wording.',
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
      description: 'Change video-segment repetition only when the current user utterance explicitly requests on or off.',
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
      description: 'Open the ingredient list only when the current user utterance explicitly asks to see or open it. A question merely mentioning an ingredient is not a command.'
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
  const totalSteps = Math.trunc(clampNumber(payload.totalSteps, 0, 0, 20));
  return [
    '너는 냄비의 조리 중 음성 비서다.',
    '사용자는 모바일 웹으로 주방에서 요리 중이다.',
    '반드시 한국어로 답한다. 조리 도구, 브랜드명, YouTube 같은 짧은 영어 고유명사만 그대로 말할 수 있다.',
    '입력 언어를 추측하거나 지적하지 않는다. 한글이 포함된 발화는 짧아도 정상적인 한국어로 처리하고, “안녕”, “냄비야” 같은 인사에는 짧게 한국어로 답한다.',
    '내용을 정말 이해할 수 없을 때만 언어를 언급하지 말고 “잘 못 들었어요. 다시 말씀해 주세요”라고 짧게 확인한다. 사용자의 언어를 바꿔 말하라고 요구하지 않는다.',
    '사용자가 물은 내용 또는 요청한 조작에 필요한 답만 말한다. 불필요한 반복, 요약, 부연 설명, 선택지, 후속 제안은 하지 않는다.',
    '기본적으로 한 문장으로 답한다. 정확한 수치, 안전 경고 또는 의도 확인이 꼭 필요할 때만 짧은 두 문장으로 답한다.',
    '묻지 않은 다음 단계, 재료, 대안, 팁을 덧붙이지 않는다.',
    '정보가 부족하거나 의도가 불명확하면 추측하지 말고 짧은 확인 질문 하나만 한다.',
    '안전하지 않은 조리 지시는 피하고, 뜨거운 기름/칼/불 사용 시 주의를 먼저 말한다.',
    '영상, 단계, 타이머, 재료 목록을 조작해 달라는 명확한 요청에만 제공된 도구를 호출한다.',
    '한 발화에서 사용자가 명시적으로 요청한 조작만 수행한다. 관련 있어 보여도 요청하지 않은 조작을 추론하거나 함께 실행하지 않는다.',
    '한 발화에는 마지막에 명시된 조작 하나에 해당하는 도구만 정확히 한 번 호출한다. 여러 조작이 섞여 있으면 마지막 조작만 수행하고 나머지는 한 번에 하나씩 다시 말해 달라고 짧게 안내한다.',
    '질문, 설명, 상태 확인, 과거 단계 언급, 불만, 부정, 가정, 다른 명령의 인용 또는 완료 보고는 조작 명령이 아니다. 사용자가 말하지 않은 방향, 단계, 시간, 속도를 임의로 만들지 않는다.',
    '“첫 단계”, “처음 단계”, “맨 처음 단계”는 1단계를 뜻하고, “마지막 단계”, “맨 마지막 단계”, “최종 단계”는 현재 전체 단계 수에 해당하는 단계를 뜻하는 명확한 목적지다. 이런 표현은 숫자 추정이 아니므로 go_to_cooking_step을 호출한다.',
    '“물이 끓으면”, “나중에”, “10초 뒤에”처럼 미래 시점이나 조건이 붙은 요청은 예약 기능이 아니므로 지금 도구를 호출하지 말고, 그 시점에 다시 말해 달라고 짧게 안내한다. “A 아니면 B” 같은 선택지도 확인 전에는 실행하지 않는다.',
    '예: “영상 멈춰 줘”에는 영상 일시 정지만 호출하며 단계 이동은 절대 호출하지 않는다.',
    '예: “마지막 단계로 이동해 줘”에는 go_to_cooking_step의 step을 현재 전체 단계 수로 설정해 정확히 한 번 호출한다.',
    '첫 단계나 마지막 단계 도구 실행 결과도 영어로 번역하지 말고 “첫 단계로 이동했어요”, “마지막 단계로 이동했어요”처럼 한국어로 말한다.',
    '예: “이전에 올리브유 바르는 단계가 있었어?”는 질문이므로 어떤 도구도 호출하지 않고 답만 한다.',
    '명확한 조작 요청은 제공된 도구를 먼저 실행하고, 결과에 필요한 말만 짧게 답한다. 도구 이름이나 내부 처리 과정은 말하지 않는다.',
    '도구로 처리할 수 없는 조리 질문은 현재 레시피와 단계 정보를 기준으로 직접 답한다.',
    '현재 단계와 무관한 이전 또는 다음 단계를 임의로 언급하지 않는다.',
    `현재 레시피: ${recipe}`,
    servings ? `기준 인분: ${servings} (인분 조절 질문은 이 기준의 배수로 계산해 답한다)` : '',
    totalTime ? `총 조리 시간: ${totalTime}` : '',
    totalSteps ? `전체 조리 단계 수: ${totalSteps}` : '',
    `현재 단계: ${step}`,
    stepNotes ? `현재 단계 세부: ${stepNotes}` : '',
    ingredients ? `현재 재료: ${ingredients}` : ''
  ].filter(Boolean).join('\n');
}

function liveTranscriptionAdaptationPhrases(payload) {
  const values = [
    ...LIVE_BASE_ADAPTATION_PHRASES,
    clean(payload.recipe, 120),
    clean(payload.step, 160),
    clean(payload.stepNotes, 520),
    clean(payload.ingredients, 720)
  ];
  const phrases = new Set();
  for (const value of values) {
    for (const phrase of String(value || '').split(/[,\n·/()]+/)) {
      const trimmed = phrase.trim();
      if (trimmed.length >= 2 && trimmed.length <= 40) phrases.add(trimmed);
    }
  }
  return [...phrases].slice(0, 64);
}

function liveConfig(payload) {
  const sessionResumptionHandle = resumeHandle(payload);
  const adaptationPhrases = liveTranscriptionAdaptationPhrases(payload);
  return {
    responseModalities: ['AUDIO'],
    temperature: 0.2,
    systemInstruction: liveSystemInstruction(payload),
    speechConfig: {
      languageCode: 'ko-KR'
    },
    inputAudioTranscription: {
      languageHints: { languageCodes: LIVE_INPUT_LANGUAGE_CODES },
      adaptationPhrases
    },
    outputAudioTranscription: {
      languageHints: { languageCodes: LIVE_OUTPUT_LANGUAGE_CODES }
    },
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
      temperature: config.temperature,
      speechConfig: config.speechConfig
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

module.exports._test = {
  liveConfig,
  liveSetup,
  liveSystemInstruction,
  liveTranscriptionAdaptationPhrases
};
