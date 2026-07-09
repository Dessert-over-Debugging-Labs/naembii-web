const { allowCors, clean, json, readBody } = require('./_lib/collect');

const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';
const DEFAULT_TTL_MINUTES = 30;
const DEFAULT_NEW_SESSION_SECONDS = 60;

function envValue(primary, fallback) {
  return process.env[primary] || (fallback ? process.env[fallback] : '');
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function liveSystemInstruction(payload) {
  const recipe = clean(payload.recipe, 120) || '현재 레시피';
  const step = clean(payload.step, 160) || '현재 단계';
  return [
    '너는 냄비의 조리 중 음성 비서다.',
    '사용자는 모바일 웹으로 주방에서 요리 중이다.',
    '답변은 한국어로 짧고 바로 실행 가능한 한두 문장으로 한다.',
    '안전하지 않은 조리 지시는 피하고, 뜨거운 기름/칼/불 사용 시 주의를 먼저 말한다.',
    `현재 레시피: ${recipe}`,
    `현재 단계: ${step}`
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') {
    json(res, 405, { error: 'POST만 지원합니다.' });
    return;
  }

  const apiKey = envValue('NAEMBI_GEMINI_API_KEY', 'GOOGLE_API_KEY');
  const model = envValue('NAEMBI_GEMINI_LIVE_MODEL') || DEFAULT_MODEL;
  const ttlMinutes = clampNumber(envValue('NAEMBI_GEMINI_LIVE_TOKEN_TTL_MINUTES'), DEFAULT_TTL_MINUTES, 1, 30);
  const newSessionSeconds = clampNumber(envValue('NAEMBI_GEMINI_LIVE_NEW_SESSION_SECONDS'), DEFAULT_NEW_SESSION_SECONDS, 15, 120);

  if (!apiKey) {
    json(res, 501, {
      ok: false,
      configured: false,
      error: 'Vercel 환경변수 NAEMBI_GEMINI_API_KEY가 필요합니다.'
    });
    return;
  }

  try {
    const body = await readBody(req);
    const { GoogleGenAI } = require('@google/genai');
    const client = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + newSessionSeconds * 1000);

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: 'v1alpha' },
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: ['AUDIO'],
            temperature: 0.6,
            systemInstruction: liveSystemInstruction(body)
          }
        }
      }
    });

    json(res, 200, {
      ok: true,
      configured: true,
      token: token.name,
      model,
      expireTime,
      newSessionExpireTime: newSessionExpireTime.toISOString(),
      responseModalities: ['AUDIO']
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
