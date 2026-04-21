import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "nova_core_systems")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_secret")
    JWT_ACCESS_TOKEN_EXPIRES = 28800  # 8 horas