# 기술 스택

각 기술의 선정 이유를 정리한 문서입니다. 요약 배지는 [README](../README.md#04-기술-스택)에 있습니다.

## 현재 사용

`frontend/package.json`과 `backend/pyproject.toml`에 실제로 설치되어 동작하는 스택입니다.

### Frontend

| 기술 | 선정 이유 |
|---|---|
| React 19 | 컴포넌트 기반으로 동적인 화면을 구현하기 쉬움 |
| TypeScript | 타입 오류를 사전에 방지 |
| Vite 8 | 빠른 개발 서버와 빌드 환경 제공 |
| SCSS Modules (sass) | 화면 단위로 스타일 범위를 격리 |
| React Router 8 | 역할·조회 범위에 따른 라우팅 처리 |
| axios | API 호출 공통 처리와 인터셉터 |
| Recharts | 매출·KPI 차트 렌더링 |

### Backend

| 기술 | 선정 이유 |
|---|---|
| FastAPI | Python AI 생태계를 활용하기 쉽고, Swagger UI를 자동 제공해 프론트엔드와 API 협업에 유리 |
| Python 3.13 | AI 라이브러리 호환성과 최신 타입 기능 |
| SQLAlchemy (async) | 비동기 DB 접근과 모델 정의 |
| asyncpg | PostgreSQL 비동기 드라이버 |
| uv | 의존성 설치와 가상환경을 빠르게 재현 |

### AI · Agent

| 기술 | 선정 이유 |
|---|---|
| Deep Agents | 총괄·작성·검토 역할을 나눠 보고서를 작성하고, 각 역할이 쓸 수 있는 도구를 제한 |
| LangChain | LLM 호출과 도구 사용을 공통 인터페이스로 처리 |
| LangGraph | Deep Agents 실행의 반복 횟수와 종료 조건을 제어 |
| OpenAI 호환 API (`gpt-5.6-luna`) | 구조화된 출력으로 미팅 분석·보고서 초안·제안을 생성. 모델 ID는 환경변수로 지정 |
| OpenAI GPT-4o Transcribe | 미팅 녹음을 한국어 텍스트로 변환 |

### 문서 · 검색

| 기술 | 선정 이유 |
|---|---|
| PaddleOCR | 한국어 문서 인식을 지원하는 오픈소스로, 비용 절감과 커스터마이징에 유리 |
| RunPod Serverless | PaddleOCR 워커를 GPU 환경에서 필요할 때만 실행 |
| sentence-transformers (다국어 MiniLM) | 문서 조각을 로컬에서 384차원 벡터로 변환해 외부 전송 없이 검색 |
| pypdf · pypdfium2 · Pillow | 문서 본문 추출과 스캔 PDF 이미지 변환 |

### 머신러닝

| 기술 | 선정 이유 |
|---|---|
| scikit-learn · CatBoost | 딜 승산 예측 모델(스태킹 앙상블) 학습 |
| joblib | 학습한 모델을 파일로 저장하고 서버에서 적재 |

### Database · 작업 큐

| 기술 | 선정 이유 |
|---|---|
| Supabase PostgreSQL | 클라우드 기반으로 팀원 간 DB 공유가 쉬움 |
| pgvector | 관계형 데이터와 문서 임베딩을 한 DB에서 함께 관리 |
| PostgreSQL 작업 큐 | 별도 브로커 없이 에이전트 실행을 대기·점유·재시도로 관리하고, 서버가 재시작해도 상태가 남음 |
| Supabase Auth · Storage | 계정·토큰 관리와 문서·이미지 보관 |

### DevOps · Quality

| 기술 | 선정 이유 |
|---|---|
| AWS S3 · CloudFront | 프론트엔드 정적 파일 배포와 전송 |
| AWS EC2 · Nginx | 백엔드 API 서버와 작업 처리기 운영 |
| Docker | 로컬·서버의 실행 환경을 동일하게 구성하고, 포트를 번갈아 쓰는 무중단 배포에 사용 |
| GitHub Actions | 테스트·빌드 자동화 ([ci-frontend.yml](../.github/workflows/ci-frontend.yml), [ci-backend.yml](../.github/workflows/ci-backend.yml))와 수동 배포 실행 |
| oxlint · prettier | 프론트엔드 린트와 포맷 |
| ruff | 백엔드 린트와 포맷 |
| pytest | 백엔드 테스트 |

- 스택을 바꾸면 이 문서와 README 배지를 함께 갱신합니다.
- API 키·토큰 등 비밀값은 `.env`에만 두고 코드·문서·로그에 남기지 않습니다. 비밀값이 필요한 브라우저 요청은 백엔드를 경유합니다.
