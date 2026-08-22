# syntax=docker/dockerfile:1

FROM ghcr.io/astral-sh/uv:0.12.5-python3.13-trixie-slim

WORKDIR /app

ENV UV_LINK_MODE=copy \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev \
    && chmod -R a=rX /app/.venv

COPY app ./app

RUN groupadd --gid 10001 appuser \
    && useradd --uid 10001 --gid appuser --create-home --no-log-init \
        --shell /usr/sbin/nologin appuser \
    && chmod -R a=rX /app/app

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
