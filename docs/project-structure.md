# 프로젝트 구조

파일 위치를 고를 때만 참고하는 문서입니다. 개발 규칙은 [`AGENTS.md`](../AGENTS.md)에 있습니다.

## 최상위 폴더

| 폴더 | 역할 |
|---|---|
| `backend/` | FastAPI 서버·데이터 파이프라인·SQL |
| `data/` | 수집 원본과 가공 데이터 |
| `demo/` | React 전 정적 HTML 목업 |
| `deploy/` | Docker·인프라 설정 |
| `docs/` | 실행·설계 문서 |
| `final/` | 발표자료·보고서 등 제출물 |
| `frontend/` | React 앱 |
| `scripts/` | 로컬 개발 스크립트 |
| `test/` | 프론트+백 통합/E2E 테스트 |

실제 데이터는 커밋하지 않고 `data/raw/`, `data/processed/`의 골격만 유지합니다.

## Frontend

```text
frontend/
├── public/
├── src/
│   ├── api/          axios 인스턴스와 엔드포인트 함수
│   ├── assets/       이미지·폰트
│   ├── auth/         로그인·세션·라우트 가드
│   ├── components/   두 곳 이상에서 쓰는 공용 컴포넌트
│   ├── config/       env.ts
│   ├── constants/    라우트 등 고정값
│   ├── content/      화면 문구
│   ├── hooks/        커스텀 훅
│   ├── pages/        라우트별 페이지
│   ├── store/        전역 상태
│   ├── styles/       SCSS 변수·믹스인·전역 스타일
│   ├── test/         Vitest 설정·헬퍼
│   ├── types/        공용 타입
│   └── utils/
├── .env.example
├── package.json
├── tsconfig*.json
└── vite.config.ts
```

공용 컴포넌트는 한 폴더에 묶습니다.

```text
components/Button/
├── Button.tsx
├── Button.module.scss
└── index.ts
```

한 페이지에서만 쓰는 하위 컴포넌트는 `pages/<Page>/` 안에 둡니다. 컴포넌트 테스트도 대상 파일 옆에 둡니다.

## Backend

```text
backend/
├── app/
│   ├── main.py          FastAPI 인스턴스·라우터·CORS
│   ├── agent/           에이전트·프롬프트·오케스트레이션
│   ├── api/             라우터와 공용 의존성
│   ├── core/            설정
│   ├── db/              Base·엔진·세션
│   ├── models/          SQLAlchemy ORM
│   ├── repositories/    DB 쿼리
│   ├── schemas/         Pydantic 요청·응답
│   ├── services/        비즈니스 로직
│   └── tools/           에이전트 호출 함수
├── pipeline/            데이터 수집·전처리
├── sql/                 스키마·시드 SQL
├── tests/               pytest 테스트
├── .env.example
├── pyproject.toml
└── uv.lock
```

새 DB 기능은 아래 순서로 추가합니다.

1. `sql/00N_*.sql`
2. `models/<resource>.py`
3. `schemas/<resource>.py`
4. `repositories/<resource>.py`
5. `services/<resource>.py`
6. `api/<resource>.py`와 `api/__init__.py`
7. `tests/test_<resource>.py`

## 그 밖의 폴더

- `demo/`: 화면별 HTML, `styles/common.css`, `assets/`. 빌드·CI 대상이 아닙니다.
- `deploy/`: Dockerfile, compose, 배포 환경 설정.
- `final/`: 완성된 발표자료와 보고서. 진행 중 설계 문서는 `docs/`에 둡니다.
- `scripts/`: 맥과 윈도우 Git Bash에서 함께 쓰는 `.sh`만 둡니다.
- `test/`: 두 앱을 함께 실행해야 하는 시나리오만 둡니다.
