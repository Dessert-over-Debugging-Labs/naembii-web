const NOTION_VERSION = '2022-06-28';
const parentPageId = process.env.NOTION_PARENT_PAGE_ID || '392b1da1d9f98020b3fce1290fee276c';
const token = process.env.NOTION_TOKEN;

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

const title = '냄비 베타 운영 자동화 세팅 가이드';
const today = '2026-07-08';

function text(content) {
  return [{ type: 'text', text: { content } }];
}

function paragraph(content) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(content) } };
}

function heading(level, content) {
  const type = `heading_${level}`;
  return { object: 'block', type, [type]: { rich_text: text(content) } };
}

function todo(content) {
  return { object: 'block', type: 'to_do', to_do: { rich_text: text(content), checked: false } };
}

function bullet(content) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: text(content) } };
}

function code(content) {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: text(content),
      language: 'plain text'
    }
  };
}

const children = [
  paragraph(`작성일: ${today}`),
  paragraph('목적: 베타 신청, 레시피 요청, 피드백이 들어오면 Slack에서 바로 확인하고, 실제 반영 완료 시 Google Sheet 운영뷰에 체크가 남도록 세팅한다.'),
  heading(2, '이번 단계의 결론'),
  bullet('AWS나 별도 DB는 아직 만들지 않는다. 베타 운영은 Vercel API + Google Form/Sheet + Slack으로 충분하다.'),
  bullet('Slack 버튼은 사용자에게 답변하는 기능이 아니라 운영자가 실제 반영 여부를 Sheet에 남기는 기능이다.'),
  bullet('사용자 회신 자동화는 베타 수요가 확인된 뒤 이메일 도구나 CRM을 붙일 때 별도 결정한다.'),
  heading(2, '전체 흐름'),
  code('사용자 제출\n-> Vercel /api/beta-signup 또는 /api/feedback\n-> requestId 자동 생성\n-> Google Form/Sheet 저장\n-> Slack 알림\n-> Slack의 "반영완료 체크" 버튼 클릭\n-> Apps Script Web App 호출\n-> Google Sheet 운영뷰의 반영완료 체크박스 TRUE'),
  heading(2, '1. 필요한 계정과 권한'),
  todo('Google Form, Sheet, Apps Script를 만들 Google 계정 확인'),
  todo('Slack 알림을 받을 운영 채널 확인'),
  todo('Vercel 프로젝트 naembi-web 접근 권한 확인'),
  todo('GitHub repo Dessert-over-Debugging-Labs/naembi-web 접근 권한 확인'),
  todo('Notion 부모 페이지에 통합이 페이지 생성 권한을 갖는지 확인'),
  heading(2, '2. Google Apps Script 세팅'),
  todo('scripts/google-apps-script/create-naembi-beta-collection.js 전체를 Apps Script Code.gs에 붙여넣기'),
  todo('새 Form/Sheet를 만드는 경우 setupNaembiBetaCollection 실행'),
  todo('기존 Form/Sheet가 있는 경우 최신 코드로 교체 후 createNaembiOperatingView 실행'),
  todo('Spreadsheet의 Vercel env 탭 확인'),
  bullet('운영뷰에는 요청ID, 상태, 우선순위, 담당자, 운영메모, 반영완료, 반영완료시각, 반영자, 반영메모 컬럼이 있어야 한다.'),
  heading(2, '3. Apps Script Web App 배포'),
  todo('Apps Script Deploy -> New deployment 선택'),
  todo('유형을 Web app으로 선택'),
  todo('Execute as는 Me로 설정'),
  todo('Who has access는 Anyone with the link로 설정'),
  todo('배포 후 Web app URL 복사'),
  todo('refreshNaembiAutomationEnv 실행'),
  todo('Vercel env 탭에서 completion URL과 token 확인'),
  heading(2, '4. Slack Incoming Webhook 세팅'),
  todo('Slack API에서 앱을 만들거나 기존 앱 설정 열기'),
  todo('Incoming Webhooks 켜기'),
  todo('운영 채널 선택. 예: #naembi-beta-feedback'),
  todo('Webhook URL 복사'),
  todo('Vercel 환경변수 NAEMBI_SLACK_WEBHOOK_URL에 저장'),
  bullet('Slack 채널은 운영자만 볼 수 있게 관리한다. Webhook URL과 completion token은 외부 화면에 노출하지 않는다.'),
  heading(2, '5. Vercel 환경변수'),
  paragraph('Vercel Project Settings -> Environment Variables에 아래 값을 넣고 재배포한다.'),
  code('NAEMBI_BETA_GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/formResponse\nNAEMBI_BETA_GOOGLE_FORM_FIELDS={"kind":"entry...","requestId":"entry...","email":"entry...","name":"entry...","profile":"entry...","note":"entry...","type":"entry...","message":"entry...","recipe":"entry...","source":"entry...","screen":"entry...","page":"entry...","createdAt":"entry..."}\nNAEMBI_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...\nNAEMBI_BETA_COMPLETION_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec\nNAEMBI_BETA_COMPLETION_TOKEN=GENERATED_OPERATION_TOKEN'),
  bullet('NAEMBI_BETA_GOOGLE_FORM_FIELDS에는 반드시 requestId 매핑이 있어야 한다.'),
  bullet('Production에 먼저 넣고, Preview 테스트가 필요하면 Preview에도 넣는다.'),
  bullet('COOK_BETA_* 이름은 fallback으로만 보고 신규 세팅은 NAEMBI_* 기준으로 관리한다.'),
  heading(2, '6. 테스트 루프'),
  todo('실배포 URL에서 출시 알림 신청 제출'),
  todo('레시피 요청 제출'),
  todo('피드백 버튼에서 일반 피드백 제출'),
  todo('Google Sheet 원본 응답 탭에 각 행이 생겼는지 확인'),
  todo('운영뷰에 요청ID가 표시되는지 확인'),
  todo('Slack 채널에 알림이 오는지 확인'),
  todo('Slack 알림의 반영완료 체크 버튼 클릭'),
  todo('Google Sheet 운영뷰에서 상태=반영완료, 반영완료=TRUE 확인'),
  paragraph('로컬 검증 기준:'),
  code('npm run check\nnpm run verify:dynamic -- --full --min-score=96'),
  heading(2, '7. 반영완료 기준'),
  paragraph('반영완료는 사용자의 요청을 운영자가 실제로 제품, 콘텐츠, 레시피 후보, 카피, 디자인, 버그 수정 목록 중 하나에 반영했을 때만 체크한다.'),
  bullet('체크 가능: 레시피 요청을 신규 후보 목록에 넣고 담당자가 확인한 경우'),
  bullet('체크 가능: 피드백을 실제 UI 수정 또는 다음 작업 목록에 반영한 경우'),
  bullet('체크 가능: 버그 제보를 재현하고 이슈 또는 작업 항목으로 만든 경우'),
  bullet('체크 금지: Slack 알림을 보기만 한 경우'),
  bullet('체크 금지: 아직 판단하지 않은 경우'),
  heading(2, '8. Codex 세션 운영 규칙'),
  bullet('작업 시작 전 체크리스트를 만들고 단계별로 갱신한다.'),
  bullet('repo-local AGENTS.md가 있으면 그 지시를 우선한다.'),
  bullet('커밋은 사용자가 요청했을 때만 한다.'),
  bullet('커밋 메시지는 Conventional Commit 토큰 뒤 설명을 한국어로 쓴다.'),
  bullet('커밋 후 git log -1 --pretty=%s로 메시지를 확인한다.'),
  bullet('.DS_Store 같은 로컬 파일은 커밋하지 않는다.'),
  bullet('사용자의 기존 변경사항은 되돌리지 않는다.'),
  bullet('공개 화면에는 Notion, API, Vercel, GitHub, 환경변수 같은 내부 운영어가 보이면 안 된다.'),
  heading(2, '9. 장애 대응'),
  bullet('제출은 되는데 Slack 알림이 없음: NAEMBI_SLACK_WEBHOOK_URL과 Vercel 재배포 여부 확인'),
  bullet('Slack 버튼이 없음: NAEMBI_BETA_COMPLETION_URL, NAEMBI_BETA_COMPLETION_TOKEN 누락 여부 확인'),
  bullet('버튼 클릭 후 Sheet가 안 바뀜: Apps Script Web App URL, token, requestId 매핑 확인'),
  bullet('운영뷰에 요청ID가 없음: 최신 Apps Script 적용 여부, Form 질문에 requestId가 있는지 확인'),
  bullet('Vercel 제출이 실패함: Google Form URL, fields JSON 형식 확인'),
  bullet('Notion 페이지 업로드가 실패함: NOTION_TOKEN, NOTION_PARENT_PAGE_ID, 통합 권한 확인'),
  heading(2, '10. 다음 단계'),
  todo('Slack 알림을 운영 채널에 연결'),
  todo('Apps Script Web App 배포 URL을 Vercel 환경변수에 넣기'),
  todo('실배포 URL에서 3종 제출 테스트 진행'),
  todo('운영뷰에서 반영완료 체크가 자동으로 남는지 확인'),
  todo('베타 수요가 늘어나면 이메일 회신 자동화와 DB 전환 기준을 별도 문서로 정리')
];

async function notion(path, body) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  }
  return data;
}

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: parentPageId },
  properties: {
    title: {
      title: text(title)
    }
  },
  children
});

console.log(JSON.stringify({
  title,
  pageId: page.id,
  url: page.url
}, null, 2));
