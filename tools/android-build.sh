#!/usr/bin/env bash
# Baut die Android-App (APK) – für beide Workflows. Aufruf im Hauptordner nach "npm ci".
#   VERSION, VERSION_CODE        optional: setzen die Nummern in app.json (sonst bleiben die dort)
#   ANDROID_KEYSTORE_BASE64 …    optional: eigener Signier-Schlüssel (sonst der Debug-Schlüssel der Vorlage)
# Ergebnis: build/PerfPulse.apk
set -euo pipefail

if [[ -n "${VERSION:-}" ]]; then
  node -e '
    const fs = require("fs"), app = JSON.parse(fs.readFileSync("app.json", "utf8"));
    app.expo.version = process.env.VERSION;
    app.expo.android.versionCode = Number(process.env.VERSION_CODE);
    fs.writeFileSync("app.json", JSON.stringify(app, null, 2) + "\n");'
fi

# android/ entsteht aus app.json (Continuous Native Generation) und ist nicht im Repository.
npx expo prebuild --platform android --no-install --clean

if [[ -n "${ANDROID_KEYSTORE_BASE64:-}" ]]; then
  echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/release.keystore
  {
    echo "PP_STORE_FILE=release.keystore"
    echo "PP_STORE_PASSWORD=${ANDROID_KEYSTORE_PASSWORD}"
    echo "PP_KEY_ALIAS=${ANDROID_KEY_ALIAS}"
    echo "PP_KEY_PASSWORD=${ANDROID_KEY_PASSWORD}"
  } >> android/gradle.properties
  python3 - <<'PY'
import re
p = 'android/app/build.gradle'
s = open(p).read()
s = s.replace("signingConfigs {", """signingConfigs {
        release {
            storeFile file(PP_STORE_FILE)
            storePassword PP_STORE_PASSWORD
            keyAlias PP_KEY_ALIAS
            keyPassword PP_KEY_PASSWORD
        }""", 1)
s = re.sub(r"(buildTypes \{.*?release \{[^{}]*?)signingConfig signingConfigs\.debug", r"\1signingConfig signingConfigs.release", s, count=1, flags=re.S)
open(p, 'w').write(s)
PY
fi

# Für Handys mit 32 Bit (armeabi-v7a) und 64 Bit (arm64-v8a) – eine APK für alle echten Handys.
# Nur x86 (Emulatoren am PC) fehlt, das macht die APK kleiner.
(cd android && ./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=armeabi-v7a,arm64-v8a)

mkdir -p build
cp android/app/build/outputs/apk/release/app-release.apk build/PerfPulse.apk
ls -l build/PerfPulse.apk
