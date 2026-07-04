const { allowCors, clean, isEmail, json, persist, readBody } = require('./_lib/collect');

module.exports = async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') {
    json(res, 405, { error: 'POST만 지원합니다.' });
    return;
  }

  try {
    const body = await readBody(req);
    const payload = {
      type: clean(body.type, 80) || 'other',
      email: clean(body.email, 320),
      message: clean(body.message, 5000),
      source: clean(body.source, 120),
      screen: clean(body.screen, 120),
      recipe: clean(body.recipe, 160),
      page: clean(body.page, 500),
      createdAt: clean(body.createdAt, 80) || new Date().toISOString()
    };

    if (!payload.message) {
      json(res, 400, { error: '피드백 내용을 입력해주세요.' });
      return;
    }

    if (payload.email && !isEmail(payload.email)) {
      json(res, 400, { error: '이메일 형식을 확인해주세요.' });
      return;
    }

    const storedBy = await persist('feedback', payload);
    json(res, 200, { ok: true, storedBy });
  } catch (error) {
    json(res, 500, { error: error.message || '피드백 저장에 실패했습니다.' });
  }
};
