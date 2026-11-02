#!/usr/bin/env bash
# Lädt build/PerfPulse.apk auf die PerfPulse-Website (classes/Site/MobileApp.php dort), in Stücken.
#   SERVER_URL, SERVER_BUILD_KEY, VERSION, VERSION_CODE, NOTE, COMMIT
# Danach ist die Version veröffentlicht: /app/PerfPulse.apk, und die Apps bieten das Update an.
set -euo pipefail

server="${SERVER_URL%/}"
apk=build/PerfPulse.apk
key=(-H "X-PP-Build-Key: ${SERVER_BUILD_KEY}")

call() { # Methode Adresse [curl-Optionen …] – bricht mit der Meldung des Servers ab
  local method=$1 url=$2; shift 2
  local out status
  out=$(curl -sS -X "$method" "${key[@]}" "$@" -w '\n%{http_code}' "$url")
  status=${out##*$'\n'}; out=${out%$'\n'*}
  if [[ $status != 2* ]]; then echo "::error::$method $url → $status: $out" >&2; exit 1; fi
  printf '%s' "$out"
}

start=$(jq -n --arg v "$VERSION" --argjson c "$VERSION_CODE" --arg n "$NOTE" --arg s "$COMMIT" '{version:$v, versionCode:$c, note:$n, commit:$s}' \
  | call POST "$server/api/mobile-uploads" -H 'Content-Type: application/json' --data-binary @-)
id=$(jq -r .id <<<"$start")
chunk=$(jq -r .maxChunkBytes <<<"$start")
size=$(stat -c %s "$apk")
echo "Hochladen $id: $size Bytes in Stücken zu $chunk"

offset=0
while (( offset < size )); do
  part=$(mktemp)
  dd if="$apk" of="$part" bs=1M iflag=skip_bytes,count_bytes skip="$offset" count="$chunk" status=none
  received=$(call PUT "$server/api/mobile-uploads/$id?offset=$offset" -H 'Content-Type: application/octet-stream' --data-binary @"$part" | jq -r .received)
  rm -f "$part"
  if (( received <= offset )); then echo "::error::Der Server nahm kein Stück an (offset $offset)." >&2; exit 1; fi
  offset=$received
done

jq -n --arg h "$(sha256sum "$apk" | cut -d' ' -f1)" '{sha256:$h}' \
  | call POST "$server/api/mobile-uploads/$id/commit" -H 'Content-Type: application/json' --data-binary @- | jq .
