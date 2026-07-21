import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  conversationInput,
  cookingContextMessage,
  hashVisitorId,
  redactSensitive,
  redactString,
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

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const hook = html.match(/function recordVpTraceTurn[\s\S]*?\n  function latestVpTranscriptHistoryTurn/)?.[0] || '';
assert.match(hook, /fetch\('\/api\/ai-trace'/);
assert.match(hook, /userText,assistantText/);
assert.doesNotMatch(hook, /inlineData|pendingPcm|resumeReplay|audioStream|base64/i);
assert.match(html, /if\(transcript\.hasUser&&!transcript\.complete\)/);
assert.match(html, /recordVpTraceTurn\(live,state,'interrupted'\)/);
assert.match(html, /recordVpTraceTurn\(live,transcript,'abandoned'\)/);

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
