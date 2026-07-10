# 장시간 동적 검증 워크플로우 실행 리포트

- 시작: 2026-07-10T18:26:36.028Z
- 종료: 2026-07-10T18:27:10.088Z
- 판정: **PASS**
- 모드: smoke
- 기준 URL: `http://127.0.0.1:4873`
- 목표 실행 시간: 0분
- 주기: 0분
- 계획 주기 수: 1
- 산출물: `/tmp/cook-wireframe-v3/long-dynamic-workflow`

## 전체 판정

| cycle | status | tasks | duration |
| ---: | --- | ---: | ---: |
| 1 | PASS | 6 | 34s |

## 작업별 결과

| cycle | task | status | duration | command | log |
| ---: | --- | --- | ---: | --- | --- |
| 1 | check | PASS | 0s | `npm run check` | `/tmp/cook-wireframe-v3/long-dynamic-workflow/logs/cycle-1-check.log` |
| 1 | landing-mobile | PASS | 4s | `/opt/homebrew/Cellar/node/26.0.0/bin/node scripts/capture-landing.mjs http://127.0.0.1:4873/ /tmp/cook-wireframe-v3/long-dynamic-workflow/cycle-1/landing-mobile.png mobile 9711` | `/tmp/cook-wireframe-v3/long-dynamic-workflow/logs/cycle-1-landing-mobile.log` |
| 1 | landing-tablet | PASS | 4s | `/opt/homebrew/Cellar/node/26.0.0/bin/node scripts/capture-landing.mjs http://127.0.0.1:4873/ /tmp/cook-wireframe-v3/long-dynamic-workflow/cycle-1/landing-tablet.png tablet 9712` | `/tmp/cook-wireframe-v3/long-dynamic-workflow/logs/cycle-1-landing-tablet.log` |
| 1 | landing-desktop | PASS | 4s | `/opt/homebrew/Cellar/node/26.0.0/bin/node scripts/capture-landing.mjs http://127.0.0.1:4873/ /tmp/cook-wireframe-v3/long-dynamic-workflow/cycle-1/landing-desktop.png desktop 9713` | `/tmp/cook-wireframe-v3/long-dynamic-workflow/logs/cycle-1-landing-desktop.log` |
| 1 | load-performance | PASS | 4s | `npm run verify:load-performance -- http://127.0.0.1:4873 9801` | `/tmp/cook-wireframe-v3/long-dynamic-workflow/logs/cycle-1-load-performance.log` |
| 1 | mobile-flow | PASS | 18s | `npm run verify:mobile-flow -- http://127.0.0.1:4873 9901` | `/tmp/cook-wireframe-v3/long-dynamic-workflow/logs/cycle-1-mobile-flow.log` |

## 랜딩 모바일 압축 지표

| cycle | mode | document height | viewport | scroll screens | cropped images | forbidden terms | screenshot |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | mobile | 2957 | 844 | 3.5 | 0 | 0 | `/tmp/cook-wireframe-v3/long-dynamic-workflow/cycle-1/landing-mobile.png` |
| 1 | tablet | 3827 | 1100 | 3.48 | 0 | 0 | `/tmp/cook-wireframe-v3/long-dynamic-workflow/cycle-1/landing-tablet.png` |
| 1 | desktop | 5071 | 1100 | 4.61 | 0 | 0 | `/tmp/cook-wireframe-v3/long-dynamic-workflow/cycle-1/landing-desktop.png` |

## 로딩 성능 지표

| cycle | DCL | load | YouTube iframe | YouTube player requests | ytimg requests |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 48ms | 671ms | 0 | 0 | 5 |

## 앱 화면 검증

| cycle | status | checked | failed | outDir |
| ---: | --- | ---: | ---: | --- |
| smoke에서는 생략됨 | - | - | - | - |

## 요리비서 플로우 검증

| cycle | home active | direct input exists | ducked volume commands | restored volume commands |
| ---: | --- | --- | --- | --- |
| 1 | home | false | 80, 22 | 80, 22, 80 |

## 전체 실행 명령

```bash
npm run verify:long-dynamic -- --base-url=http://127.0.0.1:4873 --duration-minutes=360 --interval-minutes=20 --full
```

## 운영 규칙

- 실패가 한 번이라도 나오면 다음 cycle에서 앱 화면 캡처와 동적 점수표를 강제로 포함한다.
- 랜딩은 mobile/tablet/desktop 모두 캡처하고 잘림, 금지어, 스크롤 압박을 기록한다.
- 앱은 모바일 플로우, 로딩 성능, 126개 화면 상태 캡처를 반복한다.
- 결과는 JSON/MD/HTML로 남겨 다음 세션에서 같은 기준으로 이어서 볼 수 있게 한다.
