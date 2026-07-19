import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { redactSensitive, redactString } = require('../api/_lib/langfuse');
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
  turnNumber: 1,
  userText: '질문',
  assistantText: '답변',
  recipe: '순두부찌개',
  stepIndex: 2,
  totalSteps: 5,
  turnStatus: 'interrupted',
  inlineData: 'must-not-pass',
  audio: 'must-not-pass'
});
assert.equal(payload.turnId, 'session:turn:1');
assert.equal(payload.userText, '질문');
assert.equal(payload.turnStatus, 'interrupted');
assert.equal(Object.hasOwn(payload, 'inlineData'), false);
assert.equal(Object.hasOwn(payload, 'audio'), false);

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

const bounded = _test.turnTimestamps({
  startedAt: '2000-01-01T00:00:00.000Z',
  completedAt: '2099-01-01T00:00:00.000Z'
}, Date.parse('2026-07-19T12:00:00.000Z'));
assert.equal(bounded.completedAt, '2026-07-19T12:00:00.000Z');
assert.equal(bounded.startedAt, '2026-07-19T06:00:00.000Z');

console.log('Langfuse conversation trace validation passed.');
