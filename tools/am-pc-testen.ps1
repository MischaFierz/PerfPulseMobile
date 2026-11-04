# Startet die App am PC im Android-Emulator: Emulator hochfahren (falls nötig), App bauen,
# installieren, Metro starten. Aufruf: in WebStorm oben "App am PC" ▶ – oder im Hauptordner: npm run pc
# Danach erscheinen Änderungen am Code sofort (Fast Refresh).
$ErrorActionPreference = 'Stop'

$env:JAVA_HOME = "$env:LOCALAPPDATA\Programs\Java\jdk-17.0.21+9"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# android/ ist nicht im Repository – fehlt es, neu erzeugen.
if (-not (Test-Path "$root\android")) { npx expo prebuild --platform android --no-install }

# Das alte CMake/ninja von Gradle kann keine Pfade über 260 Zeichen – das neuere (4.1.2) schon.
$sdk = $env:ANDROID_HOME -replace '\\', '/'
Set-Content -Encoding ascii "$root\android\local.properties" "sdk.dir=$sdk`ncmake.dir=$sdk/cmake/4.1.2"

$running = (& adb devices) -match '^emulator-\d+\s+device'
if (-not $running) {
  # Der erste eingerichtete Emulator (z. B. Pixel_7) – er ist nicht nur für PerfPulse.
  $avd = @(& "$env:ANDROID_HOME\emulator\emulator.exe" -list-avds | Where-Object { $_ -and $_ -notmatch '^(INFO|WARNING|ERROR)' })[0]
  if (-not $avd) { throw 'Kein Android-Emulator eingerichtet.' }
  Write-Host "Starte den Emulator $avd ..."
  Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList '-avd', $avd, '-no-boot-anim'
  & adb wait-for-device
  while ((& adb shell getprop sys.boot_completed 2>$null) -ne '1') { Start-Sleep -Seconds 2 }
  Write-Host 'Emulator bereit.'
}

# Baut nur für die Architektur des Emulators, installiert, startet die App und Metro.
npx expo run:android
