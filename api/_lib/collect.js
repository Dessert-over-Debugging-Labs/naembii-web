function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        req.destroy();
        reject(new Error('요청이 너무 큽니다.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON 형식이 아닙니다.'));
      }
    });
    req.on('error', reject);
  });
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function clean(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function issueBody(kind, payload) {
  const entries = Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => `| ${key} | ${String(value).replace(/\n/g, '<br>')} |`)
    .join('\n');

  return [
    `자동 수집된 ${kind} 항목입니다.`,
    '',
    '| field | value |',
    '|---|---|',
    entries || '| empty | - |'
  ].join('\n');
}

async function sendWebhook(kind, payload) {
  const url = process.env.COOK_BETA_WEBHOOK_URL;
  if (!url) return false;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, payload })
  });

  if (!response.ok) {
    throw new Error(`webhook 저장 실패: ${response.status}`);
  }

  return true;
}

function parseFieldMap(kind) {
  const specific = kind === 'beta-signup'
    ? process.env.COOK_BETA_GOOGLE_FORM_FIELDS_BETA
    : process.env.COOK_BETA_GOOGLE_FORM_FIELDS_FEEDBACK;
  const raw = specific || process.env.COOK_BETA_GOOGLE_FORM_FIELDS;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Google Form 필드 매핑 JSON 형식을 확인하세요.');
  }
}

async function sendGoogleForm(kind, payload) {
  const url = process.env.COOK_BETA_GOOGLE_FORM_URL;
  const fields = parseFieldMap(kind);
  if (!url || !fields) return false;

  const params = new URLSearchParams();
  const source = { kind, ...payload };

  for (const [key, entryId] of Object.entries(fields)) {
    if (!entryId) continue;
    const value = source[key];
    if (value === undefined || value === null || String(value).trim() === '') continue;
    params.append(entryId, String(value));
  }

  if (![...params.keys()].length) {
    throw new Error('Google Form으로 보낼 필드가 없습니다. entry ID 매핑을 확인하세요.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: params
  });

  if (response.status >= 400) {
    throw new Error(`Google Form 저장 실패: ${response.status}`);
  }

  return true;
}

async function createGithubIssue(kind, payload) {
  const token = process.env.COOK_BETA_GITHUB_TOKEN;
  const repo = process.env.COOK_BETA_GITHUB_REPO;
  if (!token || !repo) return false;

  const labels = (process.env.COOK_BETA_GITHUB_LABELS || `cook-beta,${kind}`)
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);

  const email = payload.email ? ` · ${payload.email}` : '';
  const title = kind === 'beta-signup'
    ? `[beta] ${payload.name || '신규 신청'}${email}`
    : `[feedback] ${payload.type || '의견'} · ${payload.screen || payload.source || 'unknown'}`;

  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28'
    },
    body: JSON.stringify({
      title,
      body: issueBody(kind, payload),
      labels
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub Issue 저장 실패: ${response.status} ${text.slice(0, 180)}`);
  }

  return true;
}

async function persist(kind, payload) {
  if (await sendGoogleForm(kind, payload)) return 'google-form';
  if (await sendWebhook(kind, payload)) return 'webhook';
  if (await createGithubIssue(kind, payload)) return 'github';
  throw new Error('수집 저장소가 설정되지 않았습니다. COOK_BETA_GOOGLE_FORM_URL/COOK_BETA_GOOGLE_FORM_FIELDS 또는 COOK_BETA_WEBHOOK_URL 또는 COOK_BETA_GITHUB_TOKEN/COOK_BETA_GITHUB_REPO를 Vercel 환경변수에 설정하세요.');
}

function allowCors(req, res) {
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return true;
  }
  return false;
}

module.exports = {
  allowCors,
  clean,
  isEmail,
  json,
  persist,
  readBody
};
