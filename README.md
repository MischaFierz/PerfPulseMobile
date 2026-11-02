# PerfPulse – Handy-App

Zeigt die Live-Werte deiner PCs mit [PerfPulse](https://github.com/MischaFierz/PerfPulseApp) –
von überall, nicht nur im Heimnetz: CPU, RAM, GPU, Datenträger, Netzwerk, Temperaturen, die
aktivsten Prozesse und Abstürze. Mehrere PCs gehen auch.

## So geht's

1. In PerfPulse am PC: Seite **Handy** → **Von überall** einschalten.
2. In der App den QR-Code scannen (oder den kopierten Link einfügen).
3. Fertig – der PC bleibt gespeichert. Die App öffnen genügt, solange PerfPulse am PC läuft.

Die Werte gehen über die PerfPulse-Website und sind **Ende-zu-Ende verschlüsselt**
(AES-256-GCM): Den Schlüssel kennen nur der PC und das Handy (im QR-Code, auf dem Handy im
sicheren Speicher). Die Website sieht nur unlesbare Daten. Die App fragt nur, solange sie offen
ist – im Hintergrund nie, das spart Akku und Daten.

## Installieren

**Android:** Unter Actions → „Android-APK bauen“ den neuesten Lauf öffnen, unter *Artifacts*
`PerfPulse-apk` herunterladen, entpacken und die APK auf dem Handy öffnen (einmal „Installation
aus unbekannten Quellen“ erlauben). Neue Versionen lassen sich darüber installieren.

Eigener Signier-Schlüssel (empfohlen, sonst der Debug-Schlüssel der Vorlage): Secrets
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
Einmal erzeugen:

```sh
keytool -genkeypair -v -keystore perfpulse.jks -alias perfpulse -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 perfpulse.jks   # → ANDROID_KEYSTORE_BASE64
```

**iPhone:** Apple erlaubt Apps nur über den App Store / TestFlight (Apple-Entwicklerkonto).
Ohne das: die Seite `https://<PerfPulse-Website>/handy` in Safari öffnen → *Teilen* →
*Zum Home-Bildschirm* – sie öffnet sich dann wie eine App, ohne Browser.

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
.github/workflows/       Android-APK bauen
```
