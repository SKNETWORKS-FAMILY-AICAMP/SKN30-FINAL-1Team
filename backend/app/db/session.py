"""비동기 DB 엔진과 세션.

Supabase transaction pooler(포트 6543, PgBouncer) 를 전제로 설정돼 있습니다.
아래 connect_args 를 빼면 평소엔 잘 돌다가 부하가 걸릴 때 산발적으로 터집니다.

엔진은 import 시점이 아니라 처음 쓸 때 만듭니다.
그래야 DATABASE_URL 이 없는 환경(CI 등)에서도 앱을 import 할 수 있고,
DB 를 쓰지 않는 테스트가 DB 설정에 끌려가지 않습니다.
"""

from collections.abc import AsyncGenerator
from functools import lru_cache
from uuid import uuid4

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL 이 설정되지 않았습니다. backend/.env 를 확인하세요.")

    return create_async_engine(
        settings.async_database_url,
        echo=settings.debug,
        # PgBouncer 가 이미 커넥션을 풀링하므로 SQLAlchemy 쪽에서 또 풀링하지 않는다.
        # 이중 풀링은 유휴 커넥션을 붙잡아 Supabase 커넥션 한도를 빠르게 소진시킨다.
        poolclass=NullPool,
        connect_args={
            # transaction 모드 PgBouncer 는 prepared statement 를 지원하지 않는다.
            # asyncpg 는 기본으로 statement 를 캐시하므로 반드시 꺼야 한다.
            "statement_cache_size": 0,
            # SQLAlchemy asyncpg 방언의 자체 캐시도 함께 끈다.
            "prepared_statement_cache_size": 0,
            # 커넥션마다 이름이 겹치지 않게 한다.
            # 풀러가 커넥션을 재사용하면서 같은 이름의 statement 가 충돌하는 걸 막는다.
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
        },
    )


@lru_cache(maxsize=1)
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        get_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession]:
    """요청 범위의 비동기 DB 세션을 제공한다."""
    async with get_sessionmaker()() as session:
        yield session
