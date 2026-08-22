# Backend Docker Design

## 목적

현재 FastAPI 백엔드를 로컬 Docker와 추후 단일 AWS EC2 배포에서 같은 방식으로 실행한다. 첫 배포 범위에는 Redis, OCR, STT worker, Nginx, Docker Compose를 포함하지 않는다.

## 선택한 방식

`ghcr.io/astral-sh/uv:0.12.5-python3.13-trixie-slim` 이미지를 사용해 `uv.lock` 그대로 운영 의존성을 설치한다. 이 방식은 현재 개발 도구와 잠금 파일을 그대로 재사용하므로 `pip`용 별도 요구사항 파일을 만들 필요가 없고, 첫 배포에 필요한 설정이 가장 적다.

Debian Trixie slim은 glibc 계열이므로 프로젝트가 의존하는 `scikit-learn`의 manylinux wheel을 사용할 수 있다. Alpine의 musl libc에서는 소스 빌드로 전환될 수 있으므로 Alpine 기반 이미지는 사용하지 않는다.

uv 버전을 태그에 고정해 빌드 도구가 조용히 바뀌지 않게 한다. 재현성의 본체는 `uv.lock`이므로 digest까지 고정하지는 않는다.

검토한 대안은 다음과 같다.

- 멀티스테이지 빌드: 최종 이미지 크기를 더 줄일 수 있지만 첫 배포 단계에서 빌드 구조와 가상환경 복사 규칙이 복잡해진다.
- `pip` 기반 이미지: 런타임이 단순해 보이지만 `uv.lock`과 별도의 의존성 관리 경로가 생겨 재현성이 떨어진다.

## 파일 구성

- `backend/Dockerfile`: 의존성 설치, 애플리케이션 복사, 운영 서버 실행을 정의한다.
- `backend/.dockerignore`: 로컬 가상환경, 캐시, 테스트 산출물, `.env` 및 비밀값을 빌드 컨텍스트에서 제외한다.

빌드 컨텍스트는 저장소 루트가 아니라 `backend/`로 고정한다. `Dockerfile`의 `COPY` 경로와 `backend/.dockerignore` 적용이 모두 이 기준을 전제로 한다.

```text
docker build --tag salesluv-backend:local backend/
```

의존성은 다음 명령으로 설치한다.

```text
uv sync --frozen --no-dev
```

`--frozen`은 잠금 파일을 다시 해석하거나 변경하지 않게 하고, `--no-dev`는 `pytest`와 `ruff` 같은 개발 의존성을 운영 이미지에서 제외한다.

## 빌드 캐시

의존성 레이어가 애플리케이션 코드 변경 때문에 무효화되지 않도록 Dockerfile 순서를 다음과 같이 고정한다.

```dockerfile
# syntax=docker/dockerfile:1

WORKDIR /app
ENV UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

COPY app ./app
```

`pyproject.toml`, `uv.lock`, 베이스 이미지가 그대로라면 앱 코드만 변경한 다음 빌드에서도 `.venv`가 포함된 의존성 레이어를 재사용한다.

`WORKDIR /app`이 있어야 `uv sync`가 `.venv`를 `/app/.venv`에 만들고, 실행 단계의 `PATH`와 맞는다.

이 단계에서 애플리케이션 코드가 아직 없어도 설치가 성립한다. `pyproject.toml`에 `[build-system]`이 없어 uv가 이 프로젝트 자체를 빌드·설치하지 않고 의존성만 설치하기 때문이다.

`--mount=type=cache`는 BuildKit 기능이므로 Dockerfile 첫 줄에 `# syntax=docker/dockerfile:1`을 둔다. 또한 캐시 마운트는 이미지 레이어와 다른 파일시스템이라 uv의 기본 hardlink 방식이 실패하고 경고와 함께 복사로 넘어간다. `UV_LINK_MODE=copy`로 처음부터 복사를 사용해 이 경고를 없앤다.

로컬 Docker builder의 캐시는 현재 컴퓨터에서 자동 재사용된다. CI runner는 실행마다 새로 생성되므로 backend 전용 외부 빌드 캐시가 필요하지만, 그 설정은 CI/CD를 실제로 추가하는 후속 단계에서 정한다. 이때 외부 캐시가 옮겨 주는 것은 레이어 캐시뿐이고 `RUN --mount=type=cache`의 uv 다운로드 캐시는 포함되지 않는다는 점을 전제로 삼는다.

## 실행 방식

빌드된 가상환경을 `PATH`에 직접 추가한다.

```dockerfile
ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

런타임에 `uv run`을 중간 프로세스로 두지 않아 Uvicorn이 PID 1로 실행되고 `SIGTERM`을 직접 받게 한다. 개발용 `--reload`는 사용하지 않는다. 현재 메모리 기반 로그인 제한과 백그라운드 작업 구현을 고려해 worker는 하나만 사용한다.

의존성 설치 후 전용 비루트 사용자를 생성하고, 애플리케이션 실행 전 `USER`를 전환한다. 애플리케이션과 가상환경은 런타임에 수정할 필요가 없으므로 읽기·실행 권한만 제공하고, 쓰기가 필요한 사용자 홈만 해당 사용자가 소유한다.

## 환경변수와 비밀값

`.env`는 이미지에 복사하지 않는다. 로컬 최소 검증에서는 `docker run --env APP_ENV=local`만 주입한다. `backend/.env` 전체를 `--env-file`로 주입하는 것은 DB·로그인처럼 외부 연동이 필요한 통합 확인에서만 사용한다. AWS에서는 EC2의 배포 환경 또는 AWS Systems Manager/Secrets Manager에서 런타임에 주입한다.

`APP_ENV`, `DEBUG`, `CORS_ORIGINS`, 데이터베이스 및 Supabase 관련 값은 이미지 빌드 인자가 아니라 컨테이너 실행 환경변수로 전달한다. 따라서 환경별 설정 변경 때문에 이미지를 다시 만들 필요가 없다.

환경변수는 없을 때 무슨 일이 생기는지에 따라 나눈다. 서버 기동을 막는 값과 개별 기능만 막는 값이 다르다.

서버가 뜨지 않는 값

```text
APP_ENV=production
DEBUG=false
CORS_ORIGINS=https://<frontend-origin>
```

`APP_ENV`는 기본값이 없는 유일한 값이다. `APP_ENV=production`이면 `DEBUG=false`와 `CORS_ORIGINS`(경로 없는 HTTPS origin)까지 함께 있어야 시작 시 validator를 통과한다.

없으면 해당 기능을 사용할 수 없는 값

- DB: `DATABASE_URL`
- Supabase 로그인: `SUPABASE_PUBLISHABLE_KEY`
- 자료실 업로드: `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`
- 에이전트·보고서: `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL`
- 미팅 전사: `STT_API_KEY`

첫 배포에서는 실제로 사용하는 기능의 값만 주입한다. 아직 사용하지 않는 LLM·STT·자료실 업로드 등의 값은 해당 기능을 활성화할 때 주입하며, 이 선택 기능들은 미설정 시 503을 반환한다. `DATABASE_URL`은 첫 배포에서 활성화하는 DB 기능의 필수값이며 `GET /api/health/db`로 검증한다. 활성화한 기능은 배포 검증에서 각각 확인하므로 기본 헬스체크만으로는 누락 여부를 판단하지 않는다.

`SUPABASE_URL`은 일반적인 Supabase 연결에서는 필수가 아니다. 값이 비어 있으면 `DATABASE_URL` 사용자명의 `postgres.<project_ref>`에서 프로젝트 URL을 자동으로 만든다. 데이터베이스 사용자명에서 project ref를 얻을 수 없는 다른 호스트를 사용할 때만 명시한다.

특히 코드의 `DEBUG` 기본값은 `true`다. `APP_ENV=production`에서 `DEBUG=false`를 빠뜨리면 보안 validator가 시작을 거부하므로, EC2 실행 환경의 필수값으로 관리한다.

## 검증

1. Docker 이미지를 로컬에서 성공적으로 빌드한다.
2. `app/` 안의 파일에 임시로 한 줄을 추가하고 다시 빌드해 `uv sync` 단계가 `CACHED`로 표시되는지 확인한 뒤 되돌린다. `COPY`의 캐시 키는 파일 내용이므로 `touch`만으로는 확인되지 않는다.
3. `APP_ENV=local`만 주입해 컨테이너를 실행한다. 로컬 검증에는 production 설정을 사용하지 않는다.
4. `GET /api/health`가 HTTP 200과 `{"status":"ok"}`를 반환하는지 확인한다.
5. 별도의 production 설정 스모크 테스트에서는 `APP_ENV=production`, `DEBUG=false`, `CORS_ORIGINS=https://app.example.com`만 주입해 컨테이너가 시작되고 `GET /api/health`가 HTTP 200인지 확인한다. 이는 production validator 확인일 뿐 DB·Auth 통합 검증이 아니며 실제 비밀값은 주입하지 않는다.
6. 컨테이너 로그에 시작 오류나 비밀값 노출이 없는지 확인한다.
7. `docker stop`으로 컨테이너에 `SIGTERM`을 보내 Uvicorn이 제한 시간 안에 정상 종료되는지 확인한다.
8. 임시 컨테이너와 테스트 이미지를 정리한다.

## 후속 범위

Docker Compose, EC2 Nginx, GitHub Actions, 이미지 레지스트리, AWS 환경변수 연결은 백엔드 단일 이미지 검증이 끝난 뒤 별도 단계로 추가한다. GitHub Actions를 추가할 때 backend 전용 외부 빌드 캐시도 함께 정한다. Redis와 OCR/STT worker는 현재 이미지 검증 범위에는 포함하지 않는다.

후속 단계에서 미리 확인할 항목은 다음과 같다.

- 리버스 프록시를 앞에 두면 `request.client.host`가 프록시 주소가 되어 IP 단위 로그인 시도 제한이 전체 사용자 하나의 버킷으로 합쳐진다. 실제 사용자 IP 전달 설정이 필요하다.
- 프론트와 API의 도메인 구성에 따라 인증 쿠키 전달 조건이 달라진다.
- DB 연결까지 확인하려면 `GET /api/health`가 아니라 `GET /api/health/db`를 사용한다.
- 이미지를 빌드하는 CPU 아키텍처는 EC2 인스턴스 타입을 정할 때 함께 맞춘다.
