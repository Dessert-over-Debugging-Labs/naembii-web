import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  conversationInput,
  cookingContextMessage,
  generationUsageDetails,
  hashVisitorId,
  redactSensitive,
  redactString,
  sessionUsageMessage,
  traceMetadata,
  turnDisplayName
} = require('../api/_lib/langfuse');
const { _test } = require('../api/ai-trace');

const raw = '연락처 010-1234-5678, 070-9876-5432, test@example.com, 900101-5234567, 4111 1111 1111 1111';
const redacted = redactString(raw);
assert.equal(redacted.includes('010-1234-5678'), false);
assert.equal(redacted.includes('070-9876-5432'), false);
assert.equal(redacted.includes('test@example.com'), false);
assert.equal(redacted.includes('900101-5234567'), false);
assert.equal(redacted.includes('4111 1111 1111 1111'), false);
assert.match(redacted, /\[전화번호\]/);
assert.match(redacted, /\[이메일\]/);
assert.equal(redactSensitive({ nested: [raw] }).nested[0], redacted);

const payload = _test.turnPayload({
  turnId: 'session:turn:1',
  sessionId: 'session',
  visitorId: 'private-browser-visitor-id',
  turnNumber: 1,
  userText: '질문',
  assistantText: '답변',
  recipe: '순두부찌개',
  stepIndex: 2,
  totalSteps: 5,
  stepTitle: '양념을 넣고 끓이기',
  turnStatus: 'interrupted',
  toolCalls: [
    {
      name: 'set_video_playback',
      allowed: true,
      args: { state: 'pause', direction: 'next', apiKey: 'must-not-pass', nested: { secret: true } },
      reason: '사용자가 영상을 멈춰 달라고 명시함',
      rawTranscript: 'must-not-pass'
    },
    { name: 'unknown_admin_tool', allowed: true, args: { token: 'must-not-pass' } }
  ],
  usage: {
    promptTokens: 1820,
    responseTokens: 640,
    totalTokens: 2460,
    promptAudioTokens: 1500,
    promptTextTokens: 320,
    responseAudioTokens: 600,
    responseTextTokens: 40,
    weightedTokens: 16160,
    updates: 3,
    injectedCost: 999999,
    promptTokensSum: 'must-not-pass'
  },
  inlineData: 'must-not-pass',
  audio: 'must-not-pass'
});
assert.equal(payload.turnId, 'session:turn:1');
assert.equal(payload.visitorId, 'private-browser-visitor-id');
assert.equal(payload.userText, '질문');
assert.equal(payload.turnStatus, 'interrupted');
assert.deepEqual(payload.toolCalls, [{
  name: 'set_video_playback',
  allowed: true,
  args: { state: 'pause' },
  reason: '사용자가 영상을 멈춰 달라고 명시함'
}]);
assert.equal(Object.hasOwn(payload, 'inlineData'), false);
assert.equal(Object.hasOwn(payload, 'audio'), false);

// 토큰 사용량: 화이트리스트 키만 통과하고, 임의 키는 Langfuse 비용 집계에 끼어들 수 없어야 한다.
assert.equal(Object.hasOwn(payload.usage, 'injectedCost'), false);
assert.equal(Object.hasOwn(payload.usage, 'promptTokensSum'), false);
assert.equal(payload.usage.promptAudioTokens, 1500);
assert.equal(payload.usage.updates, 3);
assert.equal(_test.safeUsage({ promptTokens: -5, responseTokens: 0 }), null);
assert.equal(_test.safeUsage('1000'), null);
assert.equal(_test.safeUsage({ promptTokens: 1e12 }).promptTokens, 20_000_000);
assert.equal(_test.safeUsage({ promptTokens: 10.6 }).promptTokens, 11);
assert.equal(_test.turnPayload({ userText: '질문' }).usage, null);

// 가격표는 모달리티 4개 키에만 등록하므로, 그 키들이 정확히 이 이름으로 나가야 비용이 계산된다.
const usageDetails = generationUsageDetails(payload.usage);
assert.deepEqual(usageDetails, {
  input: 1820,
  output: 640,
  total: 2460,
  input_audio: 1500,
  input_text: 320,
  output_audio: 600,
  output_text: 40
});
assert.equal(Object.hasOwn(usageDetails, 'weightedTokens'), false);
assert.equal(Object.hasOwn(usageDetails, 'updates'), false);
assert.equal(generationUsageDetails(null), null);
assert.equal(generationUsageDetails({ promptTokens: 0 }), null);
assert.deepEqual(generationUsageDetails({ responseAudioTokens: 12 }), { output_audio: 12 });

const sessionUsage = _test.sessionUsagePayload({
  kind: 'session-usage',
  sessionId: 'cook:21j8SASqLJU:gu1',
  usageId: 'gu1',
  visitorId: 'private-browser-visitor-id',
  model: 'gemini-3.1-flash-live-preview',
  recipe: '순두부찌개',
  reason: 'cook-complete',
  turns: 40,
  loggedTurns: 6,
  usage: { promptTokens: 300, responseAudioTokens: 120, updates: 4 },
  userText: 'must-not-pass',
  assistantText: 'must-not-pass',
  toolCalls: [{ name: 'set_video_playback', allowed: true, args: { state: 'pause' } }]
});
assert.equal(sessionUsage.sessionId, 'cook:21j8SASqLJU:gu1');
assert.equal(sessionUsage.loggedTurns, 6);
assert.deepEqual(sessionUsage.usage, { promptTokens: 300, responseAudioTokens: 120, updates: 4 });
// 잔여 정산 항목에는 전사 텍스트도 도구 호출도 실리지 않는다.
assert.equal(Object.hasOwn(sessionUsage, 'userText'), false);
assert.equal(Object.hasOwn(sessionUsage, 'assistantText'), false);
assert.equal(Object.hasOwn(sessionUsage, 'toolCalls'), false);
assert.equal(_test.sessionUsagePayload({ sessionId: 'cook:x:gu1' }).usage, null);
assert.match(sessionUsageMessage(sessionUsage), /세션 잔여 사용량 정산/);
assert.equal(sessionUsageMessage(sessionUsage).includes('must-not-pass'), false);

assert.deepEqual(_test.safeToolArgs('seek_video', {
  direction: 'forward', seconds: 10, token: 'must-not-pass'
}), { direction: 'forward', seconds: 10 });
assert.deepEqual(_test.safeToolArgs('set_video_repeat', { enabled: 'true' }), {});
assert.deepEqual(_test.safeToolArgs('set_video_speed', { speed: 1.5 }), {});
assert.deepEqual(_test.safeToolArgs('set_cooking_timer', { seconds: '300' }), {});
assert.deepEqual(_test.safeToolArgs('unknown_admin_tool', { enabled: true }), {});
assert.equal(_test.safeToolCalls(Array.from({ length: 20 }, () => ({
  name: 'show_cooking_ingredients', allowed: true, args: {}
}))).length, 12);

const rawVisitorId = 'private-browser-visitor-id';
const pseudonymousUserId = hashVisitorId(rawVisitorId, 'unit-test-hmac-secret');
assert.match(pseudonymousUserId, /^visitor_[a-f0-9]{24}$/);
assert.equal(pseudonymousUserId.includes(rawVisitorId), false);
assert.equal(hashVisitorId(rawVisitorId, 'unit-test-hmac-secret'), pseudonymousUserId);
assert.notEqual(hashVisitorId(rawVisitorId, 'different-secret'), pseudonymousUserId);
assert.equal(hashVisitorId('', 'unit-test-hmac-secret'), '');

const metadata = traceMetadata(payload);
assert.equal(metadata.sessionId, 'session');
assert.equal(metadata.recipe, '순두부찌개');
assert.equal(metadata.stepIndex, '2');
assert.equal(Object.values(metadata).every((value) => typeof value === 'string' && value.length <= 200), true);
assert.equal(JSON.stringify(metadata).includes(rawVisitorId), false);

const contextMessage = cookingContextMessage(payload);
assert.match(contextMessage, /\[요리 세션 맥락\]/);
assert.match(contextMessage, /순두부찌개/);
assert.match(contextMessage, /2\/5 · 양념을 넣고 끓이기/);
assert.equal(contextMessage.includes(rawVisitorId), false);
assert.equal(turnDisplayName(payload), '순두부찌개 · 2/5단계 · 1턴');
assert.deepEqual(conversationInput(payload).map(({ role }) => role), ['system', 'user']);
assert.equal(conversationInput(payload)[1].content, '질문');

const previousOrigins = process.env.NAEMBI_ALLOWED_ORIGINS;
process.env.NAEMBI_ALLOWED_ORIGINS = 'https://naembi.example';
assert.equal(_test.requestOriginAllowed({ headers: { origin: 'https://naembi.example' } }), true);
assert.equal(_test.requestOriginAllowed({ headers: { origin: 'https://attacker.example' } }), false);
if (previousOrigins === undefined) delete process.env.NAEMBI_ALLOWED_ORIGINS;
else process.env.NAEMBI_ALLOWED_ORIGINS = previousOrigins;

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const hook = html.match(/function recordVpTraceTurn[\s\S]*?\n  function latestVpTranscriptHistoryTurn/)?.[0] || '';
assert.match(hook, /fetch\('\/api\/ai-trace'/);
assert.match(hook, /userText,assistantText/);
assert.doesNotMatch(hook, /inlineData|pendingPcm|resumeReplay|audioStream|base64/i);
assert.match(html, /if\(transcript\.hasUser&&!transcript\.complete\)/);
assert.match(html, /recordVpTraceTurn\(live,state,'interrupted'\)/);
assert.match(html, /recordVpTraceTurn\(live,transcript,'abandoned'\)/);

// 턴 사용량은 커서 차분으로 붙고, 커서 전진은 중복 기록 가드를 통과한 뒤에만 일어나야 한다.
assert.match(hook, /guTakeBilledDelta\(guSession\)/);
assert.match(hook, /\.\.\.\(usage\?\{usage\}:\{\}\)/);
assert.equal(
  hook.indexOf('loggedTraceTurnIds?.add') < hook.indexOf('guTakeBilledDelta'),
  true,
  '커서를 중복 기록 가드보다 먼저 전진시키면 재호출 시 토큰이 유실된다.'
);

// 세션 잔여 사용량은 final 플러시에서만, 전사 텍스트 없이 나간다.
const residual = html.match(/function guFlushTraceResidual[\s\S]*?\n  function guFlush\(/)?.[0] || '';
assert.match(residual, /kind:'session-usage'/);
assert.match(residual, /guPost\('\/api\/ai-trace'/);
assert.doesNotMatch(residual, /userText|assistantText|inlineData|base64/i);
assert.match(html, /if\(final\)\{guFlushTraceResidual\(usage,reason\);guSession=null;/);

const bounded = _test.turnTimestamps({
  startedAt: '2000-01-01T00:00:00.000Z',
  completedAt: '2099-01-01T00:00:00.000Z'
}, Date.parse('2026-07-19T12:00:00.000Z'));
assert.equal(bounded.completedAt, '2026-07-19T12:00:00.000Z');
assert.equal(bounded.startedAt, '2026-07-19T06:00:00.000Z');
assert.equal(bounded.sessionStartedAt, bounded.startedAt);

const sessionTimestamps = _test.turnTimestamps({
  sessionStartedAt: '2026-07-19T10:00:00.000Z',
  startedAt: '2026-07-19T11:55:00.000Z',
  completedAt: '2026-07-19T12:00:00.000Z'
}, Date.parse('2026-07-19T12:00:01.000Z'));
assert.equal(sessionTimestamps.sessionStartedAt, '2026-07-19T10:00:00.000Z');

console.log('Langfuse conversation trace validation passed.');
