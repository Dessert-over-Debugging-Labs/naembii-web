# 어색한 어휘 수정 후보 운영 방식

작성일: 2026-07-09

최신 후보 페이지: https://app.notion.com/p/2026-07-09-398b1da1d9f98115aabef22c090682ef

## 목적

공개 화면의 어색한 어휘를 Codex가 임의로 바꾸지 않고, Notion 후보 페이지에서 사용자가 체크한 항목만 실제 코드에 반영한다.

## 흐름

1. Codex가 Notion에 `어색한 어휘 수정 후보` 페이지를 만든다.
2. 사용자가 반영할 후보만 체크한다.
3. 같은 묶음 안에서는 하나만 체크한다.
4. Codex가 읽기 스크립트로 체크된 후보를 확인한다.
5. 체크된 후보만 코드에 반영하고 검증한다.

## 스크립트

```bash
npm run notion:copy-candidates:upload
NOTION_COPY_CANDIDATES_PAGE_ID=398b1da1-d9f9-8115-aabe-f22c090682ef npm run notion:copy-candidates:read
NOTION_COPY_CANDIDATES_PAGE_ID=398b1da1-d9f9-8115-aabe-f22c090682ef npm run notion:copy-candidates:apply -- --dry-run
NOTION_COPY_CANDIDATES_PAGE_ID=398b1da1-d9f9-8115-aabe-f22c090682ef npm run notion:copy-candidates:apply
```

## 반영 기준

- 체크되지 않은 문구는 바꾸지 않는다.
- 같은 묶음에서 여러 후보가 체크되어 있으면 반영하지 않고 확인을 요청한다.
- 적용 전에는 `--dry-run`으로 변경 대상 파일과 치환 횟수를 확인한다.
- 기존 문구가 이미 바뀌어 있으면 `alreadyApplied`로 보고하고, 기존/후보 문구가 모두 없으면 실패 처리한다.
- 검색 결과 분리, 모바일 레이아웃 같은 구조 수정은 별도 작업으로 진행할 수 있다.
- CTA, 튜토리얼, 검색 설명처럼 공개 카피 교체는 이 후보 페이지의 체크 상태를 기준으로 한다.
