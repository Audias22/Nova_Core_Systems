from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from db import get_connection

inventario_bp = Blueprint("inventario", __name__)

def require_roles(*roles):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                if claims.get("rol") not in roles:
                    return jsonify({"error": "No tiene permisos para esta acción"}), 403
                return fn(*args, **kwargs)
            except Exception:
                return jsonify({"error": "Token inválido o expirado"}), 401
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator

@inventario_bp.route("/", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "compras", "informatica")
def get_inventario():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    i.id_inventario,
                    p.codigo,
                    p.nombre AS producto,
                    p.marca,
                    c.nombre AS categoria,
                    i.cantidad_disponible,
                    i.cantidad_reservada,
                    i.stock_minimo,
                    i.stock_maximo,
                    i.ubicacion_bodega,
                    i.ultima_actualizacion,
                    i.ultima_salida,
                    p.precio_unitario,
                    CASE 
                        WHEN i.cantidad_disponible <= i.stock_minimo THEN 'critico'
                        WHEN i.cantidad_disponible <= i.stock_minimo * 1.5 THEN 'bajo'
                        ELSE 'normal'
                    END AS estado_stock
                FROM INVENTARIO i
                JOIN PRODUCTOS p ON i.id_producto = p.id_producto
                JOIN CATEGORIAS c ON p.id_categoria = c.id_categoria
                ORDER BY c.nombre, p.codigo
            """)
            inventario = cursor.fetchall()
        conn.close()
        return jsonify(inventario), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@inventario_bp.route("/<int:id_producto>", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "compras", "informatica")
def get_producto_inventario(id_producto):
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    i.*,
                    p.codigo,
                    p.nombre AS producto,
                    p.marca,
                    p.especificacion,
                    p.precio_unitario,
                    c.nombre AS categoria
                FROM INVENTARIO i
                JOIN PRODUCTOS p ON i.id_producto = p.id_producto
                JOIN CATEGORIAS c ON p.id_categoria = c.id_categoria
                WHERE i.id_producto = %s
            """, (id_producto,))
            item = cursor.fetchone()
        conn.close()
        if not item:
            return jsonify({"error": "Producto no encontrado"}), 404
        return jsonify(item), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@inventario_bp.route("/ajuste", methods=["POST"])
@require_roles("jefe_almacen", "almacen")
def ajustar_inventario():
    data = request.get_json()
    id_producto = data.get("id_producto")
    cantidad = data.get("cantidad")
    motivo = data.get("motivo", "Ajuste manual")

    if not id_producto or cantidad is None:
        return jsonify({"error": "id_producto y cantidad son requeridos"}), 400

    try:
        verify_jwt_in_request()
        claims = get_jwt()
        id_usuario = int(claims.get("sub"))

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT cantidad_disponible FROM INVENTARIO WHERE id_producto = %s",
                (id_producto,)
            )
            inv = cursor.fetchone()
            if not inv:
                conn.close()
                return jsonify({"error": "Producto no encontrado en inventario"}), 404

            cantidad_anterior = inv["cantidad_disponible"]
            cantidad_nueva = cantidad_anterior + cantidad

            if cantidad_nueva < 0:
                conn.close()
                return jsonify({"error": "El ajuste resultaría en stock negativo"}), 400

            cursor.execute(
                "UPDATE INVENTARIO SET cantidad_disponible = %s WHERE id_producto = %s",
                (cantidad_nueva, id_producto)
            )
            cursor.execute("""
                INSERT INTO MOVIMIENTOS_INVENTARIO 
                (id_producto, id_tipo, id_usuario, cantidad, cantidad_anterior, cantidad_nueva, referencia)
                VALUES (%s, 3, %s, %s, %s, %s, %s)
            """, (id_producto, id_usuario, abs(cantidad), cantidad_anterior, cantidad_nueva, motivo))

            conn.commit()
        conn.close()
        return jsonify({
            "mensaje": "Ajuste aplicado correctamente",
            "cantidad_anterior": cantidad_anterior,
            "cantidad_nueva": cantidad_nueva
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@inventario_bp.route("/alertas-stock", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "compras")
def get_alertas_stock():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    p.codigo,
                    p.nombre AS producto,
                    p.marca,
                    c.nombre AS categoria,
                    i.cantidad_disponible,
                    i.stock_minimo,
                    i.ultima_salida,
                    DATEDIFF(CURDATE(), i.ultima_salida) AS dias_sin_movimiento
                FROM INVENTARIO i
                JOIN PRODUCTOS p ON i.id_producto = p.id_producto
                JOIN CATEGORIAS c ON p.id_categoria = c.id_categoria
                WHERE i.cantidad_disponible <= i.stock_minimo
                   OR (i.ultima_salida IS NOT NULL AND DATEDIFF(CURDATE(), i.ultima_salida) > 90)
                ORDER BY i.cantidad_disponible ASC
            """)
            alertas = cursor.fetchall()
        conn.close()
        return jsonify(alertas), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@inventario_bp.route("/movimientos/<int:id_producto>", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "informatica")
def get_movimientos(id_producto):
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    m.id_movimiento,
                    tm.nombre AS tipo_movimiento,
                    u.nombre_completo AS usuario,
                    m.cantidad,
                    m.cantidad_anterior,
                    m.cantidad_nueva,
                    m.fecha_movimiento,
                    m.referencia
                FROM MOVIMIENTOS_INVENTARIO m
                JOIN TIPOS_MOVIMIENTO tm ON m.id_tipo = tm.id_tipo
                JOIN USUARIOS u ON m.id_usuario = u.id_usuario
                WHERE m.id_producto = %s
                ORDER BY m.fecha_movimiento DESC
                LIMIT 50
            """, (id_producto,))
            movimientos = cursor.fetchall()
        conn.close()
        return jsonify(movimientos), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500