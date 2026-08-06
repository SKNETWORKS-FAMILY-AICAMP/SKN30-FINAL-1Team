#!/usr/bin/env bash
# 최초 1회 실행: 의존성 설치 + .env 생성
#
# 맥 터미널과 윈도우 Git Bash 양쪽에서 동일하게 동작합니다.
#   bash scripts/setup.sh

set -euo pipefail

# 어느 디렉터리에서 호출하든 리포 루트 기준으로 동작하게 한다.
cd "$(dirname "$0")/.."

echo "▶ 필수 도구 확인"
command -v uv  >/dev/null 2>&1 || { echo "  ✗ uv 가 없습니다. https://docs.astral.sh/uv/ 참고해 설치하세요."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "  ✗ npm 이 없습니다. Node 24 를 설치하세요 (.nvmrc 참고)."; exit 1; }
echo "  ✓ uv, npm 확인"

echo
echo "▶ .env 생성 (없을 때만)"
for dir in backend frontend; do
  if [ -f "$dir/.env.example" ]; then
    # -n: 이미 있는 .env 를 덮어쓰지 않는다
    cp -n "$dir/.env.example" "$dir/.env" 2>/dev/null || true
    echo "  ✓ $dir/.env"
  fi
done

echo
echo "▶ 백엔드 의존성 설치"
if [ -f backend/pyproject.toml ]; then
  (cd backend && uv sync)
  echo "  ✓ 완료"
else
  echo "  - backend/pyproject.toml 이 아직 없어 건너뜁니다."
fi

echo
echo "▶ 프론트엔드 의존성 설치"
if [ -f frontend/package.json ]; then
  if [ -f frontend/package-lock.json ]; then
    (cd frontend && npm ci)
  else
    (cd frontend && npm install)
  fi
  echo "  ✓ 완료"
else
  echo "  - frontend/package.json 이 아직 없어 건너뜁니다."
fi

echo
echo "──────────────────────────────────────────"
echo " 세팅 완료"
echo
echo " 다음 할 일:"
echo "  1. backend/.env 와 frontend/.env 에 실제 값을 채우세요"
echo "  2. bash scripts/dev.sh 로 개발 서버를 띄우세요"
echo "──────────────────────────────────────────"
