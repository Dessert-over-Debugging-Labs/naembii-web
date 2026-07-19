const { allowCors, clean, json, readBody } = require('./_lib/collect');
const { langfuseConfigured, recordConversationTurn } = require('./_lib/langfuse');

function integer(value, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function turnStatus(value) {
  const status = clean(value, 24);
  return ['completed', 'interrupted', 'abandoned'].includes(status) ? status : 'completed';
}

function turnTimestamps(body, now = Date.now()) {
  const maxFuture = now + 5 * 60 * 1000;
  const minCompleted = now - 12 * 60 * 60 * 1000;
  const rawCompleted = Date.parse(clean(body.completedAt, 40));
  const completedMs = Number.isFinite(rawCompleted) && rawCompleted >= minCompleted && rawCompleted <= maxFuture
    ? rawCompleted
    : now;
  const rawStarted = Date.parse(clean(body.startedAt, 40));
  const minStarted = completedMs - 6 * 60 * 60 * 1000;
  const startedMs = Number.isFinite(rawStarted)
    ? Math.max(minStarted, Math.min(completedMs, rawStarted))
    : completedMs;
  return {
    startedAt: new Date(startedMs).toISOString(),
    completedAt: new Date(completedMs).toISOString(),
    receivedAt: new Date(now).toISOString()
  };
}

function requestOriginAllowed(req) {
  const origin = clean(req.headers?.origin, 300);
  if (!origin) return process.env.NODE_ENV !== 'production';

  const configured = String(process.env.NAEMBI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (configured.length) return configured.includes(origin.replace(/\/$/, ''));

  const forwardedHost = clean(req.headers?.['x-forwarded-host'], 240);
  const host = forwardedHost || clean(req.headers?.host, 240);
  const forwardedProto = clean(req.headers?.['x-forwarded-proto'], 20).split(',')[0];
  const protocol = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return Boolean(host && origin === `${protocol}://${host}`);
}

function turnPayload(body) {
  const timestamps = turnTimestamps(body);
  return {
    turnId: clean(body.turnId, 140),
    sessionId: clean(body.sessionId, 140),
    turnNumber: integer(body.turnNumber, 1, 10_000),
    model: clean(body.model, 160),
    userText: clean(body.userText, 3_000),
    assistantText: clean(body.assistantText, 6_000),
    recipeId: clean(body.recipeId, 80),
    recipe: clean(body.recipe, 200),
    stepIndex: integer(body.stepIndex, 0, 100),
    totalSteps: integer(body.totalSteps, 0, 100),
    stepTitle: clean(body.stepTitle, 240),
    cookingStatus: clean(body.cookingStatus, 40),
    turnStatus: turnStatus(body.turnStatus),
    ...timestamps,
    page: clean(body.page, 160)
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store, max-age=0');
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') {
    json(res, 405, { error: 'POST만 지원합니다.' });
    return;
  }
  if (!requestOriginAllowed(req)) {
    json(res, 403, { error: '허용되지 않은 출처입니다.' });
    return;
  }
  if (!langfuseConfigured()) {
    json(res, 503, { ok: false, configured: false, error: 'Langfuse 환경변수를 확인하세요.' });
    return;
  }

  try {
    const payload = turnPayload(await readBody(req, 16_000));
    if (!payload.turnId || !payload.sessionId || !payload.userText) {
      json(res, 400, { error: 'turnId, sessionId, userText가 필요합니다.' });
      return;
    }
    await recordConversationTurn(payload);
    json(res, 202, { ok: true, storedBy: 'langfuse', turnId: payload.turnId });
  } catch (error) {
    console.error('Langfuse 대화 기록 실패:', error?.message || error?.name || 'unknown error');
    json(res, 502, { ok: false, error: 'Langfuse 대화 기록에 실패했습니다.' });
  }
};

module.exports._test = { requestOriginAllowed, turnPayload, turnTimestamps };
