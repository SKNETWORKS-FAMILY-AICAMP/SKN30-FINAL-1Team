# 시작하기

## 처음 한 번

| 도구 | 버전 | 확인 |
|---|---|---|
| Git | 최신 | `git --version` |
| Node | 24 | `node -v` |
| uv | 최신 | `uv --version` |

Python은 따로 설치하지 않아도 됩니다. `uv`가 알아서 3.13을 받아옵니다.
**윈도우 사용자는 `.sh` 스크립트를 Git Bash에서 실행하세요** (PowerShell / cmd 아님).

```bash
git clone <저장소 URL>
cd SKN30-FINAL-1Team-dev
git switch develop
bash scripts/setup.sh
```

그다음 `backend/.env` 와 `frontend/.env` 에 값을 채웁니다.

- `DATABASE_URL` — Supabase → Project Settings → Database → Connection string 의
  **Transaction pooler (포트 6543)** 를 그대로 복사
- `frontend/.env` 에는 **비밀값을 넣지 마세요.** 브라우저에 그대로 노출됩니다

---

## 서버 켜기

```bash
bash scripts/dev.sh         # 프론트엔드 + 백엔드
bash scripts/frontend.sh    # 프론트엔드만
bash scripts/backend.sh     # 백엔드만
```

두 서버를 각각 실행하려면 터미널 두 개에서 `frontend.sh`, `backend.sh`를 하나씩 실행합니다.

| | |
|---|---|
| 프론트 | http://localhost:5173 |
| API 문서 | http://localhost:8000/docs |
| DB 연결 확인 | http://localhost:8000/api/health/db |

종료는 `Ctrl+C`. 각 스크립트는 자신이 사용하는 기존 포트 프로세스만 정리한 뒤 실행합니다.
