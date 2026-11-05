# PerfPulse – Handy-App

Zeigt die Live-Werte deiner PCs mit [PerfPulse](https://github.com/MischaFierz/PerfPulseApp) –
von überall: CPU, RAM, GPU, Datenträger, Netzwerk, Temperaturen, die
aktivsten Prozesse und Abstürze. Mehrere PCs gehen auch.

## So geht's

1. In PerfPulse am PC: Seite **Handy** → die Handy-Verbindung einschalten.
2. In der App den QR-Code scannen (oder den kopierten Link einfügen).
3. Fertig – der PC bleibt gespeichert. Die App öffnen genügt, solange PerfPulse am PC läuft.

Die Werte gehen über die PerfPulse-Website und sind **Ende-zu-Ende verschlüsselt**
(AES-256-GCM): Den Schlüssel kennen nur der PC und das Handy (im QR-Code, auf dem Handy im
sicheren Speicher). Die Website sieht nur unlesbare Daten. Die App fragt nur, solange sie offen
ist – im Hintergrund nie, das spart Akku und Daten.

## Installieren

**Android:** Auf dem Handy `https://<PerfPulse-Website>/app/PerfPulse.apk` öffnen (oder auf
`/handy` den Link „PerfPulse als Android-App“ antippen), herunterladen und installieren – einmal
„Unbekannte Apps installieren“ erlauben. Danach meldet die App neue Versionen selbst:
„Neue Version … – Herunterladen & installieren“.

**iPhone:** Apple erlaubt Apps nur über den App Store / TestFlight (Apple-Entwicklerkonto).
Ohne das: `https://<PerfPulse-Website>/handy` in Safari öffnen → *Teilen* → *Zum Home-Bildschirm* –
sie öffnet sich dann wie eine App, ohne Browser.

## Veröffentlichen

Im Admin-Bereich der Website unter **Handy-App** einen Commit auf `main` wählen →
**Veröffentlichen** (Version, versionCode, Update-Info). Das startet hier den Workflow
„App veröffentlichen“ (`.github/workflows/app-veroeffentlichen.yml`): Er setzt Version und
versionCode in `app.json`, baut die APK (`tools/android-build.sh`) und lädt sie auf die Website
(`tools/upload.sh`). Ab dann bekommt sie jeder, und die installierten Apps bieten das Update an.

Einmal einrichten (Settings → Secrets and variables → Actions), wie bei PerfPulseApp:
- Secret `SERVER_BUILD_KEY` (= `PP_BUILD_KEY` der Website) und Variable `SERVER_URL` (die Adresse der Website).
- Das GitHub-Token der Website (`PP_GITHUB_TOKEN`) braucht auch auf diesem Repository
  „Contents: Read“ und „Actions: Read and write“.
- **Eigener Signier-Schlüssel – unbedingt vor der ersten Veröffentlichung.** Android installiert ein
  Update nur, wenn es mit demselben Schlüssel signiert ist; ohne Secrets nimmt der Bau den
  öffentlich bekannten Debug-Schlüssel der Vorlage. Secrets `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Einmal erzeugen und gut aufheben:

```sh
keytool -genkeypair -v -keystore perfpulse.jks -alias perfpulse -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 perfpulse.jks   # → ANDROID_KEYSTORE_BASE64
```

Jeder Push auf `main` baut die App zur Probe („Android-APK bauen“, APK unter *Artifacts*) –
veröffentlicht wird nur über den Admin-Bereich.

## Entwickeln

```sh
npm install
npm run typecheck
npm test                 # Entschlüsseln und QR-Code, gegen das Format von PerfPulse
npx expo run:android     # Development-Build auf einem Handy/Emulator (Expo Go reicht nicht: Kamera + SecureStore)
```

Expo (React Native), TypeScript. `android/` und `ios/` entstehen aus `app.json`
(`npx expo prebuild`) und sind nicht im Repository.

```
App.tsx                  PCs laden/speichern, Auswahl, Scannen ↔ Werte
src/screens/             ScanScreen (QR), DashboardScreen (Werte, alle 2,5 s)
src/components/          Gauge, Chart, Card
src/api.ts               GET {Website}/api/phone/{id} mit X-PP-Read-Token
src/crypto.ts            AES-256-GCM (noble), Base64, UTF-8
src/pairing.ts           Den QR-Code lesen: https://…/handy#i=…&r=…&e=…
src/storage.ts           expo-secure-store
src/update.ts            Neue Version auf der Website? (/api/mobile-app)
tools/                   android-build.sh (APK bauen), upload.sh (auf die Website laden)
.github/workflows/       app-veroeffentlichen.yml (vom Admin-Bereich), android-apk.yml (Probebau)
```
