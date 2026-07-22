const { allowCors, clean, json, readBody } = require('./_lib/collect');
const { langfuseConfigured, recordConversationTurn, recordSessionUsage } = require('./_lib/langfuse');

const MAX_TOOL_CALLS_PER_TURN = 12;
// 브라우저가 보내는 값이므로 키를 화이트리스트로 고정하고 상한을 건다.
// 상한은 Live 세션 하나가 정상적으로 도달할 수 없는 크기 — 잘못된 값이 Langfuse 비용 집계를 오염시키는 것을 막는 용도다.
const USAGE_TOKEN_KEYS = Object.freeze([
  'promptTokens',
  'responseTokens',
  'totalTokens',
  'promptAudioTokens',
  'promptTextTokens',
  'responseAudioTokens',
  'responseTextTokens',
  'weightedTokens'
]);
const MAX_USAGE_TOKENS = 20_000_000;
const MAX_USAGE_UPDATES = 100_000;
const TOOL_ARG_RULES = Object.freeze({
  move_cooking_step: Object.freeze({ direction: ['next', 'previous'] }),
  go_to_cooking_step: Object.freeze({ step: [1, 20] }),
  set_cooking_timer: Object.freeze({ seconds: [1, 7200] }),
  set_cooking_timer_state: Object.freeze({ state: ['pause', 'resume', 'cancel'] }),
  set_video_playback: Object.freeze({ state: ['play', 'pause'] }),
  seek_video: Object.freeze({ direction: ['backward', 'forward'], seconds: [1, 60] }),
  set_video_speed: Object.freeze({ speed: ['0.5', '0.75', '1', '1.25', '1.5', '2'] }),
  set_video_repeat: Object.freeze({ enabled: 'boolean' }),
  show_cooking_ingredients: Object.freeze({})
});

function integer(value, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function turnStatus(value) {
  const status = clean(value, 24);
  return ['completed', 'interrupted', 'abandoned'].includes(status) ? status : 'completed';
}

function safeToolArgs(name, value) {
  const rules = TOOL_ARG_RULES[name];
  if (!rules || !value || typeof value !== 'object' || Array.isArray(value)) return {};

  const args = {};
  for (const [key, rule] of Object.entries(rules)) {
    const candidate = value[key];
    if (rule === 'boolean') {
      if (typeof candidate === 'boolean') args[key] = candidate;
      continue;
    }
    if (key === 'step' || key === 'seconds') {
      if (typeof candidate === 'number'
        && Number.isInteger(candidate)
        && candidate >= rule[0]
        && candidate <= rule[1]) args[key] = candidate;
      continue;
    }
    const text = typeof candidate === 'string' ? candidate : '';
    if (rule.includes(text)) args[key] = text;
  }
  return args;
}

function safeToolCalls(value) {
  if (!Array.isArray(value)) return [];
  const calls = [];
  for (const candidate of value.slice(0, MAX_TOOL_CALLS_PER_TURN)) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const name = clean(candidate.name, 80);
    if (!Object.hasOwn(TOOL_ARG_RULES, name)) continue;
    calls.push({
      name,
      allowed: candidate.allowed === true,
      args: safeToolArgs(name, candidate.args),
      reason: typeof candidate.reason === 'string' ? clean(candidate.reason, 240) : ''
    });
  }
  return calls;
}

function safeUsage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const usage = {};
  let tokenTotal = 0;
  for (const key of USAGE_TOKEN_KEYS) {
    const parsed = Number(value[key]);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    usage[key] = Math.min(Math.round(parsed), MAX_USAGE_TOKENS);
    tokenTotal += usage[key];
  }
  if (!tokenTotal) return null;

  const updates = Number(value.updates);
  if (Number.isFinite(updates) && updates > 0) usage.updates = Math.min(Math.round(updates), MAX_USAGE_UPDATES);
  return usage;
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
  const rawSessionStarted = Date.parse(clean(body.sessionStartedAt, 40));
  const minSessionStarted = completedMs - 7 * 24 * 60 * 60 * 1000;
  const sessionStartedMs = Number.isFinite(rawSessionStarted)
    ? Math.max(minSessionStarted, Math.min(startedMs, rawSessionStarted))
    : startedMs;
  return {
    sessionStartedAt: new Date(sessionStartedMs).toISOString(),
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
    visitorId: clean(body.visitorId, 180),
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
    toolCalls: safeToolCalls(body.toolCalls),
    usage: safeUsage(body.usage),
    ...timestamps,
    page: clean(body.page, 160)
  };
}

// 마지막 대화 턴 이후 남은 토큰을 세션 단위로 정산하는 페이로드. 전사 텍스트는 포함하지 않는다.
function sessionUsagePayload(body) {
  const timestamps = turnTimestamps(body);
  return {
    sessionId: clean(body.sessionId, 140),
    usageId: clean(body.usageId, 80),
    visitorId: clean(body.visitorId, 180),
    model: clean(body.model, 160),
    recipeId: clean(body.recipeId, 80),
    recipe: clean(body.recipe, 200),
    reason: clean(body.reason, 40),
    turns: integer(body.turns, 0, 100_000),
    loggedTurns: integer(body.loggedTurns, 0, 10_000),
    usage: safeUsage(body.usage),
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
    const body = await readBody(req, 16_000);
    if (clean(body.kind, 40) === 'session-usage') {
      const session = sessionUsagePayload(body);
      if (!session.sessionId || !session.usage) {
        json(res, 400, { error: 'sessionId와 usage가 필요합니다.' });
        return;
      }
      await recordSessionUsage(session);
      json(res, 202, { ok: true, storedBy: 'langfuse', sessionId: session.sessionId });
      return;
    }

    const payload = turnPayload(body);
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

module.exports._test = {
  requestOriginAllowed,
  safeToolArgs,
  safeToolCalls,
  safeUsage,
  sessionUsagePayload,
  turnPayload,
  turnTimestamps
};
