# 냄비 Ralph 검증 루프 운영 문서

목적: 구현 후 검증을 한 번만 돌리고 끝내지 않고, 점수표가 96%를 초과할 때까지 반복해서 확인한다. 이 루프는 제품 결함과 실행 환경 불확실성을 분리해서 기록한다.

## 기본 명령

```bash
npm run verify:ralph-loop
```

기본 동작:

- 로컬 서버를 `127.0.0.1:4191`에서 자동 실행한다.
- `npm run verify:visual -- --full --min-score=96`과 같은 기준으로 검증한다.
- 점수가 96%를 초과하고 모든 게이트가 PASS면 성공 종료한다.
- 결과는 아래 파일에 남긴다.

```text
docs/verify/NAEMBI_RALPH_LOOP_LAST_ko.md
docs/verify/NAEMBI_RALPH_LOOP_LAST_ko.json
```

## 5시간 자율 실행 모드

장시간 자율 검증이 필요할 때:

```bash
node scripts/run-naembi-ralph-loop.mjs --visual --full --min-score=96 --min-runtime-minutes=300 --interval-seconds=120
```

이 모드는 PASS가 나와도 최소 300분 동안 주기적으로 재검증한다. 장시간 실행 중 사람이 개입하지 않아도 마지막 성공/실패/불확실 상태를 리포트에 남긴다.

## 판정 규칙

| 상태 | 의미 | 다음 행동 |
| --- | --- | --- |
| PASS | 점수 96% 초과, 게이트 실패 0건 | 종료 또는 장시간 모드에서는 다음 주기까지 대기 |
| FAIL | 제품/문서/설정 결함 | 리포트의 보정 후보만 수정하고 재실행 |
| INCONCLUSIVE | Chrome 권한, 포트, 네트워크, 로컬 서버 같은 실행 조건 문제 | 실행 환경을 복구한 뒤 재실행 |
| TIMEOUT | 정해진 시간 안에 PASS를 확보하지 못함 | 마지막 리포트 기준으로 실패 게이트를 보정 |

## 루프에서 수정하지 않는 것

- `.DS_Store`
- `.env`, 인증 토큰, 로컬 DB, 세션 로그
- Vercel/GitHub/Google 실제 계정 설정
- 사용자가 명시하지 않은 별도 레포 구조 분리

## 사람이 확인할 배포 포인트

코드 검증이 PASS여도 실제 공유 도메인은 별도 확인이 필요하다.

```bash
curl -I https://naembii-web.vercel.app/
curl -I https://naembii-web.vercel.app/app
curl -I https://naembii-web.vercel.app/design
```

기존 `https://naembi.vercel.app/`가 오래된 프로젝트 alias를 보고 있으면 최신 구현과 다를 수 있다. 이 경우 Vercel 대시보드에서 alias를 최신 프로젝트로 옮긴다.
