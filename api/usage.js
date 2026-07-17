const { allowCors, clean, json, readBody, sendWebhook } = require('./_lib/collect');

// Google Form 채널은 피드백용 entry 매핑과 스키마가 달라 usage에는 쓰지 않는다.
// 저장 우선순위: 전용 webhook(NAEMBI_USAGE_WEBHOOK_URL, Apps Script 시트) → 공용 webhook → 함수 로그.
async function sendUsageWebhook(payload) {
  const url = process.env.NAEMBI_USAGE_WEBHOOK_URL || '';
  if (!url) return false;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'usage', payload })
  });

  if (!response.ok) {
    throw new Error(`usage webhook 저장 실패: ${response.status}`);
  }

  return true;
}

function num(value, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(Math.round(parsed * 10) / 10, max);
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store, max-age=0');
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') {
    json(res, 405, { error: 'POST만 지원합니다.' });
    return;
  }

  try {
    const body = await readBody(req);
    const payload = {
      requestId: clean(body.requestId, 100),
      usageId: clean(body.usageId, 80),
      uid: clean(body.uid, 80),
      seq: num(body.seq, 100000),
      final: body.final === true,
      reason: clean(body.reason, 40),
      model: clean(body.model, 120),
      recipe: clean(body.recipe, 160),
      recipeId: clean(body.recipeId, 40),
      sessionStartedAt: clean(body.sessionStartedAt, 40),
      cookStartedAt: clean(body.cookStartedAt, 40),
      cookEndedAt: clean(body.cookEndedAt, 40),
      cookCompleted: body.cookCompleted === true,
      connectCount: num(body.connectCount, 10000),
      goAwayCount: num(body.goAwayCount, 10000),
      totalOpenMs: num(body.totalOpenMs),
      sentAudioSeconds: num(body.sentAudioSeconds),
      estInputAudioTokens: num(body.estInputAudioTokens),
      turns: num(body.turns, 1000000),
      promptTokensLast: num(body.promptTokensLast),
      promptTokensMax: num(body.promptTokensMax),
      promptTokensSum: num(body.promptTokensSum),
      responseTokensLast: num(body.responseTokensLast),
      responseTokensMax: num(body.responseTokensMax),
      responseTokensSum: num(body.responseTokensSum),
      totalTokensLast: num(body.totalTokensLast),
      totalTokensMax: num(body.totalTokensMax),
      promptAudioTokensSum: num(body.promptAudioTokensSum),
      promptTextTokensSum: num(body.promptTextTokensSum),
      responseAudioTokensSum: num(body.responseAudioTokensSum),
      responseTextTokensSum: num(body.responseTextTokensSum),
      page: clean(body.page, 200),
      createdAt: clean(body.createdAt, 40) || new Date().toISOString()
    };

    if (!payload.usageId || !payload.uid) {
      json(res, 400, { error: 'usageId와 uid가 필요합니다.' });
      return;
    }

    // 계측 실패가 사용자 흐름을 막으면 안 되므로 저장 실패는 200 + 함수 로그로 처리한다.
    let storedBy = 'log';
    try {
      if (await sendUsageWebhook(payload)) storedBy = 'usage-webhook';
      else if (await sendWebhook('usage', payload)) storedBy = 'webhook';
    } catch (error) {
      console.error('usage 저장 실패:', error.message || error);
    }
    if (storedBy === 'log') console.log('[usage]', JSON.stringify(payload));

    json(res, 200, { ok: true, storedBy, requestId: payload.requestId });
  } catch (error) {
    json(res, 500, { error: error.message || '사용량 저장에 실패했습니다.' });
  }
};
