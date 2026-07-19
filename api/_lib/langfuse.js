const { createHmac } = require('node:crypto');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { LangfuseSpanProcessor } = require('@langfuse/otel');
const { propagateAttributes, startActiveObservation } = require('@langfuse/tracing');

let tracingState = null;

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
  try {
    await propagateAttributes(
      {
        traceName: displayName,
        ...(userId ? { userId } : {}),
        sessionId: safeTurn.sessionId,
        metadata: propagatedMetadata,
        tags: ['voice-assistant', 'cooking', 'transcript-only', `turn-${safeTurn.turnStatus || 'completed'}`],
        version: '2'
      },
      async () => startActiveObservation(
        displayName,
        async (generation) => {
          generation.update({
            model: safeTurn.model || undefined,
            input: conversationInput(safeTurn),
            output: { role: 'assistant', content: safeTurn.assistantText },
            metadata: {
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

module.exports = {
  conversationInput,
  cookingContextMessage,
  hashVisitorId,
  langfuseConfigured,
  recordConversationTurn,
  redactSensitive,
  redactString,
  traceMetadata,
  turnDisplayName
};
