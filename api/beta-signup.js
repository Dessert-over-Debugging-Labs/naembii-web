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
      email: clean(body.email, 320),
      name: clean(body.name, 120),
      profile: clean(body.profile, 80),
      note: clean(body.note, 3000),
      source: clean(body.source, 120),
      page: clean(body.page, 500),
      createdAt: clean(body.createdAt, 80) || new Date().toISOString()
    };

    if (!isEmail(payload.email)) {
      json(res, 400, { error: '이메일을 확인해주세요.' });
      return;
    }

    const storedBy = await persist('beta-signup', payload);
    json(res, 200, { ok: true, storedBy });
  } catch (error) {
    json(res, 500, { error: error.message || '신청 저장에 실패했습니다.' });
  }
};
