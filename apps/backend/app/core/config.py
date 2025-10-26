"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )
    
    # Database
    # For local development from host machine, use directConnection=true to bypass replica set discovery
    # mongodb://localhost:27017/vorte?directConnection=true
    # For Docker container, use service name: mongodb://mongo:27017/vorte
    MONGO_URI: str = "mongodb://localhost:27017/vorte?directConnection=true"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    JWT_SECRET: str = "change_me_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Argon2 Password Hashing (environment-specific)
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 65536  # 64MB for dev, 131072 (128MB) for prod
    ARGON2_PARALLELISM: int = 2  # 2 for dev, 4 for prod
    
    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_BUCKET: str = "vorte-media"
    MINIO_SECURE: bool = False
    
    # Avatar Settings
    AVATAR_BUCKET: str = "avatars"
    AVATAR_MAX_SIZE_BYTES: int = 2097152  # 2MB
    AVATAR_PRESIGNED_URL_EXPIRY_SECONDS: int = 900  # 15 minutes
    MINIO_PUBLIC_BASE_URL: str = "http://localhost:9000"  # CDN/gateway URL for public access
    
    # Observability
    PROMETHEUS_METRICS: bool = True
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"
    OTEL_SERVICE_NAME: str = "vorte-api"
    
    # Email
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "noreply@vorte.com.tr"
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@vorte.com.tr"
    EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: int = 1
    EMAIL_VERIFICATION_EXPIRES_SECONDS: int = 3600  # 1 hour
    
    # Application
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:80"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PASSWORD_CHANGE_PER_10MIN: int = 3
    RATE_LIMIT_AVATAR_UPLOAD_PER_10MIN: int = 5
    RATE_LIMIT_EMAIL_CHANGE_PER_HOUR: int = 3
    
    # Cart
    CART_TTL_GUEST_DAYS: int = 7
    CART_CACHE_TTL_SECONDS: int = 900  # 15 minutes
    IDEMPOTENCY_TTL_SECONDS: int = 86400  # 24 hours
    
    # KVKV Compliance
    PII_ERASURE_RETENTION_DAYS: int = 30
    
    # Payment Providers
    # iyzico
    IYZICO_API_KEY: str = "sandbox-test-api-key"
    IYZICO_SECRET_KEY: str = "sandbox-test-secret-key"
    IYZICO_BASE_URL: str = "https://sandbox-api.iyzipay.com"
    
    # PayTR
    PAYTR_MERCHANT_ID: str = ""
    PAYTR_MERCHANT_KEY: str = ""
    PAYTR_MERCHANT_SALT: str = ""
    PAYTR_BASE_URL: str = "https://www.paytr.com"
    
    # Notification Providers
    # Email
    EMAIL_PROVIDER: str = "sendgrid"  # sendgrid or ses
    SENDGRID_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@vorte.com"
    
    # SMS
    SMS_PROVIDER: str = "netgsm"  # netgsm or verimor
    NETGSM_USERNAME: str = ""
    NETGSM_PASSWORD: str = ""
    NETGSM_SENDER: str = "VORTE"
    VERIMOR_USERNAME: str = ""
    VERIMOR_PASSWORD: str = ""
    VERIMOR_SENDER: str = "VORTE"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017/?replicaSet=rs0"


settings = Settings()
