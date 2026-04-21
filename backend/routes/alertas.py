from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from db import get_connection

alertas_bp = Blueprint("alertas", __name__)

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


@alertas_bp.route("/", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "compras", "ventas", "informatica")
def get_alertas():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    a.id_alerta,
                    ta.nombre AS tipo_alerta,
                    ta.sistema_origen,
                    ea.nombre AS estado,
                    p.codigo AS codigo_producto,
                    p.nombre AS producto,
                    c.nombre_comercial AS cliente,
                    a.descripcion,
                    a.fecha_generacion,
                    a.fecha_resolucion
                FROM ALERTAS a
                JOIN TIPOS_ALERTA ta ON a.id_tipo = ta.id_tipo
                JOIN ESTADOS_ALERTA ea ON a.id_estado = ea.id_estado
                LEFT JOIN PRODUCTOS p ON a.id_producto = p.id_producto
                LEFT JOIN CLIENTES c ON a.id_cliente = c.id_cliente
                ORDER BY a.fecha_generacion DESC
            """)
            alertas = cursor.fetchall()
        conn.close()
        return jsonify(alertas), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@alertas_bp.route("/activas", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "compras", "ventas", "informatica")
def get_alertas_activas():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    a.id_alerta,
                    ta.nombre AS tipo_alerta,
                    ta.sistema_origen,
                    p.codigo AS codigo_producto,
                    p.nombre AS producto,
                    c.nombre_comercial AS cliente,
                    a.descripcion,
                    a.fecha_generacion
                FROM ALERTAS a
                JOIN TIPOS_ALERTA ta ON a.id_tipo = ta.id_tipo
                JOIN ESTADOS_ALERTA ea ON a.id_estado = ea.id_estado
                LEFT JOIN PRODUCTOS p ON a.id_producto = p.id_producto
                LEFT JOIN CLIENTES c ON a.id_cliente = c.id_cliente
                WHERE ea.nombre = 'Activa'
                ORDER BY a.fecha_generacion DESC
            """)
            alertas = cursor.fetchall()
        conn.close()
        return jsonify(alertas), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@alertas_bp.route("/generar", methods=["POST"])
@require_roles("jefe_almacen", "almacen", "admin")
def generar_alertas_automaticas():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    i.id_producto,
                    p.nombre AS producto,
                    i.cantidad_disponible,
                    i.stock_minimo
                FROM INVENTARIO i
                JOIN PRODUCTOS p ON i.id_producto = p.id_producto
                WHERE i.cantidad_disponible <= i.stock_minimo
            """)
            productos_bajo_stock = cursor.fetchall()

            alertas_creadas = 0
            for prod in productos_bajo_stock:
                cursor.execute("""
                    SELECT id_alerta FROM ALERTAS a
                    JOIN TIPOS_ALERTA ta ON a.id_tipo = ta.id_tipo
                    JOIN ESTADOS_ALERTA ea ON a.id_estado = ea.id_estado
                    WHERE ta.nombre = 'Stock bajo' 
                    AND a.id_producto = %s 
                    AND ea.nombre = 'Activa'
                """, (prod["id_producto"],))
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO ALERTAS (id_tipo, id_estado, id_producto, descripcion, fecha_generacion)
                        VALUES (1, 1, %s, %s, NOW())
                    """, (prod["id_producto"],
                          f"Stock bajo: {prod['producto']} tiene {prod['cantidad_disponible']} unidades, mínimo es {prod['stock_minimo']}"))
                    alertas_creadas += 1

            cursor.execute("""
                SELECT 
                    i.id_producto,
                    p.nombre AS producto,
                    DATEDIFF(CURDATE(), i.ultima_salida) AS dias_sin_movimiento
                FROM INVENTARIO i
                JOIN PRODUCTOS p ON i.id_producto = p.id_producto
                WHERE i.ultima_salida IS NOT NULL
                AND DATEDIFF(CURDATE(), i.ultima_salida) > 90
            """)
            productos_sin_movimiento = cursor.fetchall()

            for prod in productos_sin_movimiento:
                cursor.execute("""
                    SELECT id_alerta FROM ALERTAS a
                    JOIN TIPOS_ALERTA ta ON a.id_tipo = ta.id_tipo
                    JOIN ESTADOS_ALERTA ea ON a.id_estado = ea.id_estado
                    WHERE ta.nombre = 'Sin movimiento'
                    AND a.id_producto = %s
                    AND ea.nombre = 'Activa'
                """, (prod["id_producto"],))
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO ALERTAS (id_tipo, id_estado, id_producto, descripcion, fecha_generacion)
                        VALUES (2, 1, %s, %s, NOW())
                    """, (prod["id_producto"],
                          f"Sin movimiento: {prod['producto']} lleva {prod['dias_sin_movimiento']} días sin salidas"))
                    alertas_creadas += 1

            conn.commit()
        conn.close()
        return jsonify({
            "mensaje": f"Proceso completado. {alertas_creadas} alertas nuevas generadas."
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@alertas_bp.route("/<int:id_alerta>/resolver", methods=["PUT"])
@require_roles("jefe_almacen", "admin")
def resolver_alerta(id_alerta):
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_estado FROM ALERTAS WHERE id_alerta = %s", (id_alerta,)
            )
            alerta = cursor.fetchone()
            if not alerta:
                conn.close()
                return jsonify({"error": "Alerta no encontrada"}), 404
            if alerta["id_estado"] == 2:
                conn.close()
                return jsonify({"error": "Esta alerta ya fue resuelta"}), 400

            cursor.execute("""
                UPDATE ALERTAS 
                SET id_estado = 2, fecha_resolucion = NOW()
                WHERE id_alerta = %s
            """, (id_alerta,))
            conn.commit()
        conn.close()
        return jsonify({"mensaje": "Alerta resuelta correctamente"}), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@alertas_bp.route("/resumen", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "compras", "ventas", "informatica")
def get_resumen_alertas():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    ta.nombre AS tipo,
                    ea.nombre AS estado,
                    COUNT(*) AS total
                FROM ALERTAS a
                JOIN TIPOS_ALERTA ta ON a.id_tipo = ta.id_tipo
                JOIN ESTADOS_ALERTA ea ON a.id_estado = ea.id_estado
                GROUP BY ta.nombre, ea.nombre
                ORDER BY ta.nombre, ea.nombre
            """)
            resumen = cursor.fetchall()
        conn.close()
        return jsonify(resumen), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500