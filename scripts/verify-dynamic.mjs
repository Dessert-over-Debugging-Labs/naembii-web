import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const args = new Set(process.argv.slice(2));
const argList = process.argv.slice(2);
const visual = args.has('--visual');
const full = args.has('--full') || args.has('--all');
const allowInconclusive = args.has('--allow-inconclusive');
const baseURL = valueAfter('--base-url') || 'http://127.0.0.1:4190/';
const reportMd = valueAfter('--report') || 'docs/verify/DYNAMIC_WORKFLOW_LAST_ko.md';
const reportHtml = reportMd.replace(/\.md$/i, '.html');
const reportJson = reportMd.replace(/\.md$/i, '.json');
const startedAt = new Date();
const visualArtifacts = [];

function valueAfter(name) {
  const inline = argList.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argList.indexOf(name);
  return index >= 0 ? argList[index + 1] : '';
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 12,
    ...options
  });
  return {
    command: [command, ...commandArgs].join(' '),
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    ok: result.status === 0
  };
}

function parseJsonFile(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function changedFiles() {
  const explicit = valueAfter('--files');
  if (explicit) {
    return explicit.split(',').map((item) => item.trim()).filter(Boolean);
  }

  const status = run('git', ['status', '--short']);
  if (!status.ok) return [];

  return status.stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const path = line.slice(3).trim();
      return path.includes(' -> ') ? path.split(' -> ').pop().trim() : path;
    });
}

function touches(files, matchers) {
  return files.some((file) => matchers.some((matcher) => (
    typeof matcher === 'string' ? file === matcher || file.startsWith(`${matcher}/`) : matcher.test(file)
  )));
}

function pass(name, detail, fix = '') {
  return { name, status: 'PASS', detail, fix };
}

function fail(name, detail, fix = '') {
  return { name, status: 'FAIL', detail, fix };
}

function inconclusive(name, detail, fix = '') {
  return { name, status: 'INCONCLUSIVE', detail, fix };
}

function scoreItem(name, weight, points, evidence, fix = '') {
  const normalized = Math.max(0, Math.min(weight, points));
  return {
    name,
    weight,
    points: normalized,
    percent: weight ? Math.round((normalized / weight) * 100) : 0,
    evidence,
    fix
  };
}

function truncate(text, max = 480) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function hasScript(name) {
  const packageJson = parseJsonFile('package.json');
  return Boolean(packageJson.scripts?.[name]);
}

function coreChecks() {
  const gates = [];

  try {
    const packageJson = parseJsonFile('package.json');
    const needed = ['dev', 'check', 'verify:dynamic'];
    const missing = needed.filter((name) => !packageJson.scripts?.[name]);
    gates.push(missing.length
      ? fail('package scripts', `누락: ${missing.join(', ')}`, 'package.json scripts에 dev/check/verify:dynamic을 유지한다.')
      : pass('package scripts', 'dev/check/verify:dynamic 스크립트 확인'));
  } catch (error) {
    gates.push(fail('package scripts', error.message, 'package.json JSON 형식과 scripts를 복구한다.'));
  }

  try {
    const vercel = parseJsonFile('vercel.json');
    const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
    const hasAppRewrite = rewrites.some((item) => item.source === '/app' && item.destination === '/app.html');
    const rootNotApp = !rewrites.some((item) => item.source === '/' && item.destination === '/app.html');
    gates.push(hasAppRewrite && rootNotApp
      ? pass('vercel app route', '/app -> /app.html, 루트는 index.html 진입')
      : fail('vercel app route', '루트/앱 라우팅이 랜딩+웹앱 분리 구조가 아님', 'vercel.json은 /app -> /app.html만 rewrite하고 루트는 index.html로 둔다.'));
  } catch (error) {
    gates.push(fail('vercel app route', error.message, 'vercel.json JSON 형식을 복구한다.'));
  }

  if (!existsSync(resolve(root, 'index.html'))) {
    gates.push(fail('landing entry', 'index.html 없음', '루트 랜딩 엔트리를 복구한다.'));
  } else {
    const html = read('index.html');
    const required = [
      ['href="/app"', '지금 써보기 CTA'],
      ['data-assistant-survey="true"', '요리비서 대화형 추천'],
      ['/assets/screens/app-home.png', '홈 정적 캡쳐'],
      ['/assets/screens/app-search.png', '검색 정적 캡쳐'],
      ['/assets/screens/app-detail.png', '상세 정적 캡쳐'],
      ['/assets/screens/app-cook.png', '조리 정적 캡쳐'],
      ['/assets/screens/app-complete.png', '완료 정적 캡쳐'],
      ['recipeRequestForm', '레시피 요청 폼'],
      ['betaForm', '베타 신청 폼']
    ];
    const missing = required.filter(([needle]) => !html.includes(needle)).map(([, label]) => label);
    gates.push(missing.length
      ? fail('landing structure', `누락: ${missing.join(', ')}`, 'index.html의 사용자 후킹 카피/정적 캡쳐/미리 써보기/요리 보내기 구조를 복구한다.')
      : pass('landing structure', '사용자 후킹 카피, 정적 앱 캡쳐, 미리 써보기/요리 보내기 폼 확인'));
  }

  if (!existsSync(resolve(root, 'app.html'))) {
    gates.push(fail('app entry', 'app.html 없음', '/app 웹앱 엔트리를 복구한다.'));
  } else {
    const html = read('app.html');
    const required = [
      ['isStandaloneAppPath', '/app 기본 앱 홈 진입'],
      ['id="home"', '앱 홈 화면'],
      ['id="cook3"', '조리 모드'],
      ['feedbackForm', '앱 피드백 폼'],
      ['id="communityStrip"', '후기/팁 스트립'],
      ['shareCompletedRecipe', '완료 후 공유 루프'],
      ['app-feedback-btn', '폰 화면 내부 플로팅 피드백']
    ];
    const missing = required.filter(([needle]) => !html.includes(needle)).map(([, label]) => label);
    gates.push(missing.length
      ? fail('app structure', `누락: ${missing.join(', ')}`, '/app 웹앱 진입과 핵심 화면 구조를 복구한다.')
      : pass('app structure', '/app 기본 앱 홈, 조리 모드, 피드백 폼 확인'));
  }

  if (!existsSync(resolve(root, 'design.html'))) {
    gates.push(fail('design review page', 'design.html 없음', '/design 브랜드·서비스 시안 페이지를 복구한다.'));
  } else {
    const html = read('design.html');
    const required = [
      ['data-mark="hero-character"', '대표 캐릭터 시안'],
      ['data-steam-count="3"', '김 물결 3개 규칙'],
      ['data-play-nose="true"', '재생 버튼 코 규칙'],
      ['data-smile-mouth="true"', '웃는 입 규칙'],
      ['data-handle-ear="true"', '손잡이 귀 규칙'],
      ['data-identity-scorecard="100"', '아이덴티티 점수표'],
      ['data-layout-candidates="assistant-first"', '음성비서 중심 배치 시안'],
      ['data-community-feasibility="true"', '후기/상호작용 현실성 검토']
    ];
    const missing = required.filter(([needle]) => !html.includes(needle)).map(([, label]) => label);
    gates.push(missing.length
      ? fail('design review page', `누락: ${missing.join(', ')}`, '/design 페이지에 브랜드 후보, 캐릭터 규칙, 서비스 배치, 현실성 검토를 유지한다.')
      : pass('design review page', '브랜드 캐릭터, 점수표, 서비스 배치, 현실성 검토 확인'));
  }

  {
    const publicHtml = `${existsSync(resolve(root, 'index.html')) ? read('index.html') : ''}\n${existsSync(resolve(root, 'app.html')) ? read('app.html') : ''}`;
    const forbidden = ['Notion', 'notion', 'v2', 'v3', 'Ralph', '랄프', 'API', 'Vercel', 'GitHub', 'webhook', '환경변수', '프로토타입', 'AWS', '페이지 안에'];
    const found = forbidden.filter((term) => publicHtml.includes(term));
    gates.push(found.length
      ? fail('public copy static guard', `공개 HTML 원문 금지어: ${found.join(', ')}`, '사용자 공개 화면/HTML에서 내부 작업 용어를 제거한다.')
      : pass('public copy static guard', '공개 HTML 내부 작업 용어 0건'));
  }

  const syntax = run(process.execPath, ['scripts/check-app-script.mjs']);
  gates.push(syntax.ok
    ? pass('inline script syntax', 'app.html inline script 문법 통과')
    : fail('inline script syntax', truncate(syntax.stderr || syntax.stdout), 'inline script 문법 오류를 먼저 고친다.'));

  return gates;
}

async function apiChecks() {
  const gates = [];
  const files = ['api/_lib/collect.js', 'api/beta-signup.js', 'api/feedback.js'];

  for (const file of files) {
    const syntax = run(process.execPath, ['--check', file]);
    gates.push(syntax.ok
      ? pass(`api syntax: ${file}`, '문법 통과')
      : fail(`api syntax: ${file}`, truncate(syntax.stderr || syntax.stdout), `${file} 문법 오류를 수정한다.`));
  }

  gates.push(...await apiValidationChecks());
  return gates;
}

function mockRequest(method, body) {
  const req = new EventEmitter();
  req.method = method;
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
  });
  return req;
}

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    writeHead(status, headers = {}) {
      this.statusCode = status;
      for (const [key, value] of Object.entries(headers)) this.setHeader(key, value);
    },
    end(body = '') {
      this.body = String(body);
      this.finished = true;
      this.resolve?.(this);
    }
  };
  res.done = new Promise((resolve) => {
    res.resolve = resolve;
  });
  return res;
}

async function callHandler(file, method, body) {
  const handler = require(resolve(root, file));
  const req = mockRequest(method, body);
  const res = mockResponse();
  await handler(req, res);
  if (!res.finished) await res.done;
  let parsed = null;
  try {
    parsed = res.body ? JSON.parse(res.body) : null;
  } catch {}
  return { statusCode: res.statusCode, body: parsed || res.body };
}

async function apiValidationChecks() {
  const gates = [];

  try {
    const beta = await callHandler('api/beta-signup.js', 'POST', { email: 'bad-email' });
    gates.push(beta.statusCode === 400
      ? pass('api validation: beta email', '잘못된 이메일 400 응답')
      : fail('api validation: beta email', `기대 400, 실제 ${beta.statusCode}`, '베타 신청 이메일 검증을 복구한다.'));
  } catch (error) {
    gates.push(fail('api validation: beta email', error.message, 'API 핸들러 호출 가능 상태를 복구한다.'));
  }

  try {
    const feedback = await callHandler('api/feedback.js', 'POST', { email: 'user@example.com', message: '' });
    gates.push(feedback.statusCode === 400
      ? pass('api validation: feedback required', '빈 피드백 400 응답')
      : fail('api validation: feedback required', `기대 400, 실제 ${feedback.statusCode}`, '피드백 필수 내용 검증을 복구한다.'));
  } catch (error) {
    gates.push(fail('api validation: feedback required', error.message, 'API 핸들러 호출 가능 상태를 복구한다.'));
  }

  try {
    const feedback = await callHandler('api/feedback.js', 'POST', { email: 'bad-email', message: '테스트' });
    gates.push(feedback.statusCode === 400
      ? pass('api validation: feedback email', '잘못된 선택 이메일 400 응답')
      : fail('api validation: feedback email', `기대 400, 실제 ${feedback.statusCode}`, '피드백 이메일 형식 검증을 복구한다.'));
  } catch (error) {
    gates.push(fail('api validation: feedback email', error.message, 'API 핸들러 호출 가능 상태를 복구한다.'));
  }

  return gates;
}

function deployChecks() {
  const gates = [];
  const env = existsSync(resolve(root, '.env.example')) ? read('.env.example') : '';
  const requiredEnv = ['NAEMBI_BETA_GOOGLE_FORM_URL', 'NAEMBI_BETA_GOOGLE_FORM_FIELDS', 'NAEMBI_BETA_WEBHOOK_URL', 'NAEMBI_BETA_GITHUB_REPO', 'NAEMBI_BETA_GITHUB_TOKEN'];
  const missingEnv = requiredEnv.filter((name) => !env.includes(name));
  gates.push(missingEnv.length
    ? fail('deploy env contract', `누락: ${missingEnv.join(', ')}`, '.env.example에 배포 수집 환경변수를 문서화한다.')
    : pass('deploy env contract', 'Google Form/webhook/GitHub 수집 환경변수 문서화 확인'));

  const ignored = existsSync(resolve(root, '.vercelignore')) ? read('.vercelignore') : '';
  const expectedIgnores = ['docs/', 'scripts/', '.env'];
  const missingIgnores = expectedIgnores.filter((item) => !ignored.includes(item));
  gates.push(missingIgnores.length
    ? fail('vercel ignore hygiene', `누락: ${missingIgnores.join(', ')}`, '.vercelignore에서 검증 문서/스크립트/환경파일을 배포 제외한다.')
    : pass('vercel ignore hygiene', 'docs/scripts/.env 배포 제외 확인'));

  gates.push(hasScript('verify:dynamic')
    ? pass('workflow script hook', 'npm run verify:dynamic 가능')
    : fail('workflow script hook', 'verify:dynamic script 없음', 'package.json scripts에 verify:dynamic을 추가한다.'));

  return gates;
}

function docsChecks() {
  const gates = [];
  const required = [
    'docs/verify/DYNAMIC_WORKFLOW_ko.md',
    'docs/verify/LANDING_RALPH_SCORE_ko.md'
  ];
  const missing = required.filter((file) => !existsSync(resolve(root, file)));
  gates.push(missing.length
    ? fail('verification docs', `누락: ${missing.join(', ')}`, '동적 워크플로우와 랜딩 검증 문서를 유지한다.')
    : pass('verification docs', '동적 워크플로우/랜딩 검증 문서 확인'));
  return gates;
}

function visualChecks() {
  const gates = [];
  const outDir = '/tmp/cook-wireframe-v3';
  const runs = [
    ['mobile', `${outDir}/dynamic-mobile.png`, '9341'],
    ['tablet', `${outDir}/dynamic-tablet.png`, '9342'],
    ['desktop', `${outDir}/dynamic-desktop.png`, '9343']
  ];

  for (const [mode, out, port] of runs) {
    const result = run(process.execPath, ['scripts/capture-landing.mjs', baseURL, out, mode, port], { timeout: 30000 });
    if (!result.ok) {
      const output = truncate(result.stderr || result.stdout);
      const status = /Chrome CDP|page target|operation not permitted|ECONNREFUSED/i.test(output) ? inconclusive : fail;
      visualArtifacts.push({ mode, out, status: status === inconclusive ? 'INCONCLUSIVE' : 'FAIL', error: output });
      gates.push(status(`visual capture: ${mode}`, output, '로컬 서버와 Chrome headless 권한을 확인한 뒤 --visual을 재실행한다.'));
      continue;
    }

    let payload = null;
    try {
      payload = JSON.parse(result.stdout);
    } catch {
      visualArtifacts.push({ mode, out, status: 'FAIL', error: 'capture JSON 파싱 실패' });
      gates.push(fail(`visual capture: ${mode}`, 'capture JSON 파싱 실패', 'capture-landing 출력 형식을 JSON으로 유지한다.'));
      continue;
    }

    visualArtifacts.push({ mode, out, status: 'PASS', payload });

    const terms = payload.forbiddenVisibleTerms || [];
    const cropped = payload.croppedScreenImages || [];
    const mobileLayoutBroken = mode === 'mobile' && [
      ['heroPrimaryCtaVisible', '첫 화면 CTA가 접힘'],
      ['heroPhoneStartsInFirstViewport', '핵심 기능 GIF가 첫 화면에 진입하지 못함'],
      ['heroPhoneFullyVisibleInFirstViewport', '핵심 기능 GIF가 첫 화면에서 잘림'],
      ['heroScrollPressureLow', `히어로 높이가 과도함(${payload.heroHeight || 0}px)`],
      ['mobileScreensUseHorizontalScroll', '모바일 화면 캡쳐가 세로로 누적됨'],
      ['heroProofHiddenOnMobile', '모바일 히어로 증거 카드가 첫 화면을 밀어냄']
    ].filter(([key]) => !payload[key]).map(([, label]) => label);
    if (terms.length) {
      gates.push(fail(`visual capture: ${mode}`, `노출 금지어: ${terms.join(', ')}`, '공개 화면에서 내부 작업 용어를 제거한다.'));
    } else if (cropped.length) {
      gates.push(fail(`visual capture: ${mode}`, `잘린 앱 캡쳐 이미지: ${cropped.join(', ')}`, '앱 캡쳐 이미지는 object-fit: contain/height:auto로 전체 화면이 보여야 한다.'));
    } else if (mobileLayoutBroken.length) {
      gates.push(fail(`visual capture: ${mode}`, `모바일 반응형 압박: ${mobileLayoutBroken.join(', ')}`, '모바일 첫 화면에서 CTA와 핵심 GIF가 보이고, 앱 캡쳐는 가로 스와이프로 제공되어야 한다.'));
    } else if (!payload.hasRecipeRequest || !payload.hasLaunchInput || !payload.hasAssistantSurvey || !payload.hasInteractiveGif || !(payload.hasVisibleAppPreview || payload.hasMobileAppCTA)) {
      gates.push(fail(`visual capture: ${mode}`, `필수 섹션 상태: ${JSON.stringify(payload)}`, '보고 싶은 요리 보내기/미리 써보기/요리비서 추천/인터랙션 GIF/앱 진입 CTA 또는 화면 미리보기를 복구한다.'));
    } else {
      gates.push(pass(`visual capture: ${mode}`, `${out}, forbiddenVisibleTerms=[], croppedScreenImages=[]`));
    }
  }

  return gates;
}

function selectedWorkflows(files) {
  const selected = ['core'];
  const apiTouched = full || touches(files, ['api', 'app.html', 'index.html']);
  const deployTouched = full || touches(files, ['vercel.json', 'package.json', '.env.example', '.vercelignore', 'api']);
  const docsTouched = full || touches(files, ['docs/verify', 'docs/handoff', /^docs\/progress\//]);
  const landingTouched = full || touches(files, ['index.html', 'app.html', 'assets/screens', 'scripts/capture-landing.mjs', 'scripts/capture-app-screens.mjs']);

  if (apiTouched) selected.push('api');
  if (deployTouched) selected.push('deploy');
  if (docsTouched) selected.push('docs');
  if (visual && landingTouched) selected.push('visual');
  if (visual && !selected.includes('visual')) selected.push('visual');

  return selected;
}

function workflowReason(files, workflow) {
  if (workflow === 'core') return '항상 실행';
  if (workflow === 'api') return touches(files, ['api', 'app.html', 'index.html']) ? 'api/app/landing 변경 감지' : 'full 실행';
  if (workflow === 'deploy') return touches(files, ['vercel.json', 'package.json', '.env.example', '.vercelignore', 'api']) ? '배포 설정 변경 감지' : 'full 실행';
  if (workflow === 'docs') return touches(files, ['docs/verify', 'docs/handoff', /^docs\/progress\//]) ? '검증 문서 변경 감지' : 'full 실행';
  if (workflow === 'visual') return visual ? '--visual 요청' : '비활성';
  return '';
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

function scoreBySignals(signals, weight) {
  if (!signals.length) return 0;
  const passed = signals.filter(Boolean).length;
  return Math.round((passed / signals.length) * weight);
}

function gatePassed(gates, name) {
  return gates.some((gate) => gate.name === name && gate.status === 'PASS');
}

function buildScorecard(gates, workflows) {
  const landingHtml = existsSync(resolve(root, 'index.html')) ? read('index.html') : '';
  const appHtml = existsSync(resolve(root, 'app.html')) ? read('app.html') : '';
  const designHtml = existsSync(resolve(root, 'design.html')) ? read('design.html') : '';
  const html = `${landingHtml}\n${appHtml}`;
  const env = existsSync(resolve(root, '.env.example')) ? read('.env.example') : '';
  const ignored = existsSync(resolve(root, '.vercelignore')) ? read('.vercelignore') : '';
  const docs = existsSync(resolve(root, 'docs/verify/DYNAMIC_WORKFLOW_ko.md')) ? read('docs/verify/DYNAMIC_WORKFLOW_ko.md') : '';
  const visualModes = new Set(visualArtifacts.filter((item) => item.status === 'PASS').map((item) => item.mode));
  const visualPayloads = visualArtifacts.filter((item) => item.status === 'PASS').map((item) => item.payload || {});
  const visualForbiddenTerms = visualPayloads.flatMap((payload) => payload.forbiddenVisibleTerms || []);
  const visualCroppedImages = visualPayloads.flatMap((payload) => payload.croppedScreenImages || []);
  const visualCopySignals = visualPayloads.map((payload) => (
    payload.hasCookingPromise && payload.hasBetaCTA && (payload.hasVisibleAppPreview || payload.hasMobileAppCTA)
  ));
  const visualMascotSignal = visualPayloads.some((payload) => payload.hasMascotCopy);
  const forbidden = ['Notion', 'notion', 'v2', 'v3', 'Ralph', '랄프', 'API', 'Vercel', 'GitHub', 'webhook', '환경변수', '프로토타입', 'AWS', '페이지 안에'];
  const staticForbidden = forbidden.filter((term) => html.includes(term));
  const scoreVisual = workflows.includes('visual');

  const items = [];

  const copySignals = [
    includesAll(landingHtml, ['SNS 요리 영상', '따라 하다 막혔죠']),
    includesAll(landingHtml, ['미리 써보기 신청', '지금 써보기']),
    includesAll(landingHtml, ['보고 싶은 요리', '요리 보내기']),
    includesAll(landingHtml, ['작은 냄비가', '옆에서 챙겨요'])
  ];
  items.push(scoreItem(
    '사용자 가치·카피 명확성',
    15,
    scoreBySignals(copySignals, 15),
    `${copySignals.filter(Boolean).length}/4 신호 충족`,
    '히어로, CTA, 레시피 요청, 작은 냄비 감성 카피가 모두 사용자 행동으로 이어져야 한다.'
  ));

  const betaSignals = [
    landingHtml.includes('id="betaForm"'),
    landingHtml.includes('href="/app"'),
    landingHtml.includes("postJson('/api/beta-signup'"),
    landingHtml.includes('미리 써보기 신청') || landingHtml.includes('먼저 써보기 신청'),
    landingHtml.includes('신청이 접수됐습니다')
  ];
  items.push(scoreItem(
    '베타 전환 흐름',
    15,
    scoreBySignals(betaSignals, 15),
    `${betaSignals.filter(Boolean).length}/5 신호 충족`,
    '모바일/데스크톱/하단 신청 폼과 성공 메시지를 모두 유지한다.'
  ));

  const feedbackSignals = [
    landingHtml.includes('id="recipeRequestForm"'),
    appHtml.includes('id="feedbackForm"'),
    appHtml.includes('openFeedback('),
    landingHtml.includes("postJson('/api/feedback'") || appHtml.includes("postJson('/api/feedback'"),
    appHtml.includes('피드백이 접수됐습니다') && landingHtml.includes('레시피 요청이 접수됐습니다')
  ];
  items.push(scoreItem(
    '피드백·레시피 수집',
    15,
    scoreBySignals(feedbackSignals, 15),
    `${feedbackSignals.filter(Boolean).length}/5 신호 충족`,
    '베타 피드백과 레시피 요청이 같은 저장 흐름으로 수집되어야 한다.'
  ));

  const interactionSignals = [
    landingHtml.includes('data-assistant-survey="true"') && landingHtml.includes('assistantSurveyRecipes'),
    appHtml.includes('지금 많이 만드는 요리') && appHtml.includes('SNS에서 자주 보이는 메뉴'),
    !appHtml.includes('<span>영상 보내기</span>') && appHtml.includes('app-feedback-btn'),
    appHtml.includes('id="communityStrip"') && appHtml.includes('RECIPE_REACTIONS'),
    appHtml.includes('shareCompletedRecipe') && appHtml.includes('from=completed-share'),
    existsSync(resolve(root, 'assets/screens/naembi-core-flow.gif')) && appHtml.includes('음성 예시')
  ];
  items.push(scoreItem(
    '후킹·상호작용 루프',
    10,
    scoreBySignals(interactionSignals, 10),
    `${interactionSignals.filter(Boolean).length}/6 신호 충족`,
    '랜딩 이탈 방지용 요리비서 추천, 앱 후기/팁, 완료 후 공유, 폰 내부 플로팅 피드백을 유지한다.'
  ));

  const previewSignals = [
    landingHtml.includes('/assets/screens/app-home.png'),
    landingHtml.includes('/assets/screens/app-search.png'),
    landingHtml.includes('/assets/screens/app-detail.png'),
    landingHtml.includes('/assets/screens/app-cook.png'),
    landingHtml.includes('/assets/screens/app-complete.png'),
    existsSync(resolve(root, 'assets/screens/app-home.png'))
      && existsSync(resolve(root, 'assets/screens/app-search.png'))
      && existsSync(resolve(root, 'assets/screens/app-detail.png'))
      && existsSync(resolve(root, 'assets/screens/app-cook.png'))
      && existsSync(resolve(root, 'assets/screens/app-complete.png'))
  ];
  items.push(scoreItem(
    '정적 앱 화면 소개',
    15,
    scoreBySignals(previewSignals, 15),
    `${previewSignals.filter(Boolean).length}/6 신호 충족`,
    '홈/검색/상세/조리/완료 화면 캡쳐가 랜딩에서 정적으로 제공되어야 한다.'
  ));

  const designSignals = [
    designHtml.includes('data-mark="hero-character"'),
    designHtml.includes('data-steam-count="3"') && designHtml.includes('data-play-nose="true"') && designHtml.includes('data-smile-mouth="true"'),
    designHtml.includes('data-identity-scorecard="100"'),
    designHtml.includes('data-layout-candidates="assistant-first"'),
    designHtml.includes('data-community-feasibility="true"'),
    existsSync(resolve(root, 'scripts/capture-core-flow-gif.mjs')) && existsSync(resolve(root, 'assets/screens/naembi-core-flow.gif'))
  ];
  items.push(scoreItem(
    '브랜드·디자인 검증',
    10,
    scoreBySignals(designSignals, 10),
    `${designSignals.filter(Boolean).length}/6 신호 충족`,
    '/design에서 캐릭터/로고 후보, 아이덴티티 점수표, 음성비서 중심 배치, 커뮤니티 현실성을 검토할 수 있어야 한다.'
  ));

  const privacySignals = scoreVisual
    ? [staticForbidden.length === 0, visualForbiddenTerms.length === 0]
    : [staticForbidden.length === 0];
  items.push(scoreItem(
    '내부 정보 비노출',
    15,
    scoreBySignals(privacySignals, 15),
    scoreVisual
      ? `정적 ${staticForbidden.length}건, 시각 ${visualForbiddenTerms.length}건`
      : `정적 ${staticForbidden.length}건, 시각 검증 미실행`,
    '사용자 화면에서 내부 문서명, 버전 태그, 저장소/배포 구현명을 제거한다.'
  ));

  if (scoreVisual) {
    items.push(scoreItem(
      '앱 캡쳐 전체 노출',
      10,
      visualCroppedImages.length === 0 && visualPayloads.every((payload) => (payload.screenImages || []).length >= 5) ? 10 : 0,
      `잘림 ${visualCroppedImages.length}건, 캡쳐 세트 ${visualPayloads.filter((payload) => (payload.screenImages || []).length >= 5).length}/${visualPayloads.length}`,
      '정적 앱 화면 이미지는 원본 비율 그대로 전체가 보여야 하며 object-fit: cover를 쓰지 않는다.'
    ));
  }

  if (scoreVisual) {
    const mobilePayloads = visualPayloads.filter((payload) => payload.mobileMedia === true && payload.width <= 430);
    const mobilePressureSignals = mobilePayloads.map((payload) => (
      payload.heroPrimaryCtaVisible
        && payload.heroPhoneStartsInFirstViewport
        && payload.heroPhoneFullyVisibleInFirstViewport
        && payload.heroScrollPressureLow
        && payload.mobileScreensUseHorizontalScroll
        && payload.heroProofHiddenOnMobile
    ));
    const responsiveSignals = [
      visualModes.has('mobile'),
      visualModes.has('tablet'),
      visualModes.has('desktop'),
      visualPayloads.some((payload) => payload.mobileMedia === true && payload.hasMobileAppCTA),
      visualPayloads.some((payload) => payload.mobileMedia === false && payload.hasVisibleAppPreview),
      mobilePressureSignals.length > 0 && mobilePressureSignals.every(Boolean),
      visualPayloads.some((payload) => payload.mobileMedia === true && payload.hasMobileAppCTA)
        && visualPayloads.some((payload) => payload.mobileMedia === false && payload.hasVisibleAppPreview)
        && visualCopySignals.every(Boolean)
        && visualMascotSignal
    ];
    items.push(scoreItem(
      '반응형·시각 증거',
      10,
      scoreBySignals(responsiveSignals, 10),
      `${responsiveSignals.filter(Boolean).length}/7 신호 충족`,
      '모바일/태블릿/데스크톱 캡처에서 CTA, 핵심 GIF, 앱 미리보기, 카피 신호가 모두 보여야 한다.'
    ));
  }

  const deploySignals = [
    gatePassed(gates, 'vercel app route'),
    includesAll(env, ['NAEMBI_BETA_GOOGLE_FORM_URL', 'NAEMBI_BETA_GOOGLE_FORM_FIELDS'])
      || includesAll(env, ['NAEMBI_BETA_WEBHOOK_URL'])
      || includesAll(env, ['NAEMBI_BETA_GITHUB_REPO', 'NAEMBI_BETA_GITHUB_TOKEN']),
    includesAll(ignored, ['docs/', 'scripts/', '.env']),
    gatePassed(gates, 'workflow script hook')
  ];
  items.push(scoreItem(
    '배포 준비도',
    10,
    scoreBySignals(deploySignals, 10),
    `${deploySignals.filter(Boolean).length}/4 신호 충족`,
    '루트 랜딩과 /app 웹앱 라우팅, 수집 환경변수, 배포 제외, 검증 스크립트를 유지한다.'
  ));

  const loopSignals = [
    docs.includes('점수') || docs.includes('검증자 역할 분리'),
    docs.includes('PASS/FAIL/INCONCLUSIVE'),
    existsSync(resolve(root, 'docs/verify/DYNAMIC_WORKFLOW_LAST_ko.md')),
    existsSync(resolve(root, 'docs/verify/DYNAMIC_WORKFLOW_LAST_ko.json'))
  ];
  items.push(scoreItem(
    '검증 루프 재현성',
    5,
    scoreBySignals(loopSignals, 5),
    `${loopSignals.filter(Boolean).length}/4 신호 충족`,
    '다음 세션에서도 같은 검증자 역할, 점수표, 마지막 리포트를 재사용할 수 있어야 한다.'
  ));

  const total = items.reduce((sum, item) => sum + item.points, 0);
  const max = items.reduce((sum, item) => sum + item.weight, 0);
  const percent = max ? Math.round((total / max) * 100) : 0;
  const threshold = scoreVisual ? 95 : 90;

  return {
    items,
    total,
    max,
    percent,
    threshold,
    status: percent >= threshold ? 'PASS' : 'FAIL',
    visualIncluded: scoreVisual
  };
}

function statusSummary(gates, scorecard) {
  const failCount = gates.filter((gate) => gate.status === 'FAIL').length;
  const inconclusiveCount = gates.filter((gate) => gate.status === 'INCONCLUSIVE').length;
  if (failCount) return 'FAIL';
  if (inconclusiveCount) return 'INCONCLUSIVE';
  if (scorecard?.status === 'FAIL') return 'FAIL';
  return 'PASS';
}

function markdownReport({ files, workflows, gates, scorecard, summary }) {
  const rows = gates.map((gate) => (
    `| ${escapeMd(gate.name)} | ${gate.status} | ${escapeMd(gate.detail)} | ${escapeMd(gate.fix || '-')} |`
  )).join('\n');
  const workflowRows = workflows.map((workflow) => (
    `| ${workflow} | ${escapeMd(workflowReason(files, workflow))} |`
  )).join('\n');
  const scoreRows = scorecard.items.map((item) => (
    `| ${escapeMd(item.name)} | ${item.weight} | ${item.points} | ${item.percent}% | ${escapeMd(item.evidence)} | ${escapeMd(item.fix || '-')} |`
  )).join('\n');

  return [
    '# 동적 검증 워크플로우 실행 리포트',
    '',
    `- 일시: ${startedAt.toISOString()}`,
    `- 판정: **${summary}**`,
    `- 점수: **${scorecard.total} / ${scorecard.max} (${scorecard.percent}%)**`,
    `- 통과 기준: **${scorecard.threshold}% 이상**${scorecard.visualIncluded ? '' : ' (시각 검증 미포함 빠른 기준)'}`,
    `- 모드: ${visual ? 'visual 포함' : 'static/API/deploy 중심'}`,
    `- 기준 URL: \`${baseURL}\``,
    '',
    '## 왜 빠르게 끝났나',
    '',
    '기존 루프는 문법, DOM 존재, API validation, 금지어 캡처만 보는 스모크 검증이었다. 이번 리포트부터는 같은 게이트 위에 점수표를 얹어 카피, 전환, 수집, 미리보기, 비노출, 반응형, 배포, 루프 재현성을 별도로 평가한다.',
    '',
    '## 변경 파일',
    '',
    files.length ? files.map((file) => `- \`${file}\``).join('\n') : '- 감지된 변경 없음',
    '',
    '## 선택된 워크플로우',
    '',
    '| workflow | 선택 이유 |',
    '| --- | --- |',
    workflowRows,
    '',
    '## 점수표',
    '',
    '| 항목 | 배점 | 점수 | 달성률 | 근거 | 보정 후보 |',
    '| --- | ---: | ---: | ---: | --- | --- |',
    scoreRows,
    '',
    '## 게이트 결과',
    '',
    '| 게이트 | 판정 | 근거 | 보정 후보 |',
    '| --- | --- | --- | --- |',
    rows,
    '',
    '## 루프 규칙',
    '',
    '- `FAIL`: 해당 게이트의 보정 후보만 고치고 같은 게이트를 재실행한다.',
    '- `INCONCLUSIVE`: 제품 실패로 보지 않고 실행 환경, 권한, 서버 상태를 먼저 복구한다.',
    '- `PASS`: 다음 워크플로우로 진행한다.',
    '- 공개 사용자 화면은 내부 작업명, 버전 태그, 저장소/배포 구현명을 노출하지 않는다.',
    ''
  ].join('\n');
}

function htmlReport(markdown, summary) {
  const body = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('- ')) return `<p>${line}</p>`;
      if (line.startsWith('|')) return `<pre>${line}</pre>`;
      if (!line.trim()) return '';
      return `<p>${line}</p>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>동적 검증 워크플로우 실행 리포트</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f5f5f7;color:#1d1d1f;line-height:1.6}
    main{max-width:1040px;margin:0 auto;padding:40px 20px 80px}
    h1{font-size:34px;line-height:1.2}
    h2{margin-top:32px}
    pre{white-space:pre-wrap;background:#fff;border:1px solid #e5e5ea;border-radius:12px;padding:10px 12px;overflow:auto}
    p{background:#fff;border:1px solid #e5e5ea;border-radius:12px;padding:10px 12px}
    .status{display:inline-block;border-radius:999px;background:${summary === 'PASS' ? '#1d8a57' : summary === 'FAIL' ? '#c8402a' : '#8a6d1d'};color:#fff;padding:8px 12px;font-weight:800}
  </style>
</head>
<body><main><p class="status">${summary}</p>${body}</main></body>
</html>
`;
}

function escapeMd(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

async function main() {
  const files = changedFiles();
  const workflows = selectedWorkflows(files);
  const gates = [];

  gates.push(...coreChecks());
  if (workflows.includes('api')) gates.push(...await apiChecks());
  if (workflows.includes('deploy')) gates.push(...deployChecks());
  if (workflows.includes('docs')) gates.push(...docsChecks());
  if (workflows.includes('visual')) gates.push(...visualChecks());

  const scorecard = buildScorecard(gates, workflows);
  const summary = statusSummary(gates, scorecard);
  const md = markdownReport({ files, workflows, gates, scorecard, summary });
  const json = JSON.stringify({
    startedAt: startedAt.toISOString(),
    summary,
    visual,
    baseURL,
    files,
    workflows,
    gates,
    scorecard,
    visualArtifacts
  }, null, 2);

  mkdirSync(dirname(resolve(root, reportMd)), { recursive: true });
  writeFileSync(resolve(root, reportMd), md);
  writeFileSync(resolve(root, reportJson), json);
  writeFileSync(resolve(root, reportHtml), htmlReport(md, summary));

  console.log(md);

  if (summary === 'FAIL') process.exitCode = 1;
  if (summary === 'INCONCLUSIVE' && !allowInconclusive) process.exitCode = 2;
}

await main();
