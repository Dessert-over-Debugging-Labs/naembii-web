# Android 개발 세팅 인계 문서

작성일: 2026-07-11

## 목적

웹 베타가 모바일 중심으로 안정화된 뒤 Android 개발을 시작하기 위한 로컬 세팅, 검증 기준, 다음 세션 인계 프롬프트를 정리한다.

## 현재 방향

- 지금은 웹 베타를 먼저 배포하고, Android는 WebView 래퍼 또는 네이티브 전환 중 무엇이 맞는지 검토한다.
- 이미 `android-wrapper/` 폴더가 있으므로 첫 단계는 기존 래퍼가 최신 웹 URL을 안정적으로 띄우는지 확인하는 것이다.
- Gemini Live나 마이크 권한은 Android WebView 권한 처리와 개인정보 문구가 필요해 별도 검증 항목으로 둔다.

## 로컬 준비

```bash
# 기본 확인
java -version
echo $ANDROID_HOME

# Android 래퍼 문서 확인
sed -n '1,220p' android-wrapper/README_ko.md
```

확인할 항목:

- Android Studio 설치
- JDK 17 확인
- `ANDROID_HOME` 확인
- 에뮬레이터 또는 실기기 준비
- `android-wrapper/README_ko.md` 확인
- `android-wrapper/build-apk.sh` 실행 가능 여부 확인

## 검증 체크리스트

- [ ] WebView에서 `https://naembii-web.vercel.app/app` 접속 가능
- [ ] 홈, 검색, 상세, 조리 모드가 모바일 폭에서 잘리지 않음
- [ ] YouTube iframe 재생/음량 제어 정책 확인
- [ ] 마이크 권한 요청이 WebView에서 정상 표시되는지 확인
- [ ] 피드백/요리 요청 폼 제출 가능
- [ ] 뒤로가기 버튼과 Android 시스템 back 동작 정리

## 다음 세션 프롬프트

```text
목표: 냄비 웹 베타를 기준으로 Android 개발 세팅을 시작한다.
1. /Users/osein/cook-assistance-wireframe 저장소에서 시작한다.
2. 먼저 AGENTS.md 지침과 android-wrapper/README_ko.md를 읽는다.
3. 웹 베타 최신 main을 pull/fetch하고 /app 배포 URL 동작을 확인한다.
4. android-wrapper가 최신 Vercel URL을 띄우는지 확인하고, 필요하면 설정을 수정한다.
5. Android Studio/Gradle/JDK/ANDROID_HOME 상태를 점검한다.
6. 에뮬레이터 또는 연결된 기기에서 빌드/실행한다.
7. WebView 마이크 권한, YouTube 재생/음량, 뒤로가기, 폼 제출을 체크리스트로 검증한다.
8. 모든 단계는 Notion 작업 페이지에 기록하고, 커밋 메시지는 한국어 Conventional Commit으로 분리한다.
```
