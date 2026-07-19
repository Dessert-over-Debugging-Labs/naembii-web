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

async function recordConversationTurn(turn) {
  const state = getTracingState();
  if (!state) return { stored: false, reason: 'not-configured' };

  const safeTurn = redactSensitive(turn);
  const startedAt = validDate(safeTurn.startedAt);
  try {
    await propagateAttributes(
      {
        traceName: 'voice-cooking-turn',
        sessionId: safeTurn.sessionId,
        tags: ['voice-assistant', 'cooking', 'transcript-only'],
        version: '1'
      },
      async () => startActiveObservation(
        'gemini-live-turn',
        async (generation) => {
          generation.update({
            model: safeTurn.model || undefined,
            input: [{ role: 'user', content: safeTurn.userText }],
            output: { role: 'assistant', content: safeTurn.assistantText },
            metadata: {
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
              redactionVersion: '1'
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
  langfuseConfigured,
  recordConversationTurn,
  redactSensitive,
  redactString
};
