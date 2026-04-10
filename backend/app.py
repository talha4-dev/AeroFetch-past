from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
import sys

# Ensure backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import Config
from models.user import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    Config.init_app(app)

    # Extensions
    db.init_app(app)
    jwt = JWTManager(app)
    # Aggressive CORS setup for production stability
    CORS(app, 
         origins=Config.CORS_ORIGINS, 
         supports_credentials=True,
         allow_headers=["*"],
         methods=["*"])

    # JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({'success': False, 'error': 'Missing or invalid token'}), 401

    @jwt.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        return jsonify({'success': False, 'error': 'Token has expired. Please log in again.'}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({'success': False, 'error': 'Invalid token'}), 401

    # Register blueprints
    from routes.auth import auth_bp
    from routes.download import download_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(download_bp, url_prefix='/api/download')

    # Health check
    @app.route('/')
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'service': 'AeroFetch API', 'version': '1.0.0'}), 200

    # 404 handler
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

    # 500 handler - helpful for debugging production crashes
    @app.errorhandler(500)
    def server_error(e):
        # Fallback for unexpected crashes
        msg = str(e.original_exception) if hasattr(e, 'original_exception') else str(e)
        return jsonify({'success': False, 'error': f'Internal Server Error: {msg}'}), 500

    # Create tables
    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
