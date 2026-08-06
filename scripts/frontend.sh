#!/usr/bin/env bash
# 프론트엔드 개발 서버만 실행
#   bash scripts/frontend.sh

set -euo pipefail

cd "$(dirname "$0")/.."

[ -f frontend/package.json ] || { echo "✗ frontend/package.json 이 없습니다."; exit 1; }

free_port() {
  local port=$1
  local pids=''

  if command -v taskkill >/dev/null 2>&1; then
    pids=$(netstat -ano 2>/dev/null | awk -v pat=":${port}\$" '$2 ~ pat && $4 == "LISTENING" {print $5}' | sort -u)
    for wp in $pids; do
      taskkill //PID "$wp" //T //F >/dev/null 2>&1 || true
    done
  else
    pids=$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)
    for up in $pids; do
      kill -9 "$up" 2>/dev/null || true
    done
  fi

  if [ -n "$pids" ]; then
    echo "  포트 $port 를 쓰던 이전 프로세스를 정리했습니다."
  fi
}

free_port 5173

echo "▶ 프론트  http://localhost:5173"
cd frontend
exec npm run dev
