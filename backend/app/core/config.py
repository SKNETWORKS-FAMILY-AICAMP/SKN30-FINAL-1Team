"""애플리케이션 설정.

환경변수를 읽는 유일한 창구입니다.
코드 다른 곳에서 os.getenv 를 직접 호출하지 마세요.
"""

from urllib.parse import urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "local"
    debug: bool = True

    # 프론트 개발 서버 주소. 쉼표로 여러 개 지정 가능.
    cors_origins: str = "http://localhost:5173"

    # Supabase 등에서 받은 접속 문자열을 그대로 넣으면 됩니다.
    # 드라이버 접두사(+asyncpg)는 아래에서 자동으로 붙입니다.
    database_url: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def async_database_url(self) -> str:
        """앱이 실제로 쓰는 접속 문자열 (asyncpg).

        SQLAlchemy 는 postgresql:// 만으로는 어떤 드라이버를 쓸지 모릅니다.
        .env 에는 Supabase 가 준 문자열을 그대로 두고 여기서 접두사를 붙입니다.
        """
        return _with_driver(self.database_url, "postgresql+asyncpg")


def _with_driver(url: str, driver: str) -> str:
    """postgresql:// → postgresql+asyncpg:// 처럼 드라이버 접두사를 보정한다."""
    if not url:
        return url
    parts = urlsplit(url)
    if "+" in parts.scheme:
        return url
    return urlunsplit(parts._replace(scheme=driver))


settings = Settings()
