#!/usr/bin/env bash
# Summarise the Caddy access log: how many people came, what they looked at,
# and what broke. Run on the VPS from /opt/azhagu:
#
#   ./deploy/traffic.sh            # today
#   ./deploy/traffic.sh 2026-08-04 # a specific day
#   ./deploy/traffic.sh all        # every log still on disk
#
# The log is JSON, one object per request, written by the `log` block in
# deploy/Caddyfile. Needs jq:  apt-get install -y jq
set -euo pipefail
cd "$(dirname "$0")/.."

LOG_DIR="logs/caddy"

# The VPS runs UTC but the shop and its customers are in IST. jq's
# strflocaltime honours TZ, so pin it — otherwise "9pm orders" show up as 3:30pm
# and a day's totals are cut 5½ hours short.
export TZ="${TZ:-Asia/Kolkata}"
DAY="${1:-$(date +%F)}"

command -v jq >/dev/null 2>&1 || {
  echo "ERROR: jq is not installed. Run: apt-get install -y jq" >&2
  exit 1
}
[ -d "$LOG_DIR" ] || {
  echo "ERROR: $LOG_DIR does not exist — is the access log enabled in the" >&2
  echo "       Caddyfile, and has caddy been restarted since?" >&2
  exit 1
}

# Caddy stamps ts as a unix float. Filter by day in jq so rolled files work too.
# Rolled files are gzipped, so read everything through zcat -f (which passes
# plain files straight through).
read_logs() { zcat -f "$LOG_DIR"/access.log "$LOG_DIR"/access-*.log.gz 2>/dev/null || true; }

if [ "$DAY" = "all" ]; then
  FILTER='.'
  LABEL="all logs on disk"
else
  FILTER="select((.ts | strflocaltime(\"%Y-%m-%d\")) == \"$DAY\")"
  LABEL="$DAY"
fi

# One pass, cached — the log can be tens of MB and we summarise it six ways.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
read_logs | jq -c "$FILTER" > "$TMP"

TOTAL=$(wc -l < "$TMP")
if [ "$TOTAL" -eq 0 ]; then
  echo "No requests logged for $LABEL."
  exit 0
fi

# Page views = HTML documents. Every other line is an image, a JS chunk or an
# API call, and counting those would make 20 visitors look like 4,000 "hits".
PAGES='select(.request.uri | test("^/(_next|uploads|api|favicon|logo|.*\\.(png|jpg|jpeg|webp|svg|ico|css|js|woff2?)$)") | not)'

echo "=== Traffic for $LABEL ==="
echo
printf 'Requests:      %s\n' "$TOTAL"
printf 'Page views:    %s\n' "$(jq -c "$PAGES" "$TMP" | wc -l)"
printf 'Unique IPs:    %s\n' "$(jq -r '.request.remote_ip' "$TMP" | sort -u | wc -l)"
echo

echo "--- Visitors by hour, IST (page views) ---"
jq -r "$PAGES | .ts | strflocaltime(\"%H:00\")" "$TMP" | sort | uniq -c | sort -k2
echo

echo "--- Top 15 pages ---"
jq -r "$PAGES | .request.uri" "$TMP" | sed 's/?.*//' | sort | uniq -c | sort -rn | head -15
echo

echo "--- Top 15 visitors (unique pages seen / total page views) ---"
jq -r "$PAGES | \"\\(.request.remote_ip)\\t\\(.request.uri)\"" "$TMP" |
  sort | uniq -c | awk '{ pages[$2]++; hits[$2] += $1 }
    END { for (ip in pages) printf "%6d hits  %3d pages  %s\n", hits[ip], pages[ip], ip }' |
  sort -rn | head -15
echo

echo "--- Errors (status >= 400) ---"
jq -r 'select(.status >= 400) | "\(.status) \(.request.uri)"' "$TMP" |
  sed 's/?.*//' | sort | uniq -c | sort -rn | head -20
[ -n "$(jq -r 'select(.status >= 400)' "$TMP")" ] || echo "  none — clean run"
echo

echo "--- Slowest 10 requests (seconds) ---"
jq -r '"\(.duration)\t\(.status)\t\(.request.uri)"' "$TMP" |
  sort -rn | head -10 | awk -F'\t' '{ printf "%8.2fs  %s  %s\n", $1, $2, $3 }'
echo

echo "--- Checkout funnel (page views) ---"
for path in / /products /cart /checkout /login /account/orders; do
  n=$(jq -r "$PAGES | .request.uri" "$TMP" | sed 's/?.*//' | grep -cx -- "$path" || true)
  printf '%-18s %s\n' "$path" "$n"
done
echo
# Exact path and POST only: startswith("/api/checkout") also matches
# /api/checkout/verify (a paid order counted twice), and a crawler's GET — a
# 405 — is neither a checkout nor a login attempt.
post_to() {
  jq -c "select((.request.uri | split(\"?\")[0]) == \"$1\")
         | select((.request.method // \"POST\") == \"POST\")" "$TMP"
}
otp_all=$(post_to /api/otp/request | wc -l)
otp_sent=$(post_to /api/otp/request | jq -c 'select(.status == 200)' | wc -l)
echo "OTP codes sent:    $otp_sent  (of $otp_all requests; the rest failed or were throttled)"
# A 200 from /api/checkout only means an order row exists — created pending,
# and a retry resumes the earlier order rather than adding a second one.
echo "Checkouts started: $(post_to /api/checkout | jq -c 'select(.status == 200)' | wc -l)"
echo "Payments verified: $(post_to /api/checkout/verify | jq -c 'select(.status == 200)' | wc -l)"
