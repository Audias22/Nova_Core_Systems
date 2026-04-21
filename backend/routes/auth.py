from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from db import get_connection
import bcrypt

auth_bp = Blueprint("auth", __name__)

ROLES_POR_CARGO = {
    "Director de Operaciones": "admin",
    "Jefe de Almacén y Logística": "jefe_almacen",
    "Auxiliar de Bodega": "almacen",
    "Encargado de Flota": "flota",
    "Jefe de Ventas": "ventas",
    "Ejecutiva de Ventas": "ventas",
    "Jefe de Compras": "compras",
    "Jefe de Informática": "informatica"
}

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    correo = data.get("correo", "").strip()
    password = data.get("password", "").strip()

    if not correo or not password:
        return jsonify({"error": "Correo y contraseña son requeridos"}), 400

    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, nombre_completo, correo, password, cargo, area, activo FROM USUARIOS WHERE correo = %s",
                (correo,)
            )
            usuario = cursor.fetchone()
        conn.close()

        if not usuario:
            return jsonify({"error": "Credenciales incorrectas"}), 401

        if not usuario["activo"]:
            return jsonify({"error": "Usuario inactivo, contacte al administrador"}), 403

        password_valido = bcrypt.checkpw(
            password.encode("utf-8"),
            usuario["password"].encode("utf-8")
        )

        if not password_valido:
            return jsonify({"error": "Credenciales incorrectas"}), 401

        rol = ROLES_POR_CARGO.get(usuario["cargo"], "viewer")

        identity = str(usuario["id_usuario"])
        additional_claims = {
            "nombre": usuario["nombre_completo"],
            "correo": usuario["correo"],
            "cargo": usuario["cargo"],
            "area": usuario["area"],
            "rol": rol
        }

        token = create_access_token(identity=identity, additional_claims=additional_claims)

        return jsonify({
            "token": token,
            "usuario": {
                "id": usuario["id_usuario"],
                "nombre": usuario["nombre_completo"],
                "correo": usuario["correo"],
                "cargo": usuario["cargo"],
                "area": usuario["area"],
                "rol": rol
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@auth_bp.route("/me", methods=["GET"])
def me():
    from flask_jwt_extended import verify_jwt_in_request, get_jwt
    try:
        verify_jwt_in_request()
        claims = get_jwt()
        return jsonify({
            "id": claims.get("sub"),
            "nombre": claims.get("nombre"),
            "correo": claims.get("correo"),
            "cargo": claims.get("cargo"),
            "area": claims.get("area"),
            "rol": claims.get("rol")
        }), 200
    except Exception as e:
        return jsonify({"error": "Token inválido o expirado"}), 401