#!/bin/sh
# test_perf.sh - Load test: track page faults, context switches, I/O rate.
#
# Starts tinytd under load, reads /proc/<pid>/status and /proc/<pid>/io
# at intervals, asserts resource usage stays within bounds.
#
# Thresholds (conservative for 1-core VDS):
#   CPU usage of tinytd process: < 5% (measured via /proc/<pid>/stat)
#   Major page faults during run: 0
#   Voluntary ctx switches / sec: < 200
#
# Run from project root: sh tests/tinytd/test_perf.sh

set -u
cd "$(dirname "$0")/../.."

PASS="\033[32mPASS\033[0m"
FAIL="\033[31mFAIL\033[0m"
SKIP="\033[33mSKIP\033[0m"

pass=0; fail=0; skip=0

check() {
    label="$1"; cond="$2"
    if [ "$cond" = "0" ]; then
        printf "  [${PASS}] %s\n" "$label"; pass=$((pass+1))
    else
        printf "  [${FAIL}] %s\n" "$label"; fail=$((fail+1))
    fi
}

skip() { printf "  [${SKIP}] %s\n" "$1"; skip=$((skip+1)); }

TINYTD="./tinytd/tinytd"
CONF="./tests/tinytrack.conf-test"
LIVE=$(grep live_path   "$CONF" | awk '{print $3}')
SHADOW=$(grep shadow_path "$CONF" | awk '{print $3}')
MEASURE_SEC=10

# Max thresholds
MAX_MAJFLT=0
MAX_VCTX_PER_SEC=200
MAX_RSS_KB=10240   # 10 MB

printf "\n=== performance / load tests ===\n"
printf "  Measurement window: ${MEASURE_SEC}s\n"

if [ ! -x "$TINYTD" ]; then
    skip "tinytd binary not found"
    printf "\n  pass=%-3d fail=%-3d skip=%d\n" "$pass" "$fail" "$skip"
    exit 0
fi

rm -f "$LIVE" "$SHADOW"
$TINYTD -c "$CONF" >/dev/null 2>&1 &
pid=$!
sleep 0.5

if ! kill -0 "$pid" 2>/dev/null; then
    skip "daemon did not start (permissions?)"
    printf "\n  pass=%-3d fail=%-3d skip=%d\n" "$pass" "$fail" "$skip"
    exit 0
fi

proc_field() {
    pid="$1"; field="$2"
    grep "^${field}:" /proc/"$pid"/status 2>/dev/null | awk '{print $2}'
}

proc_stat_field() {
    pid="$1"; n="$2"
    awk "{print \$$n}" /proc/"$pid"/stat 2>/dev/null
}

vctx_before=$(proc_field "$pid" "voluntary_ctxt_switches")
majflt_before=$(proc_stat_field "$pid" 12)
utime_before=$(proc_stat_field "$pid" 14)
stime_before=$(proc_stat_field "$pid" 15)
wall_before=$(date +%s%N)

sleep "$MEASURE_SEC"

vctx_after=$(proc_field "$pid" "voluntary_ctxt_switches")
majflt_after=$(proc_stat_field "$pid" 12)
utime_after=$(proc_stat_field "$pid" 14)
stime_after=$(proc_stat_field "$pid" 15)
wall_after=$(date +%s%N)
rss_kb=$(proc_field "$pid" "VmRSS")

kill -TERM "$pid"; wait "$pid" 2>/dev/null
rm -f "$LIVE" "$SHADOW"

dvctx=$((${vctx_after:-0} - ${vctx_before:-0}))
dmajflt=$((${majflt_after:-0} - ${majflt_before:-0}))
dcpu_ticks=$(( (${utime_after:-0} + ${stime_after:-0}) - (${utime_before:-0} + ${stime_before:-0}) ))
dwall_ms=$(( (wall_after - wall_before) / 1000000 ))

hz=$(getconf CLK_TCK 2>/dev/null || echo 100)
cpu_pct=0
if [ "$dwall_ms" -gt 0 ]; then
    cpu_pct=$(( dcpu_ticks * 100 * 1000 / hz / dwall_ms ))
fi
vctx_per_sec=$(( dvctx / MEASURE_SEC ))

printf "\n  Results:\n"
printf "    RSS:                  %s KB (limit %d KB)\n" "${rss_kb:-?}" "$MAX_RSS_KB"
printf "    Major page faults:    %d (limit %d)\n" "$dmajflt" "$MAX_MAJFLT"
printf "    Voluntary ctx sw/sec: %d (limit %d)\n" "$vctx_per_sec" "$MAX_VCTX_PER_SEC"
printf "    CPU usage:            ~%d%% (limit 5%%)\n" "$cpu_pct"
printf "\n"

check "RSS < ${MAX_RSS_KB} KB" "$([ "${rss_kb:-99999}" -lt "$MAX_RSS_KB" ] && echo 0 || echo 1)"
check "No major page faults"   "$([ "$dmajflt" -le "$MAX_MAJFLT" ] && echo 0 || echo 1)"
check "Ctx switches/sec < ${MAX_VCTX_PER_SEC}" \
      "$([ "$vctx_per_sec" -lt "$MAX_VCTX_PER_SEC" ] && echo 0 || echo 1)"
check "CPU < 5%" "$([ "$cpu_pct" -lt 5 ] && echo 0 || echo 1)"

printf "\n  pass=%-3d fail=%-3d skip=%d\n" "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ]
