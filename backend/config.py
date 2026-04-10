import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'aerofetch-secret-key-2024-ultra-secure')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'aerofetch-jwt-secret-2024')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///aerofetch.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DOWNLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'downloads')
    LOG_FOLDER = os.path.join(os.path.dirname(__file__), 'logs')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB max
    # Path to YouTube cookies file. On Render, secret files are moved to /etc/secrets/
    # We check the Render secret path first, then fall back to the local path.
    COOKIES_FILE = os.environ.get('YOUTUBE_COOKIES_FILE', 
                                 '/etc/secrets/cookies.txt' if os.path.exists('/etc/secrets/cookies.txt') else 'cookies.txt')
    CORS_ORIGINS = [
        "https://bilalcode.site",
        "http://bilalcode.site",
        "https://aero-fetch-web-talha.vercel.app",
        "https://aerofetch-web-talha.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
        "http://localhost:5180",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
        "http://127.0.0.1:5179",
        "http://127.0.0.1:5180"
    ]

    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get(
        'GOOGLE_CLIENT_ID',
        '55324649796-07jisag08bcoacjc0epvr66btsoacumq.apps.googleusercontent.com'
    )

    @staticmethod
    def init_app(app):
        os.makedirs(Config.DOWNLOAD_FOLDER, exist_ok=True)
        os.makedirs(Config.LOG_FOLDER, exist_ok=True)
