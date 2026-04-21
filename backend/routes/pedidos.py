from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from db import get_connection

pedidos_bp = Blueprint("pedidos", __name__)

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

@pedidos_bp.route("/", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "ventas", "informatica")
def get_pedidos():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    p.id_pedido,
                    p.numero_pedido,
                    c.nombre_comercial AS cliente,
                    c.sector,
                    tc.nombre AS tipo_cliente,
                    ep.nombre AS estado,
                    u.nombre_completo AS aprobado_por,
                    p.fecha_pedido,
                    p.fecha_aprobacion,
                    COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS total
                FROM PEDIDOS p
                JOIN CLIENTES c ON p.id_cliente = c.id_cliente
                JOIN TIPOS_CLIENTE tc ON c.id_tipo = tc.id_tipo
                JOIN ESTADOS_PEDIDO ep ON p.id_estado = ep.id_estado
                LEFT JOIN USUARIOS u ON p.id_aprobado_por = u.id_usuario
                LEFT JOIN DETALLE_PEDIDO dp ON p.id_pedido = dp.id_pedido
                GROUP BY p.id_pedido
                ORDER BY p.fecha_pedido DESC
            """)
            pedidos = cursor.fetchall()
        conn.close()
        return jsonify(pedidos), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@pedidos_bp.route("/<int:id_pedido>", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "ventas", "informatica")
def get_pedido(id_pedido):
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    p.id_pedido,
                    p.numero_pedido,
                    c.nombre_comercial AS cliente,
                    c.municipio_entrega,
                    tc.nombre AS tipo_cliente,
                    ep.nombre AS estado,
                    u.nombre_completo AS aprobado_por,
                    p.fecha_pedido,
                    p.fecha_aprobacion
                FROM PEDIDOS p
                JOIN CLIENTES c ON p.id_cliente = c.id_cliente
                JOIN TIPOS_CLIENTE tc ON c.id_tipo = tc.id_tipo
                JOIN ESTADOS_PEDIDO ep ON p.id_estado = ep.id_estado
                LEFT JOIN USUARIOS u ON p.id_aprobado_por = u.id_usuario
                WHERE p.id_pedido = %s
            """, (id_pedido,))
            pedido = cursor.fetchone()

            if not pedido:
                conn.close()
                return jsonify({"error": "Pedido no encontrado"}), 404

            cursor.execute("""
                SELECT 
                    dp.id_detalle,
                    pr.codigo,
                    pr.nombre AS producto,
                    pr.marca,
                    dp.cantidad,
                    dp.precio_unitario,
                    (dp.cantidad * dp.precio_unitario) AS subtotal
                FROM DETALLE_PEDIDO dp
                JOIN PRODUCTOS pr ON dp.id_producto = pr.id_producto
                WHERE dp.id_pedido = %s
            """, (id_pedido,))
            detalle = cursor.fetchall()
            pedido["detalle"] = detalle
        conn.close()
        return jsonify(pedido), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@pedidos_bp.route("/", methods=["POST"])
@require_roles("jefe_almacen", "ventas")
def crear_pedido():
    data = request.get_json()
    id_cliente = data.get("id_cliente")
    productos = data.get("productos", [])

    if not id_cliente or not productos:
        return jsonify({"error": "id_cliente y productos son requeridos"}), 400

    try:
        verify_jwt_in_request()
        claims = get_jwt()
        id_usuario = int(claims.get("sub"))

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT c.id_cliente, c.id_tipo, c.id_estado, ec.nombre AS estado_cliente,
                       tc.nombre AS tipo_cliente, tc.dias_credito
                FROM CLIENTES c
                JOIN TIPOS_CLIENTE tc ON c.id_tipo = tc.id_tipo
                JOIN ESTADOS_CLIENTE ec ON c.id_estado = ec.id_estado
                WHERE c.id_cliente = %s
            """, (id_cliente,))
            cliente = cursor.fetchone()

            if not cliente:
                conn.close()
                return jsonify({"error": "Cliente no encontrado"}), 404

            if cliente["estado_cliente"] == "Bloqueado":
                conn.close()
                return jsonify({"error": "Cliente bloqueado por mora, no puede realizar pedidos"}), 403

            cursor.execute("SELECT COUNT(*) AS total FROM PEDIDOS")
            count = cursor.fetchone()["total"]
            numero_pedido = f"PED-2026-{str(count + 1).zfill(3)}"

            id_estado_inicial = 1
            if cliente["tipo_cliente"] == "Tipo A - Estratégico":
                id_estado_inicial = 2
                id_aprobado_por = id_usuario
                fecha_aprobacion = "NOW()"
            else:
                id_aprobado_por = None
                fecha_aprobacion = None

            cursor.execute("""
                INSERT INTO PEDIDOS (numero_pedido, id_cliente, id_estado, id_aprobado_por, fecha_pedido, fecha_aprobacion)
                VALUES (%s, %s, %s, %s, CURDATE(), %s)
            """, (numero_pedido, id_cliente, id_estado_inicial, id_aprobado_por,
                  None if not fecha_aprobacion else cursor.connection.escape("NOW()")))

            id_pedido = cursor.lastrowid

            for item in productos:
                cursor.execute("""
                    SELECT precio_unitario FROM PRODUCTOS WHERE id_producto = %s
                """, (item["id_producto"],))
                prod = cursor.fetchone()
                if not prod:
                    conn.rollback()
                    conn.close()
                    return jsonify({"error": f"Producto {item['id_producto']} no encontrado"}), 404

                cursor.execute("""
                    INSERT INTO DETALLE_PEDIDO (id_pedido, id_producto, cantidad, precio_unitario)
                    VALUES (%s, %s, %s, %s)
                """, (id_pedido, item["id_producto"], item["cantidad"], prod["precio_unitario"]))

            conn.commit()
        conn.close()
        return jsonify({
            "mensaje": "Pedido creado correctamente",
            "numero_pedido": numero_pedido,
            "id_pedido": id_pedido
        }), 201

    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@pedidos_bp.route("/<int:id_pedido>/aprobar", methods=["PUT"])
@require_roles("jefe_almacen", "admin")
def aprobar_pedido(id_pedido):
    try:
        verify_jwt_in_request()
        claims = get_jwt()
        id_usuario = int(claims.get("sub"))

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_estado FROM PEDIDOS WHERE id_pedido = %s", (id_pedido,)
            )
            pedido = cursor.fetchone()
            if not pedido:
                conn.close()
                return jsonify({"error": "Pedido no encontrado"}), 404
            if pedido["id_estado"] != 1:
                conn.close()
                return jsonify({"error": "Solo se pueden aprobar pedidos en estado Pendiente"}), 400

            cursor.execute("""
                UPDATE PEDIDOS 
                SET id_estado = 2, id_aprobado_por = %s, fecha_aprobacion = NOW()
                WHERE id_pedido = %s
            """, (id_usuario, id_pedido))
            conn.commit()
        conn.close()
        return jsonify({"mensaje": "Pedido aprobado correctamente"}), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@pedidos_bp.route("/<int:id_pedido>/estado", methods=["PUT"])
@require_roles("jefe_almacen", "almacen", "flota")
def actualizar_estado(id_pedido):
    data = request.get_json()
    nuevo_estado = data.get("id_estado")

    if not nuevo_estado:
        return jsonify({"error": "id_estado es requerido"}), 400

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

            cursor.execute(
                "UPDATE PEDIDOS SET id_estado = %s WHERE id_pedido = %s",
                (nuevo_estado, id_pedido)
            )
            conn.commit()
        conn.close()
        return jsonify({"mensaje": "Estado actualizado correctamente"}), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500