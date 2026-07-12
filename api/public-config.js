function boolEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'GET만 지원합니다.' });
    return;
  }

  const token = process.env.NAEMBI_MIXPANEL_TOKEN || '';
  const enabled = boolEnv(process.env.NAEMBI_MIXPANEL_ENABLED, Boolean(token));
  const debug = boolEnv(process.env.NAEMBI_MIXPANEL_DEBUG, false);

  const body = {
    app: 'naembi-web',
    phase: 'beta',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'local',
    mixpanel: {
      enabled: Boolean(enabled && token),
      token: enabled ? token : '',
      debug
    }
  };

  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.end();
    return;
  }

  json(res, 200, body);
};
