try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # MongoDB - Utilise les variables d'environnement
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017/libraai")
    database_name: str = os.getenv("DATABASE_NAME", "libraai")
    
    # JWT
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # PayPal
    paypal_client_id: str = os.getenv("PAYPAL_CLIENT_ID", "your-paypal-client-id")
    paypal_client_secret: str = os.getenv("PAYPAL_CLIENT_SECRET", "your-paypal-client-secret")
    paypal_mode: str = os.getenv("PAYPAL_MODE", "sandbox")  # sandbox ou live
    
    # Pinecone
    pinecone_api_key: str = os.getenv("PINECONE_API_KEY", "your-pinecone-api-key")
    pinecone_environment: str = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp-free")
    pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "libraai-docs")
    
    # Ollama
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama2")
    
    # Email pour réinitialisation de mot de passe
    mail_username: str = os.getenv("MAIL_USERNAME", "your-email@gmail.com")
    mail_password: str = os.getenv("MAIL_PASSWORD", "your-app-password")
    mail_from: str = os.getenv("MAIL_FROM", "LibraAI <noreply@libraaI.com>")
    mail_port: int = int(os.getenv("MAIL_PORT", "587"))
    mail_server: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    mail_from_name: str = os.getenv("MAIL_FROM_NAME", "LibraAI")
    mail_starttls: bool = os.getenv("MAIL_STARTTLS", "true").lower() == "true"
    mail_ssl_tls: bool = os.getenv("MAIL_SSL_TLS", "false").lower() == "true"
    
    # URL de l'application frontend (pour les liens de réinitialisation)
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Durée de validité du token de réinitialisation (en minutes)
    password_reset_token_expire_minutes: int = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "30"))
    
    class Config:
        env_file = ".env"

settings = Settings()