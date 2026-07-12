# 장시간 동적 검증 최종 요약 리포트

## 실행 개요

- 실행일: 2026-07-11
- 대상 URL: `https://naembii-web.vercel.app`
- 대상 커밋: `aedfe04`
- 실행 시간: 2026-07-11 03:37:37 KST - 2026-07-11 09:22:01 KST
- 목표 시간: 360분
- 검증 주기: 20분
- 전체 판정: **PASS**

## 결론

6시간 장시간 자율 검증은 18개 cycle, 144개 task 모두 통과했다. 공개 배포 URL 기준으로 랜딩 길이, 모바일 앱 주요 플로우, 화면 잘림, 로딩 성능, 요리비서 입력 UX, YouTube 음량 덕킹, 동적 점수표가 반복적으로 안정 상태임을 확인했다.

## 요약 점수표

| 항목 | 결과 |
| --- | --- |
| cycle | 18 / 18 PASS |
| total tasks | 144 / 144 PASS |
| failures | 0 |
| `check` | 18 / 18 PASS |
| `landing-mobile` | 18 / 18 PASS |
| `landing-tablet` | 18 / 18 PASS |
| `landing-desktop` | 18 / 18 PASS |
| `load-performance` | 18 / 18 PASS |
| `mobile-flow` | 18 / 18 PASS |
| `app-screens` | 18 / 18 PASS |
| `dynamic-scorecard` | 18 / 18 PASS |

## 핵심 지표

| 지표 | 값 |
| --- | --- |
| 모바일 랜딩 높이 | 2957px |
| 모바일 랜딩 스크롤 화면 수 | 3.5 screens |
| 태블릿 랜딩 스크롤 화면 수 | 3.48 screens |
| 데스크톱 랜딩 스크롤 화면 수 | 4.61 screens |
| 잘린 앱 미리보기 이미지 | 0 |
| 공개 화면 내부 금지어 | 0 |
| DOMContentLoaded | 80-129ms |
| load event | 170-759ms |
| 초기 YouTube iframe | 0 |
| 초기 YouTube player request | 0 |
| 초기 `ytimg` request | 5 |
| 앱 화면 검증 | 매 cycle 126 checked / 0 failed |
| 요리비서 직접 입력창 | false |
| 요리비서 답변 중 영상 음량 낮춤 | 80 -> 22 |
| 요리비서 답변 종료 후 영상 음량 복구 | 80 -> 22 -> 80 |

## 확인한 사용자 흐름

- 루트 랜딩에서 모바일 첫 화면 CTA와 앱 미리보기가 정상 노출됨
- 검색 시작 화면과 결과 목록 화면 분리 흐름 유지
- 크리에이터 검색 결과와 요리 결과 분리 유지
- 웹앱 내부 피드백 제출 흐름 유지
- 로컬 후기와 조리 팁 저장/노출 유지
- 완료 화면에서 공유, 후기, 팁, 홈 이동 흐름 유지
- 게스트 계정 안내와 알림 예정 화면 연결 유지
- 타이머 직접 입력, +30초 조정, 완료 알림, 자동 정지 유지
- 재료 목록 보기와 체크리스트 보기 분리 유지
- 요리비서 패널 기본/확장/중간 높이, 긴 답변 스크롤 유지
- 요리비서 추천 질문 선택 시 현재 조리 단계가 자동으로 넘어가지 않음
- 요리비서 답변 중 영상 볼륨이 낮아지고 답변 후 기존 볼륨으로 복구됨

## 산출물 위치

| 산출물 | 위치 |
| --- | --- |
| 최종 원본 리포트 | `/tmp/cook-wireframe-v3-long-dynamic-live.md` |
| 최종 원본 JSON | `/tmp/cook-wireframe-v3-long-dynamic-live.json` |
| 최종 원본 HTML | `/tmp/cook-wireframe-v3-long-dynamic-live.html` |
| cycle별 캡처/로그 | `/tmp/cook-wireframe-v3-long-dynamic-artifacts` |

## 저장소 반영 기준

이번 실행의 cycle별 원본 HTML/JSON/MD는 대량 산출물이므로 커밋하지 않는다. 저장소에는 이 최종 요약 리포트만 남기고, 원본은 `/tmp` 산출물로 보존한다. 이후 장시간 검증도 같은 기준으로 “원본은 outDir, 저장소에는 최종 요약”만 반영한다.

## 다음 조치

- 신규 개발 전 `npm run verify:long-dynamic:smoke -- --base-url=<검증 URL>`로 빠른 기준선을 먼저 확인한다.
- 모바일 UI나 조리 모드 변경 후에는 `npm run verify:mobile-flow`와 `npm run verify:app-screens`를 필수로 실행한다.
- 배포 후 장시간 검증이 필요하면 `npm run verify:long-dynamic -- --base-url=https://naembii-web.vercel.app --duration-minutes=360 --interval-minutes=20 --full --report=/tmp/cook-wireframe-v3-long-dynamic-live.md --out-dir=/tmp/cook-wireframe-v3-long-dynamic-artifacts`로 실행한다.
