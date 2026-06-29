# Android 앱 형태 검증 래퍼

`app.html`을 Chrome 브라우저가 아니라 Android 런처 앱 형태로 띄우기 위한 최소 WebView 래퍼다.

## 빌드

```bash
./android-wrapper/build-apk.sh
```

결과물:

```text
android-wrapper/build/cook-wireframe-debug.apk
```

## 실행 검증

에뮬레이터는 기본적으로 꺼둔다. 실제 앱 검증이 필요할 때만 켠 뒤 아래 순서로 확인한다.

```bash
emulator @Pixel_5_API_31 -no-boot-anim -no-snapshot-save
adb -s emulator-5556 install -r android-wrapper/build/cook-wireframe-debug.apk
adb -s emulator-5556 shell am start -n com.cook.wireframe/.MainActivity
```

주의:
- 이 래퍼는 프로토타입 검증용이다. 실제 제품용 네이티브 앱 구조가 아니다.
- `app.html`과 `cheftory_image/`는 빌드 시 Android asset으로 복사된다.
- WebView에서 원격 유튜브 썸네일이 실패해도 로컬 이미지 폴백이 표시되어야 한다.
