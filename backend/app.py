from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config

from routes.auth import auth_bp
from routes.inventario import inventario_bp
from routes.pedidos import pedidos_bp
from routes.recepciones import recepciones_bp
from routes.despachos import despachos_bp
from routes.devoluciones import devoluciones_bp
from routes.alertas import alertas_bp

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = Config.JWT_ACCESS_TOKEN_EXPIRES

CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})
jwt = JWTManager(app)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(inventario_bp, url_prefix="/api/inventario")
app.register_blueprint(pedidos_bp, url_prefix="/api/pedidos")
app.register_blueprint(recepciones_bp, url_prefix="/api/recepciones")
app.register_blueprint(despachos_bp, url_prefix="/api/despachos")
app.register_blueprint(devoluciones_bp, url_prefix="/api/devoluciones")
app.register_blueprint(alertas_bp, url_prefix="/api/alertas")

if __name__ == "__main__":
    app.run(debug=True, port=5000)