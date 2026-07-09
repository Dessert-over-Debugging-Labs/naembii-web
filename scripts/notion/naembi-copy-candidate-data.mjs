export const COPY_CANDIDATE_PARENT_PAGE_ID = '396b1da1d9f980deb3bff5582ba6aabe';

export const copyCandidateGroups = [
  {
    group: 'global-trial-cta',
    title: '전역 CTA: 써보기 표현',
    note: '상단, 히어로, 모바일 CTA에 반복되는 사용 전환 문구입니다.',
    candidates: [
      {
        id: 'COPY-001',
        location: '랜딩 상단/히어로 CTA',
        before: '지금 써보기',
        after: '먼저 경험해보기',
        reason: '즉시 사용보다 가볍게 체험한다는 느낌이 강합니다.'
      },
      {
        id: 'COPY-002',
        location: '랜딩 상단/히어로 CTA',
        before: '지금 써보기',
        after: '사용해보기',
        reason: '짧고 직접적이지만 마케팅 후킹은 COPY-001보다 약합니다.'
      }
    ]
  },
  {
    group: 'signup-cta',
    title: '신청 CTA: 베타/출시 알림',
    note: '이메일을 남기는 폼 버튼과 신청 유도 문구입니다.',
    candidates: [
      {
        id: 'COPY-003',
        location: '히어로 신청 버튼',
        before: '먼저 써보기 신청',
        after: '먼저 경험해보기 신청',
        reason: '베타 테스트 체험 의미가 드러납니다.'
      },
      {
        id: 'COPY-004',
        location: '히어로 신청 버튼',
        before: '먼저 써보기 신청',
        after: '출시 소식 받기',
        reason: '아직 완성 앱이 아니라는 기대치를 더 안전하게 맞춥니다.'
      }
    ]
  },
  {
    group: 'detail-start-cta',
    title: '상세 화면 CTA: 조리 진입',
    note: '레시피 상세 화면 하단의 조리 시작 버튼입니다.',
    candidates: [
      {
        id: 'COPY-005',
        location: '레시피 상세 하단 버튼',
        before: '요리 시작하기',
        after: '따라 만들기 시작',
        reason: 'SNS 영상을 따라 만든다는 핵심 행동과 더 맞습니다.'
      },
      {
        id: 'COPY-006',
        location: '레시피 상세 하단 버튼',
        before: '요리 시작하기',
        after: '먼저 경험해보기',
        reason: '베타 체험 랜딩과 CTA 결을 맞출 수 있습니다.'
      }
    ]
  },
  {
    group: 'cook-tutorial-title',
    title: '조리 화면 튜토리얼 제목',
    note: '조리 화면 안에 들어갈 첫 안내 문구입니다.',
    candidates: [
      {
        id: 'COPY-007',
        location: '조리 화면 내부 튜토리얼',
        before: '위로 스와이프하세요',
        after: '다음 순서는 카드로 넘겨요',
        reason: '기능 설명보다 현재 화면 안에서 할 행동을 알려줍니다.'
      },
      {
        id: 'COPY-008',
        location: '조리 화면 내부 튜토리얼',
        before: '위로 스와이프하세요',
        after: '따라 만들 때는 여기만 보면 돼요',
        reason: '사용자가 왜 이 화면에 들어왔는지 더 쉽게 연결합니다.'
      }
    ]
  },
  {
    group: 'cook-tutorial-sub',
    title: '조리 화면 튜토리얼 보조 문구',
    note: '튜토리얼 카드 안에서 조작 방법을 짧게 설명하는 문구입니다.',
    candidates: [
      {
        id: 'COPY-009',
        location: '조리 화면 내부 튜토리얼',
        before: '다음 단계 카드도 터치할 수 있어요',
        after: '카드를 넘기고, 막히면 요리비서에게 물어보세요.',
        reason: '사용자가 해야 할 조작과 핵심 기능을 함께 안내합니다.'
      },
      {
        id: 'COPY-010',
        location: '조리 화면 내부 튜토리얼',
        before: '다음 단계 카드도 터치할 수 있어요',
        after: '손이 바쁠 땐 물어보기로 질문해도 돼요.',
        reason: '요리 중 상황을 더 자연스럽게 떠올리게 합니다.'
      }
    ]
  },
  {
    group: 'search-placeholder',
    title: '검색 입력 힌트',
    note: 'Maangchi가 음식처럼 보이지 않도록 창작자 검색을 분리해서 표현합니다.',
    candidates: [
      {
        id: 'COPY-011',
        location: '검색 입력 placeholder',
        before: '콘치즈, 명란, Maangchi처럼 검색',
        after: '콘치즈, 명란, 창작자 이름으로 검색',
        reason: '창작자와 음식 예시를 같은 목록처럼 보이지 않게 합니다.'
      },
      {
        id: 'COPY-012',
        location: '검색 입력 placeholder',
        before: '콘치즈, 명란, Maangchi처럼 검색',
        after: '요리, 재료, 만든 사람 이름으로 검색',
        reason: '비전문 사용자에게 창작자보다 만든 사람이라는 표현이 쉽습니다.'
      }
    ]
  },
  {
    group: 'search-helper',
    title: '검색 보조 설명',
    note: '검색 결과에서 요리와 창작자를 나눠 보여주는 기준 문구입니다.',
    candidates: [
      {
        id: 'COPY-013',
        location: '검색 화면 설명',
        before: '요리 제목, 재료, 창작자 이름을 함께 보고 가장 가까운 레시피를 먼저 보여줘요.',
        after: '요리는 카드로, 창작자는 따로 나눠 보여줘요.',
        reason: '이번 수정 목표인 결과 분리를 직접 설명합니다.'
      },
      {
        id: 'COPY-014',
        location: '검색 화면 설명',
        before: '요리 제목, 재료, 창작자 이름을 함께 보고 가장 가까운 레시피를 먼저 보여줘요.',
        after: '요리 이름, 재료, 만든 사람 이름으로 찾을 수 있어요.',
        reason: '검색 가능 범위를 더 부드럽게 안내합니다.'
      }
    ]
  },
  {
    group: 'assistant-entry',
    title: '홈 요리비서 진입 문구',
    note: '홈 상단 요리비서 카드 제목입니다.',
    candidates: [
      {
        id: 'COPY-015',
        location: '앱 홈 요리비서 카드',
        before: '요리비서에게 물어보고 시작하기',
        after: '막히기 전에 요리비서에게 물어보기',
        reason: '요리비서의 역할을 문제 해결 중심으로 보여줍니다.'
      },
      {
        id: 'COPY-016',
        location: '앱 홈 요리비서 카드',
        before: '요리비서에게 물어보고 시작하기',
        after: '오늘 만들 요리부터 골라보기',
        reason: '검색/추천 흐름을 먼저 타게 만드는 문구입니다.'
      }
    ]
  },
  {
    group: 'feedback-label',
    title: '피드백 표현',
    note: '공개 화면에서 피드백이라는 내부 용어를 얼마나 풀어쓸지 결정합니다.',
    candidates: [
      {
        id: 'COPY-017',
        location: '랜딩/앱 의견 버튼',
        before: '피드백',
        after: '의견 남기기',
        reason: '사용자가 무엇을 하면 되는지 더 명확합니다.'
      },
      {
        id: 'COPY-018',
        location: '랜딩/앱 의견 버튼',
        before: '피드백',
        after: '불편한 점 남기기',
        reason: '개선 의견 수집 목적이 더 직접적으로 드러납니다.'
      }
    ]
  },
  {
    group: 'recipe-request-label',
    title: '레시피 요청 표현',
    note: '완료 화면과 랜딩의 레시피 모집 표현입니다.',
    candidates: [
      {
        id: 'COPY-019',
        location: '완료/랜딩 레시피 요청 버튼',
        before: '요리 요청하기',
        after: '보고 싶은 요리 보내기',
        reason: '요청보다 참여 느낌이 부드럽습니다.'
      },
      {
        id: 'COPY-020',
        location: '완료/랜딩 레시피 요청 버튼',
        before: '요리 요청하기',
        after: '따라 하고 싶은 영상 보내기',
        reason: 'SNS/유튜브 영상 기반 서비스라는 후킹과 더 맞습니다.'
      }
    ]
  },
  {
    group: 'pot-feature',
    title: '냄비 캐릭터 보조 문구',
    note: '상단에서 화면을 가리지 않게 배치하면서 남길 캐릭터 문구입니다.',
    candidates: [
      {
        id: 'COPY-021',
        location: '랜딩 냄비 캐릭터 영역',
        before: '작은 냄비가 순서를 챙겨요',
        after: '작은 냄비가 옆에서 챙겨요',
        reason: '이전 피드백에서 선호가 있었고, 화면 가림 문제는 배치로 해결합니다.'
      },
      {
        id: 'COPY-022',
        location: '랜딩 냄비 캐릭터 영역',
        before: '작은 냄비가 순서를 챙겨요',
        after: '작은 냄비가 같이 따라가요',
        reason: '순서 관리보다 동행감을 강조합니다.'
      }
    ]
  }
];

export const copyCandidates = copyCandidateGroups.flatMap((group) => (
  group.candidates.map((candidate) => ({ ...candidate, group: group.group, groupTitle: group.title }))
));

export const copyCandidateById = new Map(copyCandidates.map((candidate) => [candidate.id, candidate]));

