// 더미 레시피 후보 4종 — app.html의 RECIPES 배열에 추가할 초안.
// 요리 내용(재료/단계/subs)은 상식 기반 초안(검토용). 영상 바인딩은 TODO(영상):
//   - id: 유튜브 영상 id (임베드 가능 영상)
//   - channel: 채널명
//   - 각 step의 time/start/end: recipe-from-youtube 스킬로 실제 영상에서 추출(초 단위). 지어내지 말 것.
// food: app.html의 썸네일 그라데이션 클래스(food1~) 중 선택.
// 사용: 값 채운 뒤 RECIPES에 넣고 renderHomeSections()의 popIds/recIds에 id 등록.

const RECIPES_CANDIDATES = [
  {
    id: 'TODO_youtube_id', name: '김치볶음밥',
    title: '냉장고 털어 만드는 초간단 김치볶음밥',
    channel: 'TODO(영상)', servings: '2인분', time: '15분', difficulty: '쉬움', food: 'food2',
    summary: '잘 익은 김치를 기름에 충분히 볶아 감칠맛을 내고, 밥과 함께 볶아 달걀프라이를 올린 자취 필수 한 그릇.',
    ingredients: {
      main: [{ n: '밥', q: '2공기' }, { n: '잘 익은 김치', q: '1컵' }, { n: '대파', q: '1/2대' }, { n: '달걀', q: '2개' }, { n: '스팸', q: '1/2캔(선택)' }],
      seasoning: [{ n: '식용유', q: '2큰술' }, { n: '김칫국물', q: '2큰술' }, { n: '고춧가루', q: '1작은술(선택)' }, { n: '참기름', q: '1큰술' }, { n: '통깨', q: '조금' }],
    },
    steps: [
      { letter: 'A', title: '재료 준비', time: 'TODO(영상)', start: 0, end: 0, subs: ['김치를 잘게 썬다', '대파를 송송 썬다', '스팸을 쓰면 작게 깍둑 썬다'] },
      { letter: 'B', title: '대파·김치 볶기', time: 'TODO(영상)', start: 0, end: 0, subs: ['식용유에 대파를 볶아 파기름을 낸다', '김치를 넣고 가장자리가 노릇할 때까지 볶는다', '고춧가루·김칫국물로 색과 감칠맛을 더한다'] },
      { letter: 'C', title: '밥 넣고 볶기', time: 'TODO(영상)', start: 0, end: 0, subs: ['밥을 넣고 김치와 고루 섞는다', '밥알이 코팅되도록 눌러가며 볶는다'] },
      { letter: 'D', title: '마무리 간·참기름', time: 'TODO(영상)', start: 0, end: 0, subs: ['간을 보고 부족하면 김칫국물로 보정', '불을 끄고 참기름·통깨를 두른다'] },
      { letter: 'E', title: '달걀프라이 올려 완성', time: 'TODO(영상)', start: 0, end: 0, subs: ['달걀프라이를 반숙으로 부친다', '볶음밥 위에 올려 완성'] },
    ],
  },
  {
    id: 'TODO_youtube_id', name: '계란말이',
    title: '아침 반찬 기본 계란말이',
    channel: 'TODO(영상)', servings: '2인분', time: '10분', difficulty: '쉬움', food: 'food3',
    summary: '달걀에 다진 채소를 섞어 약불에서 여러 번 말아 촉촉하게 부친 기본 반찬. 도시락·아침에 실패 없이 좋은 메뉴.',
    ingredients: {
      main: [{ n: '달걀', q: '4개' }, { n: '당근', q: '1/4개' }, { n: '대파', q: '1/2대' }, { n: '양파', q: '1/4개' }],
      seasoning: [{ n: '소금', q: '약간' }, { n: '식용유', q: '적당량' }, { n: '맛술', q: '1작은술(선택)' }],
    },
    steps: [
      { letter: 'A', title: '채소 다지기', time: 'TODO(영상)', start: 0, end: 0, subs: ['당근·양파·대파를 잘게 다진다'] },
      { letter: 'B', title: '달걀물 만들기', time: 'TODO(영상)', start: 0, end: 0, subs: ['달걀을 풀고 소금·맛술로 간한다', '다진 채소를 섞는다', '알끈이 없도록 잘 저어 체에 거르면 더 곱다'] },
      { letter: 'C', title: '팬 예열·기름', time: 'TODO(영상)', start: 0, end: 0, subs: ['팬을 약불로 예열하고 기름을 얇게 두른다'] },
      { letter: 'D', title: '부치며 말기', time: 'TODO(영상)', start: 0, end: 0, subs: ['달걀물을 얇게 붓고 반쯤 익으면 한쪽으로 만다', '빈 곳에 달걀물을 더 붓고 반복해 두툼하게 만다'] },
      { letter: 'E', title: '모양 잡아 썰기', time: 'TODO(영상)', start: 0, end: 0, subs: ['말이를 김발/키친타월로 모양 잡는다', '한 김 식힌 뒤 먹기 좋게 썬다'] },
    ],
  },
  {
    id: 'TODO_youtube_id', name: '된장찌개',
    title: '집밥 기본 된장찌개',
    channel: 'TODO(영상)', servings: '2인분', time: '20분', difficulty: '쉬움', food: 'food4',
    summary: '멸치육수에 된장을 풀고 단단한 채소부터 넣어 끓인 뒤 두부와 호박을 더해 완성하는 집밥 대표 국물 요리.',
    ingredients: {
      main: [{ n: '두부', q: '1/2모' }, { n: '애호박', q: '1/4개' }, { n: '양파', q: '1/2개' }, { n: '감자', q: '1개' }, { n: '표고버섯', q: '1개' }, { n: '대파', q: '1/2대' }, { n: '청양고추', q: '1개' }],
      seasoning: [{ n: '된장', q: '2큰술' }, { n: '다진 마늘', q: '1큰술' }, { n: '고춧가루', q: '1작은술' }, { n: '멸치육수', q: '500ml' }],
    },
    steps: [
      { letter: 'A', title: '육수에 된장 풀기', time: 'TODO(영상)', start: 0, end: 0, subs: ['냄비에 멸치육수를 붓는다', '된장을 체에 걸러 곱게 푼다'] },
      { letter: 'B', title: '단단한 채소 넣기', time: 'TODO(영상)', start: 0, end: 0, subs: ['감자·양파를 넣고 끓인다', '감자가 반쯤 익을 때까지 둔다'] },
      { letter: 'C', title: '두부·호박·버섯 넣기', time: 'TODO(영상)', start: 0, end: 0, subs: ['애호박·표고·두부를 넣는다', '중불로 5분 더 끓인다'] },
      { letter: 'D', title: '마늘·고추 넣고 마무리', time: 'TODO(영상)', start: 0, end: 0, subs: ['다진 마늘·고춧가루를 넣는다', '대파·청양고추를 넣고 한소끔 끓여 완성'] },
    ],
  },
  {
    id: 'TODO_youtube_id', name: '제육볶음',
    title: '밥도둑 매콤 제육볶음',
    channel: 'TODO(영상)', servings: '2인분', time: '20분', difficulty: '보통', food: 'food5',
    summary: '고추장 양념에 앞다리살을 재워 센 불에 볶아 불맛을 낸 매콤한 밥반찬. 양파·대파와 함께 볶아 감칠맛을 더한다.',
    ingredients: {
      main: [{ n: '돼지 앞다리살', q: '400g' }, { n: '양파', q: '1개' }, { n: '대파', q: '1대' }, { n: '당근', q: '조금' }],
      seasoning: [{ n: '고추장', q: '2큰술' }, { n: '고춧가루', q: '1큰술' }, { n: '간장', q: '1큰술' }, { n: '설탕', q: '1큰술' }, { n: '다진 마늘', q: '1큰술' }, { n: '참기름', q: '1큰술' }, { n: '후추', q: '약간' }],
    },
    steps: [
      { letter: 'A', title: '양념장 만들기', time: 'TODO(영상)', start: 0, end: 0, subs: ['고추장·고춧가루·간장·설탕·마늘·후추를 섞는다'] },
      { letter: 'B', title: '고기 재우기', time: 'TODO(영상)', start: 0, end: 0, subs: ['앞다리살에 양념장을 넣고 버무린다', '10분 이상 재우면 더 맛있다'] },
      { letter: 'C', title: '채소 준비', time: 'TODO(영상)', start: 0, end: 0, subs: ['양파·당근을 채 썰고 대파를 어슷 썬다'] },
      { letter: 'D', title: '센 불에 볶기', time: 'TODO(영상)', start: 0, end: 0, subs: ['센 불에 재운 고기를 볶는다', '고기가 반쯤 익으면 양파·당근을 넣는다'] },
      { letter: 'E', title: '마무리·통깨', time: 'TODO(영상)', start: 0, end: 0, subs: ['대파를 넣고 불맛 나게 볶는다', '참기름·통깨를 두르고 완성'] },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = { RECIPES_CANDIDATES };
