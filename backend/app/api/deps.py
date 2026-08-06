"""라우터에서 공용으로 쓰는 의존성.

Annotated 별칭으로 두면 라우터 시그니처가 짧아지고,
Depends() 를 인자 기본값에 직접 쓰지 않게 되어 린터(B008)와도 맞습니다.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

type DbSession = Annotated[AsyncSession, Depends(get_db)]
