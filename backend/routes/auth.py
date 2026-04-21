from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, verify_jwt_in_request, get_jwt
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


@auth_bp.route("/usuarios", methods=["GET"])
def get_usuarios():
    try:
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("rol") != "informatica":
            return jsonify({"error": "Acceso no autorizado"}), 403

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_usuario, nombre_completo, cargo, area, activo FROM USUARIOS ORDER BY area, cargo"
            )
            usuarios = cursor.fetchall()
        conn.close()

        resultado = []
        for u in usuarios:
            rol = ROLES_POR_CARGO.get(u["cargo"], "viewer")
            resultado.append({
                "id": u["id_usuario"],
                "nombre": u["nombre_completo"],
                "cargo": u["cargo"],
                "area": u["area"],
                "rol": rol,
                "activo": bool(u["activo"])
            })

        return jsonify(resultado), 200

    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@auth_bp.route("/stats", methods=["GET"])
def get_stats():
    try:
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("rol") != "informatica":
            return jsonify({"error": "Acceso no autorizado"}), 403

        conn = get_connection()
        with conn.cursor() as cursor:
            tablas = [
                ("usuarios",               "USUARIOS"),
                ("productos",              "PRODUCTOS"),
                ("clientes",               "CLIENTES"),
                ("pedidos",                "PEDIDOS"),
                ("recepciones",            "RECEPCIONES"),
                ("despachos",              "DESPACHOS"),
                ("devoluciones",           "DEVOLUCIONES"),
                ("alertas",                "ALERTAS"),
                ("movimientos_inventario", "MOVIMIENTOS_INVENTARIO"),
            ]
            stats = {}
            for clave, tabla in tablas:
                cursor.execute(f"SELECT COUNT(*) as total FROM {tabla}")
                stats[clave] = cursor.fetchone()["total"]
        conn.close()

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500