from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from app.api.deps import DbSession

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db")
async def health_db(db: DbSession) -> dict[str, str]:
    try:
        result = await db.execute(text("select 1"))
        result.scalar_one()
    except Exception as exc:  # noqa: BLE001
        # 접속 문자열에 자격증명이 들어 있으므로 예외 원문을 그대로 노출하지 않는다.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"database unavailable ({type(exc).__name__})",
        ) from exc

    return {"status": "ok", "database": "connected"}
