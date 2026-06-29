#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WRAPPER_DIR="$ROOT_DIR/android-wrapper"
SDK_DIR="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BUILD_TOOLS="$SDK_DIR/build-tools/34.0.0"
ANDROID_JAR="$SDK_DIR/platforms/android-34/android.jar"
OUT_DIR="$WRAPPER_DIR/build"
KEYSTORE="$OUT_DIR/debug.keystore"
APK_UNSIGNED="$OUT_DIR/cook-wireframe-unsigned.apk"
APK_ALIGNED="$OUT_DIR/cook-wireframe-aligned.apk"
APK_SIGNED="$OUT_DIR/cook-wireframe-debug.apk"

mkdir -p "$OUT_DIR/classes" "$OUT_DIR/dex" "$WRAPPER_DIR/src/main/assets/cheftory_image"
cp "$ROOT_DIR/app.html" "$WRAPPER_DIR/src/main/assets/app.html"
cp "$ROOT_DIR"/cheftory_image/*.PNG "$WRAPPER_DIR/src/main/assets/cheftory_image/"

"$BUILD_TOOLS/aapt" package -f \
  -M "$WRAPPER_DIR/src/main/AndroidManifest.xml" \
  -S "$WRAPPER_DIR/src/main/res" \
  -A "$WRAPPER_DIR/src/main/assets" \
  -I "$ANDROID_JAR" \
  -F "$APK_UNSIGNED"

javac -encoding UTF-8 \
  -classpath "$ANDROID_JAR" \
  -d "$OUT_DIR/classes" \
  "$WRAPPER_DIR/src/main/java/com/cook/wireframe/MainActivity.java"

find "$OUT_DIR/classes" -name '*.class' -print > "$OUT_DIR/classes.list"
xargs "$BUILD_TOOLS/d8" \
  --lib "$ANDROID_JAR" \
  --output "$OUT_DIR/dex" \
  < "$OUT_DIR/classes.list"

cd "$OUT_DIR/dex"
zip -q -u "$APK_UNSIGNED" classes.dex
cd "$ROOT_DIR"

"$BUILD_TOOLS/zipalign" -f 4 "$APK_UNSIGNED" "$APK_ALIGNED"

if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair \
    -keystore "$KEYSTORE" \
    -storepass android \
    -keypass android \
    -alias androiddebugkey \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -dname "CN=Android Debug,O=Cook Wireframe,C=KR" >/dev/null
fi

"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "$APK_SIGNED" \
  "$APK_ALIGNED"

"$BUILD_TOOLS/apksigner" verify "$APK_SIGNED"
echo "$APK_SIGNED"
