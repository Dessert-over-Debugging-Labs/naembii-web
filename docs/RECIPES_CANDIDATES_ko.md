# 베타 레시피 큐레이션 완료 기록

`app.html`의 `RECIPES` 배열에 추가할 후보 4종을 실제 영상 바인딩까지 채워 통합했다.
정본 데이터는 `app.html`이며, [`docs/RECIPES_CANDIDATES.js`](./RECIPES_CANDIDATES.js)는 같은 내용을 남긴 검증용 스니펫이다.

## 검증 원칙

- 영상은 2026-07-05 KST 기준 `yt-dlp` 메타데이터에서 `availability=public`, `playable_in_embed=True`를 확인했다.
- 단계 구간은 임의 배분하지 않고, `yt-dlp`로 받은 공개 자막 JSON(`ko`, 계란말이 `en-US`) 타임코드를 Maangchi 공식 레시피 페이지의 조리 순서와 맞춰 산출했다.
- 설명란에 챕터 타임스탬프는 없었다. 구간 근거는 transcript start time + 공식 recipe directions다.
- 원문 transcript JSON은 `/private/tmp`에서만 처리했고 repo에 커밋하지 않는다.

## 추가한 레시피

| 요리 | videoId | 채널 | 근거 |
|---|---|---|---|
| 김치볶음밥 | `Lf44Fk7H24s` | Maangchi | <https://www.maangchi.com/recipe/kimchi-bokkeumbap> |
| 계란말이 | `kN89ewZjOR8` | Maangchi | <https://www.maangchi.com/recipe/gyeran-mari> |
| 된장찌개 | `Slj_fM1jQVo` | Maangchi | <https://www.maangchi.com/recipe/doenjang-jjigae> |
| 제육볶음 | `3oFCGKmzQX8` | Maangchi | <https://www.maangchi.com/recipe/dwaejigogi-bokkeum> |

## 앱 반영

- `RECIPES` 배열에 4개 객체 추가.
- `renderHomeSections()`의 `popIds`에 4개 모두 등록.
- `recIds`에는 빠르게 만들기 좋은 김치볶음밥·계란말이와 기존 추천을 함께 노출.
- 각 step의 `time`/`start`/`end`는 조리모드 seek/loop가 사용할 수 있는 초 단위 값으로 채웠다.

## 남은 확인

- 로컬 서버에서 상세 화면과 `cook3` 진입을 확인한다.
- YouTube 실제 재생은 환경/브라우저 정책 영향을 받으므로, 앱의 기존 정직 폴백 정책을 유지한다.
