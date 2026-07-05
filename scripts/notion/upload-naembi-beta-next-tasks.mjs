const NOTION_VERSION = '2022-06-28';
const parentPageId = process.env.NOTION_PARENT_PAGE_ID || '392b1da1d9f98020b3fce1290fee276c';
const token = process.env.NOTION_TOKEN;

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

const title = '냄비 베타 Google Form·Sheet 연결 다음 작업';
const today = '2026-07-05';

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
  paragraph('목적: Google Apps Script로 생성한 Form/Sheet를 Vercel 배포와 연결하고, 베타 신청·레시피 요청·피드백이 실제 Sheet에 쌓이는지 확인한다.'),
  heading(2, '이번 단계의 결론'),
  bullet('AWS나 DB는 아직 만들지 않는다. 베타 단계에서는 Google Form + Google Sheets + Vercel 환경변수 2개로 충분하다.'),
  bullet('원본 응답 Sheet는 영어 키 그대로 유지하고, 사람이 보는 관리는 Apps Script가 만든 운영뷰 탭에서 한다.'),
  bullet('Google Form 편집 URL은 내부용이다. 사용자에게 공유하지 않는다.'),
  heading(2, '1. Google Form·Sheet 생성 확인'),
  todo('Apps Script에서 setupNaembiBetaCollection 실행 완료 확인'),
  todo('최신 스크립트 기준 운영뷰 탭이 자동 생성됐는지 확인'),
  todo('이미 예전 스크립트로 만들었다면 createNaembiOperatingView 함수만 실행'),
  todo('생성된 Google Sheet의 Vercel env 탭 열기'),
  todo('NAEMBI_BETA_GOOGLE_FORM_URL 값이 /formResponse 로 끝나는지 확인'),
  todo('NAEMBI_BETA_GOOGLE_FORM_FIELDS 값이 한 줄 JSON인지 확인'),
  todo('FORM_EDIT_URL은 외부 공유하지 않도록 별도 보관'),
  heading(2, '2. Vercel 환경변수 등록'),
  paragraph('Vercel Project > Settings > Environment Variables에 아래 두 값을 등록한다.'),
  code('NAEMBI_BETA_GOOGLE_FORM_URL\nNAEMBI_BETA_GOOGLE_FORM_FIELDS'),
  todo('Production 환경에 두 변수 추가'),
  todo('Preview 배포에서도 테스트할 예정이면 Preview에도 두 변수 추가'),
  todo('값 입력 후 Vercel 재배포 실행'),
  heading(2, '3. 배포 후 실전송 테스트'),
  todo('랜딩 상단 또는 베타 신청 영역에서 이메일 제출'),
  todo('레시피 요청 폼에서 요리 이름, 유튜브 링크, 요청 이유 제출'),
  todo('웹앱 피드백 버튼에서 일반 피드백 제출'),
  todo('Google Sheet에 kind=beta-signup 행이 생겼는지 확인'),
  todo('Google Sheet에 kind=feedback, type=recipe 행이 생겼는지 확인'),
  todo('Google Sheet에 일반 feedback 행이 생겼는지 확인'),
  heading(2, '4. 운영뷰 탭 확인'),
  todo('운영뷰 탭의 한글 컬럼이 보이는지 확인'),
  todo('접수구분 컬럼에 베타 신청 / 레시피 요청 / 피드백이 자동 표시되는지 확인'),
  todo('상태 컬럼 드롭다운: 미확인, 확인, 반영중, 반영완료, 보류 확인'),
  todo('우선순위 컬럼 드롭다운: P0, P1, P2, P3 확인'),
  todo('운영뷰 필터가 켜져 있는지 확인'),
  heading(2, '5. 운영 메모 방식'),
  paragraph('Apps Script가 운영뷰 오른쪽에 사람이 관리하는 컬럼을 자동 생성한다. 원본 응답 탭에는 직접 메모하지 않는다.'),
  code('상태 | 우선순위 | 담당자 | 운영메모'),
  bullet('상태 후보: 미확인, 확인, 반영중, 반영완료, 보류'),
  bullet('우선순위 후보: P0, P1, P2, P3'),
  heading(2, '6. 완료 기준'),
  todo('Vercel 배포 URL에서 3가지 제출이 모두 성공 메시지를 반환한다'),
  todo('Google Sheet 원본 응답 탭에 행이 쌓인다'),
  todo('운영뷰에서 접수구분별 필터가 가능하다'),
  todo('FORM_EDIT_URL, GitHub, Vercel 내부 정보가 사용자 화면에 노출되지 않는다'),
  heading(2, '다음 의사결정 기준'),
  bullet('베타 신청이 적고 수동 관리가 가능하면 Google Sheets 유지'),
  bullet('상태 관리, 담당자 배정, 대량 태그가 필요해지면 Airtable 또는 Supabase 검토'),
  bullet('AWS는 정식 앱 백엔드 설계가 필요해지는 시점에 다시 검토')
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
