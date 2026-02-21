import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'aerofetch-secret-key-2024-ultra-secure')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'aerofetch-jwt-secret-2024')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///aerofetch.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DOWNLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'downloads')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB max
    CORS_ORIGINS = [
        "https://aero-fetch-web-talha.vercel.app",
        "https://aerofetch-web-talha.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174"
    ]

    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get(
        'GOOGLE_CLIENT_ID',
        '55324649796-07jisag08bcoacjc0epvr66btsoacumq.apps.googleusercontent.com'
    )

    @staticmethod
    def init_app(app):
        os.makedirs(Config.DOWNLOAD_FOLDER, exist_ok=True)
