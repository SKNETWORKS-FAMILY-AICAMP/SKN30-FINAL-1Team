# AGENTS.md

필드메드(FieldMed) 저장소의 AI 코딩 규칙입니다. Claude Code와 Codex가 함께 읽는 **단일 원본**이며 `CLAUDE.md`는 이 파일만 import합니다.

- 실행: [`docs/getting-started.md`](docs/getting-started.md)
- 파일 배치: [`docs/project-structure.md`](docs/project-structure.md)
- DB SQL 절차: [`backend/sql/README.md`](backend/sql/README.md)

## 기술 스택

| 영역 | 스택 |
|---|---|
| Frontend | Node 24, React 19, TypeScript, Vite 8, SCSS Modules, React Router 8, axios |
| Backend | Python 3.13, FastAPI, uv, SQLAlchemy async, Supabase PostgreSQL |
| 품질 | oxlint + prettier / ruff + pytest |
| CI·알림 | GitHub Actions / Discord Webhook |

라우팅은 `react-router-dom`이 아니라 `react-router`에서 import합니다.

## 파일 배치

| 경로 | 역할 |
|---|---|
| `backend/` | FastAPI 서버와 데이터 파이프라인 |
| `data/raw`, `data/processed` | 원본·가공 데이터(실제 데이터는 커밋하지 않음) |
| `demo/` | React 전 정적 HTML 목업(CI 대상 아님) |
| `deploy/` | Docker·인프라 설정 |
| `docs/` | 규칙이 아닌 실행·설계 문서 |
| `final/` | 발표자료·보고서 등 제출물 |
| `frontend/` | React 앱 |
| `scripts/` | 맥·Git Bash 공용 개발 스크립트 |
| `test/` | 프론트+백 통합/E2E 테스트 |

테스트 위치는 다음과 같습니다.

- 백엔드 단위·라우터: `backend/tests/`
- React 컴포넌트: 대상 옆 `*.test.tsx`
- 통합/E2E: `test/`

실제 파일을 넣은 빈 폴더의 `.gitkeep`은 삭제합니다. Python 패키지 빈 폴더는 `.gitkeep` 대신 `__init__.py`를 둡니다.

## 네이밍

| 대상 | 규칙 | 예 |
|---|---|---|
| React 컴포넌트 파일 | PascalCase | `SalesChart.tsx` |
| 그 외 TS 파일·SCSS 클래스 | camelCase | `formatDate.ts`, `styles.primaryButton` |
| Python 파일 | snake_case | `report_service.py` |
| 상수 | UPPER_SNAKE | `MAX_RETRY` |
| 브랜치 | `feature/<기능>` | `feature/login-page` |

## Frontend

- 공용 컴포넌트는 **두 곳 이상에서 쓸 때만** `src/components/`에 둡니다. 한 페이지 전용 컴포넌트는 해당 페이지 폴더에 둡니다.
- 공용 컴포넌트는 `Component/Component.tsx`, `Component.module.scss`, `index.ts` 구조를 사용합니다.
- 내부 import는 `@` alias를 사용하고 `../../../` 경로는 피합니다.
- 컴포넌트 스타일은 `*.module.scss`만 사용합니다. 색상·간격·breakpoint는 `src/styles/_variables.scss` 변수로 관리합니다.
- 환경별 값은 `.env` → `src/config/env.ts`를 거칩니다. 다른 파일에서 `import.meta.env`를 직접 읽지 않습니다.
- 고정값은 `src/constants/`에 둡니다. 라우트 문자열도 `constants/routes.ts`에서 관리합니다.
- `src/test/`는 Vitest 설정·헬퍼 전용이며 테스트 파일은 대상 옆에 둡니다.
- 외부 API 키를 `VITE_` 환경변수에 넣지 않습니다. 비밀값이 필요한 호출은 백엔드를 경유합니다.

## Backend

```text
router → service → repository → model
검증       로직         DB 쿼리       테이블
```

- API 경로는 `/api/<리소스>`이며 `/api/v1`을 만들지 않습니다.
- router는 요청 검증·서비스 호출·응답만 담당합니다.
- service는 비즈니스 로직을 담당하고 DB 세션을 직접 다루지 않습니다.
- repository는 쿼리만 담당합니다.
- `schemas/`(Pydantic)와 `models/`(ORM)를 섞지 않습니다.
- 라우터의 DB 의존성은 `app.api.deps.DbSession`을 사용합니다.
- 설정은 `app/core/config.py`의 `Settings`로만 읽고 코드에서 `os.getenv`를 직접 호출하지 않습니다.
- `agent/`에는 에이전트·프롬프트·오케스트레이션을, `tools/`에는 에이전트 호출 함수를 둡니다. `tools/`도 service/repository를 경유합니다.

## DB와 SQL

DB 스키마의 기준은 `backend/sql/`이며 마이그레이션 도구는 없습니다.

```text
sql/00N_*.sql 추가 → Supabase SQL Editor 실행 → app/models/ 반영
```

- 적용한 SQL 파일은 수정하지 말고 새 파일을 추가합니다. PR에 적용한 SQL을 기록합니다.
- 앱 연결은 transaction pooler 포트 `6543`, DDL용 직접 연결은 session 포트 `5432`를 씁니다.
- 엔진은 첫 사용 시 `get_engine()`에서 생성되어야 합니다. `DATABASE_URL` 없이 앱 import가 가능해야 합니다.
- PgBouncer 대응용 `connect_args`와 `poolclass=NullPool`을 제거하지 않습니다.

## 보안·환경

- `.env`는 커밋하지 않습니다. 새 키는 `.env.example`에 빈 값으로만 추가합니다.
- 웹훅과 API 키는 코드·워크플로·문서에 직접 적지 않고 GitHub Secrets 등으로 관리합니다.
- Python은 `uv run ...`으로 실행하고 경로는 문자열 연결 대신 `pathlib.Path`를 씁니다.
- `.sh`는 LF로 유지하며 윈도우에서는 Git Bash로 실행합니다. `.bat`·`.ps1`을 따로 만들지 않습니다.
- npm script에 `rm -rf`, `cp`, `NODE_ENV=x cmd` 같은 유닉스 전용 문법을 넣지 않습니다.
- 파일명 대소문자를 정확히 맞춥니다. 대소문자만 바꿀 때는 `git mv`를 두 번 사용합니다.
- `.ini`·`.cfg`에는 한글을 쓰지 않습니다.

## Git

```text
feature/* → develop → main
```

`main`은 항상 동작하는 상태를 유지하고 PR로 병합합니다. 커밋은 Conventional Commits를 사용합니다: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.

## 금지 요약

- 색상·간격 하드코딩
- `import.meta.env`·`os.getenv` 직접 호출
- 페이지 전용 컴포넌트를 `components/`에 배치
- Pydantic schema와 ORM model 혼용
- 프론트 환경변수에 비밀값 저장
- 적용 완료된 SQL 파일 수정
