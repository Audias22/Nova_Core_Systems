from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from db import get_connection

despachos_bp = Blueprint("despachos", __name__)

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


@despachos_bp.route("/", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "flota", "informatica")
def get_despachos():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    d.id_despacho,
                    p.numero_pedido,
                    c.nombre_comercial AS cliente,
                    c.municipio_entrega,
                    ed.nombre AS estado,
                    u.nombre_completo AS responsable,
                    d.fecha_despacho,
                    d.fecha_entrega_real,
                    d.confirmacion_cliente,
                    DATEDIFF(d.fecha_entrega_real, d.fecha_despacho) AS dias_entrega
                FROM DESPACHOS d
                JOIN PEDIDOS p ON d.id_pedido = p.id_pedido
                JOIN CLIENTES c ON p.id_cliente = c.id_cliente
                JOIN ESTADOS_DESPACHO ed ON d.id_estado = ed.id_estado
                JOIN USUARIOS u ON d.id_responsable = u.id_usuario
                ORDER BY d.fecha_despacho DESC
            """)
            despachos = cursor.fetchall()
        conn.close()
        return jsonify(despachos), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@despachos_bp.route("/<int:id_despacho>", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "flota", "informatica")
def get_despacho(id_despacho):
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    d.id_despacho,
                    p.numero_pedido,
                    p.id_pedido,
                    c.nombre_comercial AS cliente,
                    c.municipio_entrega,
                    c.contacto_principal,
                    ed.nombre AS estado,
                    u.nombre_completo AS responsable,
                    d.fecha_despacho,
                    d.fecha_entrega_real,
                    d.confirmacion_cliente
                FROM DESPACHOS d
                JOIN PEDIDOS p ON d.id_pedido = p.id_pedido
                JOIN CLIENTES c ON p.id_cliente = c.id_cliente
                JOIN ESTADOS_DESPACHO ed ON d.id_estado = ed.id_estado
                JOIN USUARIOS u ON d.id_responsable = u.id_usuario
                WHERE d.id_despacho = %s
            """, (id_despacho,))
            despacho = cursor.fetchone()

            if not despacho:
                conn.close()
                return jsonify({"error": "Despacho no encontrado"}), 404

            cursor.execute("""
                SELECT
                    pr.codigo,
                    pr.nombre AS producto,
                    pr.marca,
                    dp.cantidad,
                    dp.precio_unitario,
                    (dp.cantidad * dp.precio_unitario) AS subtotal
                FROM DETALLE_PEDIDO dp
                JOIN PRODUCTOS pr ON dp.id_producto = pr.id_producto
                WHERE dp.id_pedido = %s
            """, (despacho["id_pedido"],))
            despacho["productos"] = cursor.fetchall()

        conn.close()
        return jsonify(despacho), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@despachos_bp.route("/", methods=["POST"])
@require_roles("jefe_almacen", "almacen", "flota")
def crear_despacho():
    data = request.get_json()
    id_pedido = data.get("id_pedido")
    id_responsable = data.get("id_responsable")

    if not id_pedido or not id_responsable:
        return jsonify({"error": "id_pedido e id_responsable son requeridos"}), 400

    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_estado FROM PEDIDOS WHERE id_pedido = %s", (id_pedido,)
            )
            pedido = cursor.fetchone()
            if not pedido:
                conn.close()
                return jsonify({"error": "Pedido no encontrado"}), 404
            if pedido["id_estado"] not in [2, 3]:
                conn.close()
                return jsonify({"error": "Solo se pueden despachar pedidos aprobados o en preparación"}), 400

            cursor.execute(
                "SELECT id_despacho FROM DESPACHOS WHERE id_pedido = %s", (id_pedido,)
            )
            if cursor.fetchone():
                conn.close()
                return jsonify({"error": "Este pedido ya tiene un despacho registrado"}), 400

            cursor.execute("""
                INSERT INTO DESPACHOS (id_pedido, id_estado, id_responsable, fecha_despacho)
                VALUES (%s, 1, %s, CURDATE())
            """, (id_pedido, id_responsable))

            cursor.execute(
                "UPDATE PEDIDOS SET id_estado = 4 WHERE id_pedido = %s", (id_pedido,)
            )

            cursor.execute("""
                SELECT dp.id_producto, dp.cantidad
                FROM DETALLE_PEDIDO dp
                WHERE dp.id_pedido = %s
            """, (id_pedido,))
            productos = cursor.fetchall()

            verify_jwt_in_request()
            claims = get_jwt()
            id_usuario = int(claims.get("sub"))

            for prod in productos:
                cursor.execute("""
                    SELECT cantidad_disponible FROM INVENTARIO WHERE id_producto = %s
                """, (prod["id_producto"],))
                inv = cursor.fetchone()
                if inv:
                    cantidad_anterior = inv["cantidad_disponible"]
                    cantidad_nueva = max(0, cantidad_anterior - prod["cantidad"])
                    cursor.execute("""
                        UPDATE INVENTARIO 
                        SET cantidad_disponible = %s, ultima_salida = CURDATE(), ultima_actualizacion = NOW()
                        WHERE id_producto = %s
                    """, (cantidad_nueva, prod["id_producto"]))
                    cursor.execute("""
                        INSERT INTO MOVIMIENTOS_INVENTARIO
                        (id_producto, id_tipo, id_usuario, cantidad, cantidad_anterior, cantidad_nueva, referencia)
                        VALUES (%s, 2, %s, %s, %s, %s, %s)
                    """, (prod["id_producto"], id_usuario, prod["cantidad"],
                          cantidad_anterior, cantidad_nueva, f"PED-{id_pedido}"))

            conn.commit()
        conn.close()
        return jsonify({"mensaje": "Despacho registrado correctamente"}), 201
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@despachos_bp.route("/<int:id_despacho>/confirmar", methods=["PUT"])
@require_roles("jefe_almacen", "flota", "ventas")
def confirmar_entrega(id_despacho):
    data = request.get_json()
    confirmacion = data.get("confirmacion_cliente", "Entrega confirmada por el cliente")

    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_pedido, id_estado FROM DESPACHOS WHERE id_despacho = %s", (id_despacho,)
            )
            despacho = cursor.fetchone()
            if not despacho:
                conn.close()
                return jsonify({"error": "Despacho no encontrado"}), 404
            if despacho["id_estado"] == 2:
                conn.close()
                return jsonify({"error": "Este despacho ya fue confirmado"}), 400

            cursor.execute("""
                UPDATE DESPACHOS 
                SET id_estado = 2, fecha_entrega_real = CURDATE(), confirmacion_cliente = %s
                WHERE id_despacho = %s
            """, (confirmacion, id_despacho))

            cursor.execute(
                "UPDATE PEDIDOS SET id_estado = 5 WHERE id_pedido = %s",
                (despacho["id_pedido"],)
            )
            conn.commit()
        conn.close()
        return jsonify({"mensaje": "Entrega confirmada correctamente"}), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500