const { createHmac } = require('node:crypto');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { LangfuseSpanProcessor } = require('@langfuse/otel');
const { propagateAttributes, startActiveObservation } = require('@langfuse/tracing');

let tracingState = null;

// Langfuse 모델 가격표는 usageDetails 키별로 단가를 매긴다.
// Gemini Live는 텍스트/오디오 단가가 다르므로 모달리티 4개 키로 나눠 보내고, 가격은 그 4개에만 등록한다.
// input/output/total은 Langfuse UI 합계 표시용이라 여기에 단가를 등록하면 이중 계상된다.
const USAGE_DETAIL_KEYS = Object.freeze({
  input: 'promptTokens',
  output: 'responseTokens',
  total: 'totalTokens',
  input_audio: 'promptAudioTokens',
  input_text: 'promptTextTokens',
  output_audio: 'responseAudioTokens',
  output_text: 'responseTextTokens'
});

function redactString(value) {
  return String(value || '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[이메일]')
    .replace(/\b\d{6}[-\s]?[1-8]\d{6}\b/g, '[주민·외국인등록번호]')
    .replace(/(?:\+?82[-.\s]?)?(?:0?10|0?1[16789]|0?2|0?[3-6][1-5]|0?50\d?|0?70|0?80)[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, '[전화번호]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[카드번호]');
}

function redactSensitive(value) {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactSensitive(item)]));
  }
  return value;
}

function langfuseConfigured() {
  if (String(process.env.NAEMBI_LANGFUSE_ENABLED || '').toLowerCase() === 'false') return false;
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

function getTracingState() {
  if (!langfuseConfigured()) return null;
  if (tracingState) return tracingState;

  const processor = new LangfuseSpanProcessor({
    exportMode: 'immediate',
    mediaUploadEnabled: false,
    mask: ({ data }) => redactSensitive(data)
  });
  const sdk = new NodeSDK({ spanProcessors: [processor] });
  sdk.start();
  tracingState = { processor, sdk };
  return tracingState;
}

function validDate(value) {
  const date = new Date(value || '');
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function boundedString(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

function hashVisitorId(visitorId, secret = process.env.NAEMBI_USER_HASH_SECRET || process.env.LANGFUSE_SECRET_KEY) {
  const source = boundedString(visitorId, 180);
  const key = String(secret || '').trim();
  if (!source || !key) return '';
  return `visitor_${createHmac('sha256', key).update(source, 'utf8').digest('hex').slice(0, 24)}`;
}

function turnDisplayName(turn) {
  const recipe = boundedString(turn?.recipe, 80) || '현재 레시피';
  const stepIndex = Number.isInteger(Number(turn?.stepIndex)) ? Number(turn.stepIndex) : 0;
  const totalSteps = Number.isInteger(Number(turn?.totalSteps)) ? Number(turn.totalSteps) : 0;
  const step = stepIndex > 0
    ? `${stepIndex}${totalSteps > 0 ? `/${totalSteps}` : ''}단계`
    : '단계 미지정';
  const turnNumber = Number.isInteger(Number(turn?.turnNumber)) ? Number(turn.turnNumber) : 1;
  return boundedString(`${recipe} · ${step} · ${turnNumber}턴`, 200);
}

function traceMetadata(turn) {
  const metadata = {
    turnId: turn?.turnId,
    turnNumber: turn?.turnNumber,
    sessionId: turn?.sessionId,
    sessionStartedAt: turn?.sessionStartedAt,
    recipeId: turn?.recipeId,
    recipe: turn?.recipe,
    stepIndex: turn?.stepIndex,
    totalSteps: turn?.totalSteps,
    stepTitle: turn?.stepTitle,
    cookingStatus: turn?.cookingStatus,
    turnStatus: turn?.turnStatus,
    page: turn?.page
  };
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, boundedString(value, 200)])
  );
}

function cookingContextMessage(turn) {
  const recipe = boundedString(turn?.recipe, 200) || '현재 레시피';
  const stepIndex = Number(turn?.stepIndex) || 0;
  const totalSteps = Number(turn?.totalSteps) || 0;
  const stepTitle = boundedString(turn?.stepTitle, 240) || '현재 단계';
  const status = boundedString(turn?.cookingStatus, 40) || 'cooking';
  const turnNumber = Number(turn?.turnNumber) || 1;
  const sessionStartedAt = boundedString(turn?.sessionStartedAt, 40) || '알 수 없음';
  return [
    '[요리 세션 맥락]',
    `레시피: ${recipe}`,
    `현재 단계: ${stepIndex}${totalSteps ? `/${totalSteps}` : ''} · ${stepTitle}`,
    `조리 상태: ${status}`,
    `대화 턴: ${turnNumber}`,
    `세션 시작: ${sessionStartedAt}`
  ].join('\n');
}

function generationUsageDetails(usage) {
  if (!usage || typeof usage !== 'object') return null;

  const details = {};
  for (const [detailKey, usageKey] of Object.entries(USAGE_DETAIL_KEYS)) {
    const value = Number(usage[usageKey]);
    if (Number.isFinite(value) && value > 0) details[detailKey] = value;
  }
  return Object.keys(details).length ? details : null;
}

// 토큰 자체는 식별정보가 아니므로 마스킹 대상이 아니지만, 가중치·집계 횟수는 비용 키와 섞이면 안 되어 메타데이터로 뺀다.
function usageMetadata(usage) {
  if (!usage || typeof usage !== 'object') return {};
  return {
    weightedTokens: usage.weightedTokens,
    usageUpdates: usage.updates
  };
}

function conversationInput(turn) {
  return [
    { role: 'system', content: cookingContextMessage(turn) },
    { role: 'user', content: boundedString(turn?.userText, 3_000) }
  ];
}

async function recordConversationTurn(turn) {
  const state = getTracingState();
  if (!state) return { stored: false, reason: 'not-configured' };

  const userId = hashVisitorId(turn?.visitorId);
  const { visitorId: _visitorId, ...turnWithoutVisitor } = turn || {};
  const safeTurn = redactSensitive(turnWithoutVisitor);
  const startedAt = validDate(safeTurn.startedAt);
  const displayName = turnDisplayName(safeTurn);
  const propagatedMetadata = traceMetadata(safeTurn);
  const usageDetails = generationUsageDetails(safeTurn.usage);
  try {
    await propagateAttributes(
      {
        traceName: displayName,
        ...(userId ? { userId } : {}),
        sessionId: safeTurn.sessionId,
        metadata: propagatedMetadata,
        tags: ['voice-assistant', 'cooking', 'no-raw-audio', 'usage-metered', `turn-${safeTurn.turnStatus || 'completed'}`],
        version: '3'
      },
      async () => startActiveObservation(
        displayName,
        async (generation) => {
          generation.update({
            model: safeTurn.model || undefined,
            input: conversationInput(safeTurn),
            output: { role: 'assistant', content: safeTurn.assistantText },
            ...(usageDetails ? { usageDetails } : {}),
            metadata: {
              ...usageMetadata(safeTurn.usage),
              ...(userId ? { userId } : {}),
              sessionId: safeTurn.sessionId,
              sessionStartedAt: safeTurn.sessionStartedAt,
              turnId: safeTurn.turnId,
              turnNumber: safeTurn.turnNumber,
              recipeId: safeTurn.recipeId,
              recipe: safeTurn.recipe,
              stepIndex: safeTurn.stepIndex,
              totalSteps: safeTurn.totalSteps,
              stepTitle: safeTurn.stepTitle,
              cookingStatus: safeTurn.cookingStatus,
              turnStatus: safeTurn.turnStatus,
              startedAt: safeTurn.startedAt,
              completedAt: safeTurn.completedAt,
              receivedAt: safeTurn.receivedAt,
              page: safeTurn.page,
              toolCalls: safeTurn.toolCalls || [],
              redactionVersion: '2'
            }
          });
        },
        { asType: 'generation', ...(startedAt ? { startTime: startedAt } : {}) }
      )
    );
    await state.processor.forceFlush();
    return { stored: true };
  } catch (error) {
    try {
      await state.processor.forceFlush();
    } catch {}
    throw error;
  }
}

function sessionUsageDisplayName(session) {
  const recipe = boundedString(session?.recipe, 80) || '현재 레시피';
  return boundedString(`${recipe} · 세션 잔여 사용량`, 200);
}

function sessionUsageMessage(session) {
  const recipe = boundedString(session?.recipe, 200) || '현재 레시피';
  const turns = Number(session?.turns) || 0;
  const loggedTurns = Number(session?.loggedTurns) || 0;
  return [
    '[세션 잔여 사용량 정산]',
    `레시피: ${recipe}`,
    `usageMetadata 수신: ${turns}회 · 대화 턴으로 기록: ${loggedTurns}회`,
    `정산 사유: ${boundedString(session?.reason, 40) || '세션 종료'}`,
    '마지막 대화 턴 이후 남은 토큰만 담긴 항목이라 사용자·냄비 발화는 없습니다.'
  ].join('\n');
}

// 대화 턴에 귀속되지 않은 토큰(응답 꼬리, 도구 호출 전용 구간)을 세션 단위 generation으로 남긴다.
// 이 항목까지 합쳐야 Langfuse 비용 집계가 실제 Gemini 사용량과 맞는다.
async function recordSessionUsage(session) {
  const state = getTracingState();
  if (!state) return { stored: false, reason: 'not-configured' };

  const userId = hashVisitorId(session?.visitorId);
  const { visitorId: _visitorId, ...sessionWithoutVisitor } = session || {};
  const safeSession = redactSensitive(sessionWithoutVisitor);
  const usageDetails = generationUsageDetails(safeSession.usage);
  if (!usageDetails) return { stored: false, reason: 'empty-usage' };

  const startedAt = validDate(safeSession.startedAt);
  const displayName = sessionUsageDisplayName(safeSession);
  try {
    await propagateAttributes(
      {
        traceName: displayName,
        ...(userId ? { userId } : {}),
        sessionId: safeSession.sessionId,
        metadata: {
          sessionId: boundedString(safeSession.sessionId, 200),
          recipe: boundedString(safeSession.recipe, 200),
          recipeId: boundedString(safeSession.recipeId, 200),
          reason: boundedString(safeSession.reason, 200)
        },
        tags: ['voice-assistant', 'cooking', 'no-raw-audio', 'usage-metered', 'session-residual'],
        version: '3'
      },
      async () => startActiveObservation(
        displayName,
        async (generation) => {
          generation.update({
            model: safeSession.model || undefined,
            input: { role: 'system', content: sessionUsageMessage(safeSession) },
            usageDetails,
            metadata: {
              ...usageMetadata(safeSession.usage),
              ...(userId ? { userId } : {}),
              sessionId: safeSession.sessionId,
              sessionStartedAt: safeSession.sessionStartedAt,
              usageId: safeSession.usageId,
              recipeId: safeSession.recipeId,
              recipe: safeSession.recipe,
              reason: safeSession.reason,
              usageUpdatesTotal: safeSession.turns,
              loggedTurns: safeSession.loggedTurns,
              startedAt: safeSession.startedAt,
              completedAt: safeSession.completedAt,
              receivedAt: safeSession.receivedAt,
              page: safeSession.page,
              redactionVersion: '2'
            }
          });
        },
        { asType: 'generation', ...(startedAt ? { startTime: startedAt } : {}) }
      )
    );
    await state.processor.forceFlush();
    return { stored: true };
  } catch (error) {
    try {
      await state.processor.forceFlush();
    } catch {}
    throw error;
  }
}

module.exports = {
  conversationInput,
  cookingContextMessage,
  generationUsageDetails,
  hashVisitorId,
  langfuseConfigured,
  recordConversationTurn,
  recordSessionUsage,
  redactSensitive,
  redactString,
  sessionUsageMessage,
  traceMetadata,
  turnDisplayName
};
