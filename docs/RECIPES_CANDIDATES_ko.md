# 더미 레시피 큐레이션 초안 (RECIPES 후보)

app.html의 `RECIPES` 배열에 추가할 베타용 더미 레시피 후보. **app.html은 직접 수정하지 않았고**, 여기서 준비한 뒤
사람이 검증·머지한다. 순두부찌개(`CgapOjKdo9I`)는 이미 있으니 **다른 인기·쉬운 한식 4종**을 골랐다.

## 정직성 원칙 (이 repo 규칙)

- **요리 내용**(재료 main/seasoning, 단계 title·subs)은 요리 상식 기반으로 채움 → 사람이 검토 가능.
- **영상 바인딩**(`id`=유튜브 영상 id, `channel`, 각 step의 `time`/`start`/`end` 초)은 **영상마다 다르므로 지어내지 않는다.**
  아래 초안에 `TODO(영상)`로 남겼다. `.claude/skills/recipe-from-youtube` 스킬(자막→챕터→설명란 폴백)로 실제 영상에서
  구간을 추출해 채운다. 구간이 틀리면 조리모드 seekTo가 깨지므로 반드시 실제 값으로.
- `food`는 썸네일 그라데이션 클래스(app.html의 정의 확인 후 food1~ 중 선택).

## 채우는 절차 (레시피 1개당)

1. 그 요리의 **임베드 가능한** 유튜브 영상 1개 선정(전 과정·단계 명확·`embeddable=true`).
2. recipe-from-youtube 스킬로 단계 구간(start/end 초)·재료를 추출 → 아래 초안의 TODO/subs 보정.
3. `id`(youtube 영상 id), `channel`, 각 step `time`('m:ss ~ m:ss')·`start`·`end` 채움.
4. app.html의 `RECIPES`에 추가하고 `renderHomeSections()`의 `popIds`/`recIds`에 id 등록.
5. 로컬 서버로 조리모드에서 구간 재생 육안 확인(HANDOFF의 green-gate).

## 후보 4종 (요리 내용 확정 / 영상 TODO)

아래 `.js` 스니펫: `docs/RECIPES_CANDIDATES.js`. 요리 내용은 검토용 초안이니 사람이 최종 확인.

1. **김치볶음밥** — 매우 흔함·초간단·냉장고 재료. 자취/입문 데모에 적합.
2. **계란말이** — 재료 최소·단계 명확. 실패율 낮아 완주 데모 좋음.
3. **된장찌개** — 국물 요리 대표·재료 수급 쉬움.
4. **제육볶음** — 인기·밥도둑·단계 뚜렷(양념→재우기→볶기).

각 후보의 servings/time/difficulty는 요리 기준 합리값으로 넣었고, 영상 선정 후 실제와 맞으면 유지·다르면 보정한다.
