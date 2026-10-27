#!/bin/zsh
# 展示会の当日に、サーバ（Mac）の負荷を一定の間隔で CSV に書き出す。止めるときは Ctrl+C（または kill）。
# アプリの中の計測（/metrics）と時刻で突き合わせて、どこが重くなったかを見る。
#
#   scripts/monitor.sh                          # data/monitor-<日付>.csv に 15 秒ごと
#   INTERVAL=5 scripts/monitor.sh out.csv
#
# 記録するもの: Mac 全体の負荷（load average・GPU 使用率・メモリの空き）、
# アプリのコンテナの CPU とメモリ、whisper-server と llama-server（アプリが使うポート）の CPU とメモリ

INTERVAL=${INTERVAL:-15}
CONTAINER=${CONTAINER:-jev-insight-app}
WHISPER_PORT=${WHISPER_PORT:-8178}
LLAMA_PORT=${LLAMA_PORT:-8080}
OUT=${1:-data/monitor-$(date +%Y%m%d).csv}

# 指定したポートで待ち受けているサーバのプロセス番号（起動時の --port で探す）
pid_of() { pgrep -f -- "$1 .*--port $2( |$)" | head -1 }

# プロセスの CPU（%）とメモリ（MB）。見つからなければ空欄
proc_stats() {
  [[ -z $1 ]] && { echo ","; return }
  ps -o %cpu=,rss= -p $1 | awk '{ printf "%s,%d", $1, $2 / 1024 }'
}

[[ -f $OUT ]] || echo "time,load1,gpu_pct,mem_free_pct,app_cpu_pct,app_mem_mb,whisper_cpu_pct,whisper_mem_mb,llama_cpu_pct,llama_mem_mb" > $OUT
echo "記録中: $OUT（${INTERVAL} 秒ごと）"

while true; do
  load1=$(sysctl -n vm.loadavg | awk '{ print $2 }')
  gpu=$(ioreg -r -d 1 -c IOAccelerator | grep -o '"Device Utilization %"=[0-9]*' | head -1 | cut -d= -f2)
  memfree=$(memory_pressure -Q 2>/dev/null | awk -F': ' '/free percentage/ { sub("%", "", $2); print $2 }')
  app=$(docker stats --no-stream --format '{{.CPUPerc}} {{.MemUsage}}' $CONTAINER 2>/dev/null |
    awk '{ cpu = $1; sub("%", "", cpu); mem = $2; mb = mem + 0; if (mem ~ /GiB/) mb *= 1024; printf "%s,%d", cpu, mb }')
  whisper=$(proc_stats "$(pid_of whisper-server $WHISPER_PORT)")
  llama=$(proc_stats "$(pid_of llama-server $LLAMA_PORT)")
  echo "$(date '+%Y-%m-%d %H:%M:%S'),$load1,$gpu,$memfree,${app:-,},$whisper,$llama" >> $OUT
  sleep $INTERVAL
done
