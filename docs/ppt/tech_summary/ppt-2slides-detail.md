# SalesLuv — 기술 스택 / 시스템 아키텍처 근거본

> 발표용 슬라이드 2장([`ppt-2slides.md`](ppt-2slides.md))에 들어가는 항목의 코드 근거를 정리한 문서다. 면접 Q&A 대비용이며 슬라이드에 그대로 넣는 자료가 아니다.
>
> 작성 기준: 2026-09-11 저장소 추적 파일. 설치된 패키지 목록이 아니라 **실제 import·호출·설정 파일**로 교차 확인했다.

---

## 0. 표기 기준

| 표기 | 의미 |
|---|---|
| **확정** | 애플리케이션 코드에 실제 import·호출 경로가 있다 |
| **구현·설정 확인** | adapter나 배포 설정은 구현됐으나, 현재 운영 값은 저장소 밖 환경변수·콘솔에 있다 |
| **판단 불가** | 저장소만으로 확인할 수 없다. 문서에 단정해서 쓰지 않는다 |

과장 금지 원칙: AWS SDK를 호출한다고 "클라우드 아키텍처 설계", Dockerfile이 있다고 "컨테이너 인프라 구축"이라고 쓰지 않는다.

## ⚠️ 발표 자료 작성 시 마스킹 필수

저장소의 `docs/technical/deploy/deployment_detail.md`와 `.github/workflows/deploy-*.yml`에 아래 값이 평문으로 들어 있다. 자격증명은 아니지만 **공개 포트폴리오·발표 자료에 넣으면 스캔 대상**이 된다.

AWS 계정 ID · Elastic IP · EC2 instance ID · Security Group ID · CloudFront distribution ID · CloudFront 도메인 · S3 버킷명 · IAM role ARN · SSM parameter 경로

슬라이드와 콘솔 캡처 모두 리소스 **종류**만 표기한다 (`EC2`, `CloudFront`, `Private S3`). 리전 `ap-northeast-2`는 식별자가 아니므로 표기 가능.

---

## 1. Tech Stack 근거표

### Frontend

| 기술 | 용도 | 확인 근거 | 확실성 |
|---|---|---|---|
| React 19 | SPA UI | `frontend/package.json`, `src/main.tsx` | 확정 |
| TypeScript | 타입 기반 화면·API 계약 | `package.json`, `tsconfig`, `src/**/*.tsx` | 확정 |
| Vite 8 | 개발 서버·production 번들 | `package.json` scripts, `vite.config.ts` | 확정 |
| Axios | `/api` 클라이언트, 쿠키 전달, 401 refresh 재시도 | `src/api/client.ts` | 확정 |
| SCSS Modules (sass) | 화면·컴포넌트 스타일 | `vite.config.ts`, `src/styles/`, `*.module.scss` | 확정 |

**슬라이드에서 제외했지만 실제 사용 중** — 질문 들어오면 답할 것:

| 기술 | 용도 | 근거 |
|---|---|---|
| React Router 8 | 라우팅 + 역할별 route guard (`ProtectedRoute` / `ManagerRoute` / `AdminRoute`) | `src/App.tsx`, `src/auth/` |
| TinyMCE | 보고서 리치 텍스트 편집 | `src/components/RichTextEditor/` |
| marked + turndown | AI 생성 마크다운 ↔ 에디터 HTML 양방향 변환 | `package.json`, 보고서 초안 경로 |
| PDF.js (pdfjs-dist) | 고객 원본 문서 PDF 렌더링 | `SourceDocumentViewer.tsx` |
| react-datepicker | 일정·캘린더 입력 | `package.json`, `src/pages/Calendar/` |

**전역 상태 관리 라이브러리는 없다.** Redux·Zustand·Recoil 모두 미설치이고 `src/store/`에는 `.gitkeep`만 있다. 세션은 `src/auth/SessionProvider.tsx`의 React Context, 나머지는 화면 단위 hook(`src/hooks/`)으로 처리한다. 별도 form 라이브러리도 없다.
→ 슬라이드에 "Context API"라고 쓰지 않고 아예 적지 않은 이유: 라이브러리가 아니라 React 기본 기능이라 스택 항목으로 세우면 과장이 된다.

> **`recharts`는 스택에서 뺐다.** `package.json`에 있지만 `frontend/src` 어디에서도 import하지 않는다 (`grep -rn recharts frontend/src` 결과 없음). 매출분석·영업단계 시각화는 차트 라이브러리 없이 **CSS로 직접 구현**돼 있다 (`src/components/StageBar/` — `geometry.ts`가 좌표를 계산하고 `StageBar.module.scss`가 그린다. SVG도 쓰지 않는다). 설치만 되고 쓰이지 않는 의존성이라 발표 자료에 올리지 않았다.

### Backend

| 기술 | 용도 | 확인 근거 | 확실성 |
|---|---|---|---|
| Python 3.13 | API·AI·ML·worker 구현 언어 | `backend/pyproject.toml` (`requires-python >=3.13`) | 확정 |
| FastAPI | `/api` REST + SSE 엔드포인트, OpenAPI 문서 자동 생성 | `app/main.py`(title·description 지정, `/docs` 활성), `app/api/` 라우터 21개, `response_model` 97곳 | 확정 |
| SQLAlchemy (asyncio) + asyncpg | 비동기 ORM·세션 | `app/db/session.py`, `app/models/` | 확정 |

**슬라이드에서 제외했지만 실제 사용 중**:

| 기술 | 용도 | 근거 |
|---|---|---|
| Pydantic / pydantic-settings | DTO 검증, 환경설정 스키마 | `app/schemas/`, `app/core/config.py` |
| Uvicorn | ASGI 서버 | `pyproject.toml`, `backend/Dockerfile` |
| PyJWT (crypto) | Supabase JWKS 기반 access token 검증 | `app/services/supabase_auth.py` |
| nh3 | 에디터·AI 생성 HTML 새니타이즈 (XSS 차단) | `app/services/html_sanitize.py` |
| httpx | 외부 API 비동기 호출 | `services/ocr.py`, `llm.py`, `stt.py` |
| pypdf / pypdfium2 / Pillow | 스캔 PDF → 이미지 변환 후 OCR 경로 투입 | `services/ocr.py`, `document_extraction.py` |
| pandas | ML 추론 입력 프레임 구성 | `app/ml/deal_baseline.py` |

**슬라이드 표기 주의** — 슬라이드에는 `SQLAlchemy`로만 적었지만 실제로는 **asyncio 확장 + asyncpg 드라이버의 비동기 세션**이다 (`app/db/session.py`). 슬라이드를 간결하게 하려고 생략한 것이므로, 동기 ORM을 쓴 것처럼 설명하지 않는다.

**슬라이드에서 뺀 이유** — Pydantic은 FastAPI가 그 위에 만들어진 프레임워크라 따로 세우면 중복이고, Uvicorn은 FastAPI를 쓰면 따라오는 구현 세부사항이다. React Router도 SPA면 기본 구성이라 스택 항목으로서 변별력이 없다. 셋 다 실제로 쓰지만 **슬라이드가 아니라 답변으로** 다룬다.

**계층 구조 주의** — 전형적인 Controller → Service → Repository가 **아니다.** 라우터가 서비스와 SQLAlchemy 모델·쿼리를 직접 조합하며 별도 repository 계층이 없다. 슬라이드나 설명에서 Repository Layer를 만들어 붙이지 않는다.

### Data · Auth · Storage

| 기술 | 용도 | 확인 근거 | 확실성 |
|---|---|---|---|
| Supabase PostgreSQL | CRM·보고서·문서·AgentRun 저장 | `DATABASE_URL`, `app/db/session.py`, `app/models/` 5개 모듈 약 30개 테이블 | 확정 |
| Supabase Auth | password login, refresh, JWKS JWT 검증, 계정 발급 | `app/services/supabase_auth.py`, `app/api/auth.py` | 확정 |
| Supabase Storage | 첨부·문서 업로드 및 signed URL 발급 | `app/services/storage.py` | 확정 |

- 슬라이드에는 세 줄로 늘어놓지 않고 **`Supabase (PostgreSQL · Auth · Storage)` 한 항목**으로 적었다. 셋은 별개 제품이 아니라 한 플랫폼의 기능이고, 나눠 쓰면 서로 다른 제품 세 개를 도입한 것처럼 보인다. 괄호는 DB만 쓴 게 아니라 인증·스토리지까지 얹었다는 정보를 남기기 위해 유지했다.
- 연결은 **Transaction pooler(6543)** 기준. Session pooler(5432)는 프로젝트 전체가 클라이언트 15개를 나눠 써서 배포 서버와 팀원 로컬이 같이 붙으면 `EMAXCONNSESSION`이 난다 (`backend/.env.example` 주석).
- 스키마 변경은 `backend/sql/`의 **날짜 기반 SQL 파일을 Supabase SQL Editor에서 수동 적용**한다 (30여 개). Alembic 등 마이그레이션 도구를 쓰지 않으므로 "마이그레이션 자동화"라고 말하지 않는다.
- 문서 chunk 임베딩은 **JSONB 컬럼**에 저장한다 (`app/models/content.py`의 `DocumentChunk`). **pgvector는 쓰지 않는다** — 의존성에도 SQL 타입에도 없다. README에 언급이 있어도 실제 모델과 다르므로 스택에 넣지 않았다.

### AI · ML

| 기술 | 용도 | 확인 근거 | 확실성 |
|---|---|---|---|
| LangChain | 에이전트 구성, 구조화 출력, 호출 횟수 제한 | `langchain.agents.create_agent`, `ToolStrategy`, `ModelCallLimitMiddleware` — `app/agents/meeting/content.py`, `refinement.py` | 확정 |
| langchain-openai | LLM 모델 바인딩 | `ChatOpenAI` — `app/services/llm.py` | 확정 |
| OpenAI 호환 Responses API | 구조화 JSON 출력, 스트리밍 | `app/services/llm.py`, `LLM_API_URL` / `LLM_MODEL` 설정 | 구현·설정 확인 |
| PaddleOCR 3.x (GPU) | **이미지** 입력의 한국어 텍스트 추출 | `handler.py:129-183`, Dockerfile 베이스 `paddlepaddle/paddle:3.0.0-gpu-cuda12.6` | 확정 |
| pdf-inspector | **PDF** 입력의 분류·추출 (ONNX Runtime 기반, PaddleOCR 아님) | `handler.py:63-85` | 확정 |
| OCR adapter | provider 분기 (`none` / `local` / `runpod` / `azure`) | `app/services/ocr.py` | 확정 |
| STT adapter | 미팅 음성 전사 | `app/services/stt.py`, `STT_*` 설정 | 구현·설정 확인 |
| scikit-learn + CatBoost + joblib | 저장된 앙상블 모델로 딜 참고 예측 | `app/ml/deal_baseline.py`, `pyproject.toml` | 확정 |

> **`deepagents`는 스택에서 뺐다.** `pyproject.toml`에 `deepagents==0.7.11`이 있지만 `backend/app/` 어디에서도 import하지 않는다 (`grep -rn deepagents backend/app/` 결과 없음). 설치만 되고 실제로 쓰이지 않는 의존성이라 발표 자료에 올리지 않았다.
>
> `app/agents/reports/skills/*/SKILL.md`도 에이전트 프레임워크 기능이 아니라, 프롬프트 규칙을 마크다운 파일로 분리해 `Path.read_text()`로 읽어 넣는 **자체 구현**이다 (`app/agents/reports/meeting.py:30,113`, `period.py:71`).

**provider 확실성** — `backend/.env.example` 기본값이 `OCR_PROVIDER=none`, `EMBEDDING_PROVIDER=none`이다. OCR은 `none / local(PaddleOCR) / runpod / azure` 분기가, 임베딩은 외부 API·로컬 SentenceTransformer·키워드 fallback 경로가 구현돼 있다. **어느 provider가 운영 중인지는 저장소 밖 환경변수에 있어 코드만으로는 확정할 수 없다.**

다만 운영 환경의 provider 설정은 **프로젝트 담당자가 확인해 주었다(2026-09-11).**

| 설정 | 운영 값 | 슬라이드 표기 |
|---|---|---|
| `OCR_PROVIDER` | `runpod` | RunPod Serverless 별도 박스 |
| LLM 엔드포인트 | `api.openai.com` Responses API | `OpenAI API` 박스 라벨의 근거 |
| `LLM_MODEL` | `gpt-5.6-luna` | 슬라이드에 표기하지 않음 |
| `STT_MODEL` | `gpt-4o-transcribe` | 위와 동일 박스 |
| `EMBEDDING_PROVIDER` | **설정 없음 → 기본값 `none`** | 표기하지 않음 (아래 5-1 참고) |

이 값들의 근거는 코드가 아니라 **담당자 확인**이므로 저장소만 본 사람은 검증할 수 없다. 코드는 호스트를 강제하지 않는다 — `services/llm.py:31-47`은 HTTPS이고 경로가 `/responses` 또는 `/chat/completions`로 끝나는지만 검사하므로, OpenAI 호환 엔드포인트면 무엇이든 붙는다. 그래서 `OpenAI API`라는 박스 라벨은 **엔드포인트를 확인한 뒤에야** 쓸 수 있었다.

**모델명을 슬라이드에 넣지 않은 이유**: 모델은 몇 달 단위로 교체되는데 포트폴리오는 그보다 오래 쓴다. 구조도에서 모델명은 상자를 식별하는 데도 도움이 되지 않는다. 물어보면 이 표를 보고 답한다.

> 모델명 자체는 비밀값이 아니지만 `.env`에는 `LLM_API_KEY`·`SUPABASE_SECRET_KEY` 등 실제 자격증명이 함께 있다. 이 문서에는 provider 종류만 적고 키·엔드포인트·정확한 모델 문자열은 남기지 않는다.

RunPod Serverless OCR worker 이미지는 별도로 존재한다 (`infra/runpod/document_ocr/Dockerfile`, `handler.py`, PaddleOCR 기반). 구현은 확정, 운영 사용 여부는 환경변수 의존.

### DevOps

| 기술 | 용도 | 확인 근거 | 확실성 |
|---|---|---|---|
| Docker | FastAPI + 로컬 OCR 의존성 포함 백엔드 이미지 | `backend/Dockerfile` | 확정 |
| GitHub Actions | CI(프론트·백엔드), 수동 production 배포, Discord 알림 | `.github/workflows/` 6개 | 확정 |
| AWS S3 + CloudFront | 프론트 정적 산출물 배포 + CDN, invalidation | `deploy-frontend.yml`, `deployment_detail.md` | 확정 |
| AWS EC2 + Nginx | Docker 백엔드를 Nginx upstream 뒤에서 운영 | `deploy/backend/deploy.sh`, `deployment_detail.md` | 확정 |
| AWS IAM OIDC + SSM | 장기 키 없이 배포 role 획득, 환경변수 조회, EC2 원격 실행 | `deploy-backend.yml`, `deploy-frontend.yml` | 확정 |

CI는 양쪽 다 lint → format/type → test → build를 전부 실행한다 (`ci-frontend.yml`: oxlint · prettier · node:test · `tsc -b` + vite build / `ci-backend.yml`: ruff · pytest · 배포 스크립트 검증). 테스트는 백엔드 pytest 파일 72개, 프론트 node:test 12개. 린터·formatter·테스트 도구는 슬라이드 스택표에서 제외했다.

---

## 2. 아키텍처 구성요소 근거

| 슬라이드 박스 | 실제 구현 위치 |
|---|---|
| CloudFront (단일 HTTPS 진입점) | `docs/technical/deploy/deployment_detail.md` §3~4. 기본 origin = private S3 + OAC, `/api/*` behavior = EC2 origin |
| Private S3 (React SPA) | `deploy-frontend.yml` — Vite build 산출물 업로드 후 invalidation. public access 전면 차단, versioning, SSE-S3, lifecycle |
| EC2 (Nginx · FastAPI) | `deploy/backend/deploy.sh` — named upstream `salesluv_backend`, `/etc/nginx/conf.d/` upstream 파일 전환. Nginx server block 자체는 저장소 밖 호스트 설정. 슬라이드에서는 Nginx와 FastAPI를 한 박스로 합쳤다 |
| FastAPI | `backend/app/main.py` — CORS + origin 검사 미들웨어 + `/api` 라우터 등록 |
| Supabase (PostgreSQL · Auth · Storage) | `app/db/session.py`, `app/services/supabase_auth.py`, `app/services/storage.py` |
| AgentRun Queue | `app/models/agent.py`의 `agent_run` 테이블, `app/services/agent_runs.py` |
| Agent Worker | `app/services/agent_worker.py`. API 이미지와 **같은 이미지·다른 컨테이너**로 실행 (`deploy.sh`의 `python -m app.services.agent_worker`) |
| RunPod Serverless OCR 워커 | `infra/runpod/document_ocr/` (`handler.py` 401줄, PaddleOCR 기반). 백엔드 호출부는 `app/services/ocr.py`의 `_runpod()`. 원본은 Supabase Storage 서명 URL로 워커가 직접 조회 |
| 외부 AI API (LLM · STT) | `app/services/llm.py`, `app/services/stt.py` |
| SSE 진행상황 | `app/api/agent_runs.py:95-161` — `StreamingResponse`, `media_type="text/event-stream"` |
| GitHub Actions → IAM Role → SSM | `deploy-backend.yml`, `deploy-frontend.yml` — `workflow_dispatch` 수동, develop 브랜치 가드, OIDC role 획득, SSM Parameter Store 조회, SSM Run Command |

---

### OCR 워커 내부 (`infra/runpod/document_ocr/handler.py`, 401줄)

**입력 종류에 따라 엔진이 갈린다.** 이걸 뭉쳐서 "RunPod에서 PaddleOCR 돌린다"고만 말하면 부정확하다.

```python
# handler.py:35-38
if media_type == "application/pdf" or file_name.lower().endswith(".pdf"):
    pages = _pdf_pages(content)     # → pdf-inspector (ONNX Runtime)
else:
    pages = [_image_page(...)]      # → PaddleOCR
```

| 입력 | 엔진 | 비고 |
|---|---|---|
| 이미지 (명함 사진, PNG/JPG) | **PaddleOCR 3.x** | 기본 언어 `korean` |
| PDF | **pdf-inspector** | `classify_pdf_bytes()`로 텍스트본·스캔본을 먼저 구분, 페이지 배치 단위 처리 |

| 그 외 구성 | 내용 |
|---|---|
| 컨테이너 베이스 | `paddlepaddle/paddle:3.0.0-gpu-cuda12.6-cudnn9.5-trt10.5` — **GPU 이미지** |
| 문서용 / 명함용 분리 | 일반 문서는 `use_angle_cls=True`, 명함은 `False` (`_paddle_engine` / `_paddle_business_card_engine`). 명함은 여러 변형본을 만들어 결과를 병합한다 (`_business_card_variants`, `_merge_lines`) |
| 입력 전달 | Supabase Storage 서명 URL(기본) 또는 Base64 인라인(작은 파일) |
| 알려진 제약과 우회 | PDF 경로(`_pdf_pages`)는 `language`를 넘기지 않아 **스캔된 한글 PDF가 깨진다.** 워커를 재배포하지 않고, 백엔드가 첫 장을 PNG로 구워 **이미지 경로(PaddleOCR)로 재전송**해 우회한다 (`services/business_license_scans.py`) |

> **질문 대비**: "RunPod에서 뭘 돌리나요?" → "이미지는 GPU PaddleOCR, PDF는 pdf-inspector로 처리합니다. 스캔 한글 PDF는 PDF 경로에 언어 설정이 안 걸리는 제약이 있어서, 백엔드가 첫 장을 이미지로 변환해 PaddleOCR 경로로 다시 보내는 방식으로 우회했습니다."

### 호출 경로가 둘로 갈린다 (다이어그램의 핵심)

grep으로 확인한 실제 호출처다. 슬라이드 화살표가 이 사실을 그대로 반영한다.

| 외부 호출 | 호출하는 쪽 | 경로 |
|---|---|---|
| **LLM** | `app/agents/` 전용 (10개 모듈) | **워커 경로.** API는 LLM을 직접 부르지 않는다 |
| **OCR** | `app/api/documents.py`, `report_attachments.py`, `services/business_card_scans.py`, `document_processing.py` | **API 동기 경로** |
| **STT** | `app/api/transcriptions.py` | **API 동기 경로** |

즉 "AI = 전부 비동기 워커"가 아니다. 오래 걸리는 **LLM 생성만** 큐로 뺐고, 응답이 비교적 빠른 OCR·STT는 API가 직접 호출한다. 설명할 때 이 구분을 뭉개지 않는다.

## 3. AgentRun 큐 — 가장 많이 물어볼 부분

### 왜 큐인가

미팅 분석·보고서 생성은 LLM 호출이 여러 번 이어져 수십 초가 걸린다. HTTP 요청 안에서 끝내면 타임아웃·재시도 폭주·중복 실행이 생긴다. 그래서 `POST /api/agent-runs`는 **작업을 PostgreSQL에 기록하고 즉시 반환**하고, 별도 워커 컨테이너가 처리한다. 화면은 폴링과 SSE로 진행 상황만 받는다.

### 동작 (`app/services/agent_worker.py`)

| 단계 | 구현 |
|---|---|
| 원자적 선점 | `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1` (`claim()`, 128~131행). 워커가 여러 개여도 같은 작업을 두 번 잡지 않는다 |
| 선점 대상 | `queued`이고 `next_attempt_at <= now`인 것, **또는** `running`인데 `lease_expires_at <= now`인 것 |
| Lease | `LEASE_SECONDS = 90`. 워커가 죽으면 90초 뒤 lease가 만료돼 다른 워커가 이어받는다 |
| Heartbeat | `HEARTBEAT_SECONDS = 30`마다 lease 연장 (`_heartbeat()`). 살아 있는 동안은 뺏기지 않는다 |
| 재시도 | `MAX_ATTEMPTS = 2`. 초과하면 `agent_run_lease_exhausted`로 실패 확정 (`_fail_exhausted_leases()`) |
| 병렬 분기 | 미팅 근거가 확정되면 `meeting_report_writing`(보고서 작성)과 `meeting_analysis`(딜 특성 분석)를 **독립 자식 작업으로 분리 적재** (`_enqueue_meeting_children()`). 이미 있으면 건너뛰어 중복 생성하지 않는다 |
| 만료 정리 | 만료된 claim의 payload를 지워 원문·접속 문자열을 남기지 않는다 (`_redact_expired_claim()`) |

### Redis/Celery를 안 쓴 이유

이미 PostgreSQL이 있고 작업량이 단일 인스턴스로 충분하다. `FOR UPDATE SKIP LOCKED`로 필요한 원자성이 확보되고, 큐와 결과가 같은 트랜잭션 경계 안에 있어 정합성이 단순해진다. 브로커를 하나 더 운영할 근거가 없었다. `deployment_detail.md` §5.1에도 첫 배포 범위에서 Redis/Celery를 제외했다고 기록돼 있다.

---

## 4. CloudFront 단일 origin을 고른 이유

프론트와 API를 다른 공개 호스트에 두면 CORS 설정, mixed content, 쿠키의 `Secure` / `SameSite` / host-only 동작이 전부 따로 논다. 같은 CloudFront 호스트에서 `/api/*`만 EC2로 보내면 이 문제들이 구조적으로 사라진다 (`deployment_detail.md` §4 설계 결정표).

| 요청 | 경로 |
|---|---|
| `/`, `/login`, `/customers` 등 화면 | CloudFront → private S3 |
| 확장자 없는 SPA deep link | CloudFront Function `salesluv-spa-rewrite`가 `/index.html`로 rewrite |
| `/api/*` | CloudFront → EC2 HTTP 80 → Nginx → FastAPI (캐시 비활성, 모든 메서드 허용) |

EC2는 퍼블릭에 열려 있지 않고 **보안 그룹이 CloudFront managed prefix list의 HTTP 80만** 허용한다. CloudFront 출발 IP가 고정이 아니라 개별 IP 허용은 깨지기 쉬워서 managed prefix list를 썼다.

**솔직하게 말할 것**: 브라우저 → CloudFront 구간은 HTTPS지만 **CloudFront → EC2 origin 구간은 현재 HTTP 80이고 TLS를 적용하지 않았다.** 커스텀 도메인과 ACM 인증서가 없어 CloudFront 기본 도메인을 쓰는 상태다. 문서에도 미적용으로 기록돼 있으므로 숨기지 말고 "다음 개선 항목"으로 말하는 편이 낫다.

## 5. 무중단 배포 (`deploy/backend/deploy.sh`)

포트 `8000`과 `18000` 두 슬롯을 쓴다. 새 컨테이너(API + 짝이 되는 agent worker)를 **비활성 슬롯에 먼저 띄우고** `/api/health`와 `/api/health/db`를 확인한 뒤, Nginx upstream 파일을 새 슬롯으로 바꾸고 `nginx -t` → `nginx -s reload` 한다. 실패하면 이전 슬롯으로 upstream을 되돌리고 이전 워커를 다시 띄운다.

배포는 자동 push가 아니라 `workflow_dispatch` **수동**이고, `develop` 브랜치가 아니면 워크플로가 즉시 실패한다. EC2는 전달받은 정확한 Git SHA로 이미지를 로컬 빌드한다.

---

## 5-1. 문서 검색 — 지금은 키워드 검색이다

**운영 `.env`에 `EMBEDDING_PROVIDER` 줄이 없다.** 그러면 `core/config.py:53`의 기본값 `"none"`이 적용되고, `embedding_configured`가 False가 되어 **임베딩을 만들지도, 쓰지도 않는다.**

실제로 도는 검색 로직 (`services/document_processing.py:441-458`):

```python
if settings.embedding_configured and rows:      # 현재 False
    query_vector = (await embeddings.embed([query]))[0]
...
if query_vector is not None and isinstance(row.embedding, list):
    score = embeddings.cosine_similarity(query_vector, row.embedding)
else:                                            # ← 현재 이 경로
    content_tokens = _tokens(row.content)
    score = len(query_tokens & content_tokens) / max(len(query_tokens), 1)
```

즉 **질의어와 문서 조각의 단어 겹침 비율**로 점수를 매기고 상위 N개를 고른다. 후보는 딜·고객 범위로 먼저 좁힌 뒤(`document_scopes`) 파이썬에서 점수를 계산한다.

### 자료에 쓰면 안 되는 표현

> **"벡터 검색", "RAG", "임베딩 기반 검색", "시맨틱 검색"은 쓰지 않는다.** 코드에 경로는 있지만 운영에서 꺼져 있어 실제로 돌지 않는다. 켜져 있다고 말하면 사실과 다르다.

쓸 수 있는 표현: **"문서 검색"**, "키워드 기반 문서 검색", "딜·고객 범위로 좁힌 문서 검색".

### 물어보면 이렇게 답한다

세 갈래(`none` / `local` / `external`)를 **설정만 바꾸면 전환되도록** 만들어 뒀고, 현재는 문서 수 규모에서 키워드 검색으로 충분해 켜지 않았습니다. 벡터를 켜면 `local`은 `paraphrase-multilingual-MiniLM-L12-v2`를 컨테이너에서 로드하고, `external`은 OpenAI 호환 `/embeddings`를 부릅니다. 저장은 pgvector가 아니라 JSONB 컬럼이고 코사인 유사도를 직접 계산합니다.

## 6. 의도적으로 뺀 것과 그 이유

발표 중 "왜 안 썼냐"고 물으면 답할 목록이다.

| 항목 | 대신 쓴 것 | 이유 |
|---|---|---|
| pgvector | JSONB 임베딩 컬럼 | 문서 수 규모에서 정확도·속도가 충분했고, 임베딩 미설정 시 키워드 검색으로 fallback하는 경로가 이미 있다 |
| Redis / Celery | PostgreSQL `agent_run` 큐 | 위 3장 참고. 브로커를 추가로 운영할 근거 없음 |
| Alembic | `backend/sql/` 날짜 기반 SQL 수동 적용 | Supabase SQL Editor에서 직접 적용하는 운영 방식과 맞췄다. 자동화돼 있지 않다는 점은 그대로 말할 것 |
| Redux · Zustand | React Context + 화면 단위 hook | 공유해야 하는 전역 상태가 세션·권한뿐이라 라이브러리를 도입할 이유가 없었다 |
| deepagents | `langchain.agents.create_agent` | 의존성에는 남아 있으나 실제로 import하지 않는다. 정리 대상 |
| 차트 라이브러리 (recharts) | CSS로 직접 구현 (`StageBar`) | 필요한 시각화가 단계 막대 정도라 라이브러리를 도입할 이유가 없었다. recharts는 의존성에 남아 있으나 import하지 않는다. 정리 대상 |
| WAF · 커스텀 도메인 · origin TLS | 미적용 | 첫 배포 범위에서 명시적으로 제외 (`deployment_detail.md` §5.1) |
| Auto Scaling · ALB · RDS · ECR · IaC | 미적용 | 단일 EC2 + Supabase 구성. 저장소에 근거가 없으므로 슬라이드에 넣지 않는다 |

---

## 6-1. 예상 질문과 답

슬라이드의 "운영 부담이 이득보다 크면 쓰지 않았다"는 문장은 **의도적으로 질문을 유도하는 줄**이다. 아래 답을 준비한 상태에서만 쓴다.

### Q. Redis나 Celery를 쓰지 그랬나요?

작업량이 단일 인스턴스로 충분했고, PostgreSQL의 `FOR UPDATE SKIP LOCKED`로 필요한 원자성이 이미 확보됩니다. 브로커를 하나 더 두면 장애 지점과 배포 대상이 늘어나는데, 그만한 이득이 없었습니다. 큐와 결과가 같은 DB 트랜잭션 경계 안에 있어서 "작업은 성공했는데 결과 저장이 실패"하는 경우를 따로 처리하지 않아도 되는 것도 이유입니다.

### Q. 그럼 규모가 커지면 어떻게 하나요?

먼저 워커 컨테이너 수를 늘립니다. `SKIP LOCKED`라 워커가 몇 개든 같은 작업을 중복으로 잡지 않아서, 코드 변경 없이 대수만 늘리면 됩니다. 그 다음 병목은 워커들의 DB 폴링이고, 그 지점이 실제로 측정되면 그때 브로커 도입을 검토하는 게 순서라고 봤습니다.

### Q. Supabase에 종속되는 것 아닌가요?

일부는 맞습니다. DB는 표준 PostgreSQL이라 옮길 수 있지만 **Auth는 종속이 맞습니다.** 다만 서버가 Supabase SDK에 의존하는 게 아니라 JWKS로 공개키를 받아 JWT를 검증하는 표준 방식이라(`services/supabase_auth.py`), 발급자를 바꾸는 작업 범위는 제한적입니다. 인증 서버를 직접 만드는 비용보다 이 종속이 낫다고 판단했습니다.

### Q. 인증 서버를 직접 안 만든 게 실력 부족 아닌가요?

비밀번호 해싱·토큰 회전·계정 복구를 직접 구현하면 그만큼 보안 책임을 떠안습니다. 팀 규모에서 그걸 제품 기능보다 우선할 이유가 없었습니다. 대신 **위임하지 않은 부분은 직접 했습니다** — 역할별 접근 제어, origin 검사 미들웨어, 업로드 검증, HTML 새니타이즈, 문서 보관기한은 모두 직접 구현했습니다.

### Q. AI 작업을 큐로 뺀 게 오버엔지니어링 아닌가요?

LLM 호출이 이어지는 보고서 생성이 실측 30초~1분입니다. HTTP 요청 안에서 끝내면 타임아웃, 새로고침 시 중복 실행, 배포 시 작업 유실이 그대로 생깁니다. 큐를 뺀 쪽이 오히려 더 많은 예외 처리를 요구했습니다.

---

## 7. 운영 확인 기록

**2026-09-11 확인** — 배포된 서비스에 직접 요청:

| 확인 | 결과 |
|---|---|
| `GET /api/health` | HTTP 200 |
| `GET /api/health/db` | HTTP 200 (DB 연결 정상) |
| 2026-09-04 이후 인프라 커밋 | 1건 (`f561908` 워크플로 정리). 배포 구성 변경 아님 |

따라서 슬라이드에 **"현재 운영 중"** 표현을 써도 된다. 다만 화면 캡처로 증명한 것은 아니고 HTTP 응답으로 확인한 것이다.

## 8. AWS 콘솔 캡처 — 현재 불필요

`docs/technical/deploy/deployment_detail.md`에 리전·S3 설정·CloudFront origin과 behavior·CloudFront Function·EC2 보안 그룹·IAM role·SSM parameter·Nginx 슬롯이 **전부 기록돼 있다.** 아키텍처 슬라이드는 캡처 없이 그릴 수 있고, 위 7장의 헬스체크로 현재 동작도 확인됐다.

아래 **두 경우에만** 캡처가 필요하다.

**(1) 발표에서 "현재 운영 중"을 화면으로 증명해야 할 때**
`AWS Console → CloudFront → Distributions → 해당 Distribution → General`
확인 목적: Enabled 상태와 Last modified. Distribution ID·도메인은 **마스킹**.

**(2) 면접에서 서버 스펙을 물을 때**
`AWS Console → EC2 → Instances → 해당 인스턴스 → Details`
확인 목적: instance type과 볼륨. `deployment_detail.md`가 "EC2의 OS·용량·instance profile·SSH 관리 규칙은 workflow가 만들지 않는 외부 상태"라고 명시해 **저장소로는 확인할 수 없는 유일한 항목**이다. Instance ID·IP·Security Group ID는 **마스킹**.

그 외(S3 Permissions, Route 53, VPC, Load Balancer 등)는 요청하지 않는다. Route 53·ALB·Auto Scaling·RDS는 애초에 쓰지 않는 구성이고, S3 권한 설정은 문서에 기록돼 있다.
