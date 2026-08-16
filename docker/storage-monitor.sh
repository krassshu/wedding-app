#!/bin/sh
set -eu

threshold="${DISK_ALERT_PERCENT:-80}"
interval="${DISK_CHECK_INTERVAL_SECONDS:-60}"
status_file="${STORAGE_STATUS_FILE:-/status/status.json}"
last_alert=0

mkdir -p "$(dirname "$status_file")"

while true; do
  set -- $(df -Pk /storage | awk 'NR == 2 { gsub(/%/, "", $5); print $2, $3, $4, $5 }')
  total_kb="${1:-0}"
  used_kb="${2:-0}"
  available_kb="${3:-0}"
  used_percent="${4:-100}"
  checked_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  state="ok"
  if [ "$used_percent" -ge "$threshold" ]; then
    state="warning"
  fi

  temporary="${status_file}.tmp"
  printf '{"status":"%s","usedPercent":%s,"totalKb":%s,"usedKb":%s,"availableKb":%s,"thresholdPercent":%s,"checkedAt":"%s"}\n' \
    "$state" "$used_percent" "$total_kb" "$used_kb" "$available_kb" "$threshold" "$checked_at" > "$temporary"
  mv "$temporary" "$status_file"

  now="$(date +%s)"
  if [ "$state" = "warning" ] && [ -n "${DISK_ALERT_WEBHOOK_URL:-}" ] && [ $((now - last_alert)) -ge 3600 ]; then
    payload="{\"text\":\"Wedding App: dysk zdjęć zajęty w ${used_percent}% (próg ${threshold}%).\"}"
    wget -qO- --timeout=10 \
      --header='Content-Type: application/json' \
      --post-data="$payload" \
      "$DISK_ALERT_WEBHOOK_URL" >/dev/null 2>&1 || true
    last_alert="$now"
  fi

  sleep "$interval"
done

