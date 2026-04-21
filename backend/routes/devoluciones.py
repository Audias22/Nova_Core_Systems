from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from db import get_connection

devoluciones_bp = Blueprint("devoluciones", __name__)

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


@devoluciones_bp.route("/", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "ventas", "informatica")
def get_devoluciones():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    dv.id_devolucion,
                    dv.numero_caso,
                    p.numero_pedido,
                    c.nombre_comercial AS cliente,
                    ed.nombre AS estado,
                    u.nombre_completo AS responsable_ventas,
                    dv.fecha_reclamo,
                    dv.fecha_limite_reclamo,
                    dv.motivo,
                    dv.resolucion,
                    CASE
                        WHEN dv.fecha_reclamo <= dv.fecha_limite_reclamo THEN 'En plazo'
                        ELSE 'Fuera de plazo'
                    END AS plazo
                FROM DEVOLUCIONES dv
                JOIN DESPACHOS d ON dv.id_despacho = d.id_despacho
                JOIN PEDIDOS p ON d.id_pedido = p.id_pedido
                JOIN CLIENTES c ON p.id_cliente = c.id_cliente
                JOIN ESTADOS_DEVOLUCION ed ON dv.id_estado = ed.id_estado
                JOIN USUARIOS u ON dv.id_responsable_ventas = u.id_usuario
                ORDER BY dv.fecha_reclamo DESC
            """)
            devoluciones = cursor.fetchall()
        conn.close()
        return jsonify(devoluciones), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@devoluciones_bp.route("/<int:id_devolucion>", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "ventas", "informatica")
def get_devolucion(id_devolucion):
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    dv.id_devolucion,
                    dv.numero_caso,
                    p.numero_pedido,
                    c.nombre_comercial AS cliente,
                    c.contacto_principal,
                    ed.nombre AS estado,
                    u.nombre_completo AS responsable_ventas,
                    dv.fecha_reclamo,
                    dv.fecha_limite_reclamo,
                    dv.motivo,
                    dv.resolucion
                FROM DEVOLUCIONES dv
                JOIN DESPACHOS d ON dv.id_despacho = d.id_despacho
                JOIN PEDIDOS p ON d.id_pedido = p.id_pedido
                JOIN CLIENTES c ON p.id_cliente = c.id_cliente
                JOIN ESTADOS_DEVOLUCION ed ON dv.id_estado = ed.id_estado
                JOIN USUARIOS u ON dv.id_responsable_ventas = u.id_usuario
                WHERE dv.id_devolucion = %s
            """, (id_devolucion,))
            devolucion = cursor.fetchone()

            if not devolucion:
                conn.close()
                return jsonify({"error": "Devolución no encontrada"}), 404

            cursor.execute("""
                SELECT
                    dd.id_detalle_dev,
                    p.codigo,
                    p.nombre AS producto,
                    p.marca,
                    dd.cantidad,
                    dd.condicion,
                    dd.destino
                FROM DETALLE_DEVOLUCION dd
                JOIN PRODUCTOS p ON dd.id_producto = p.id_producto
                WHERE dd.id_devolucion = %s
            """, (id_devolucion,))
            devolucion["detalle"] = cursor.fetchall()

        conn.close()
        return jsonify(devolucion), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@devoluciones_bp.route("/", methods=["POST"])
@require_roles("jefe_almacen", "ventas")
def crear_devolucion():
    data = request.get_json()
    id_despacho = data.get("id_despacho")
    motivo = data.get("motivo")
    productos = data.get("productos", [])

    if not id_despacho or not motivo or not productos:
        return jsonify({"error": "id_despacho, motivo y productos son requeridos"}), 400

    try:
        verify_jwt_in_request()
        claims = get_jwt()
        id_usuario = int(claims.get("sub"))

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT d.id_despacho, d.fecha_entrega_real, d.id_estado
                FROM DESPACHOS d
                WHERE d.id_despacho = %s
            """, (id_despacho,))
            despacho = cursor.fetchone()

            if not despacho:
                conn.close()
                return jsonify({"error": "Despacho no encontrado"}), 404

            if not despacho["fecha_entrega_real"]:
                conn.close()
                return jsonify({"error": "El despacho aún no tiene entrega confirmada"}), 400

            cursor.execute(
                "SELECT id_devolucion FROM DEVOLUCIONES WHERE id_despacho = %s", (id_despacho,)
            )
            if cursor.fetchone():
                conn.close()
                return jsonify({"error": "Este despacho ya tiene una devolución registrada"}), 400

            cursor.execute("SELECT COUNT(*) AS total FROM DEVOLUCIONES")
            count = cursor.fetchone()["total"]
            numero_caso = f"DEV-2026-{str(count + 1).zfill(3)}"

            cursor.execute("""
                INSERT INTO DEVOLUCIONES 
                (numero_caso, id_despacho, id_estado, id_responsable_ventas, 
                 fecha_reclamo, fecha_limite_reclamo, motivo)
                VALUES (%s, %s, 1, %s, CURDATE(), 
                        DATE_ADD(%s, INTERVAL 7 DAY), %s)
            """, (numero_caso, id_despacho, id_usuario,
                  despacho["fecha_entrega_real"], motivo))

            id_devolucion = cursor.lastrowid

            for item in productos:
                id_producto = item.get("id_producto")
                cantidad = item.get("cantidad")
                condicion = item.get("condicion")
                destino = item.get("destino")

                if not all([id_producto, cantidad, condicion, destino]):
                    conn.rollback()
                    conn.close()
                    return jsonify({"error": "Cada producto requiere id_producto, cantidad, condicion y destino"}), 400

                cursor.execute("""
                    INSERT INTO DETALLE_DEVOLUCION (id_devolucion, id_producto, cantidad, condicion, destino)
                    VALUES (%s, %s, %s, %s, %s)
                """, (id_devolucion, id_producto, cantidad, condicion, destino))

                if destino == "Reingreso a inventario":
                    cursor.execute("""
                        SELECT cantidad_disponible FROM INVENTARIO WHERE id_producto = %s
                    """, (id_producto,))
                    inv = cursor.fetchone()
                    if inv:
                        cantidad_anterior = inv["cantidad_disponible"]
                        cantidad_nueva = cantidad_anterior + cantidad
                        cursor.execute("""
                            UPDATE INVENTARIO 
                            SET cantidad_disponible = %s, ultima_actualizacion = NOW()
                            WHERE id_producto = %s
                        """, (cantidad_nueva, id_producto))
                        cursor.execute("""
                            INSERT INTO MOVIMIENTOS_INVENTARIO
                            (id_producto, id_tipo, id_usuario, cantidad, cantidad_anterior, cantidad_nueva, referencia)
                            VALUES (%s, 4, %s, %s, %s, %s, %s)
                        """, (id_producto, id_usuario, cantidad,
                              cantidad_anterior, cantidad_nueva, numero_caso))

            conn.commit()
        conn.close()
        return jsonify({
            "mensaje": "Devolución registrada correctamente",
            "numero_caso": numero_caso,
            "id_devolucion": id_devolucion
        }), 201

    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@devoluciones_bp.route("/<int:id_devolucion>/resolver", methods=["PUT"])
@require_roles("jefe_almacen", "ventas")
def resolver_devolucion(id_devolucion):
    data = request.get_json()
    resolucion = data.get("resolucion")

    if not resolucion:
        return jsonify({"error": "resolucion es requerida"}), 400

    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_estado FROM DEVOLUCIONES WHERE id_devolucion = %s", (id_devolucion,)
            )
            dev = cursor.fetchone()
            if not dev:
                conn.close()
                return jsonify({"error": "Devolución no encontrada"}), 404
            if dev["id_estado"] == 3:
                conn.close()
                return jsonify({"error": "Esta devolución ya fue resuelta"}), 400

            cursor.execute("""
                UPDATE DEVOLUCIONES 
                SET id_estado = 3, resolucion = %s
                WHERE id_devolucion = %s
            """, (resolucion, id_devolucion))
            conn.commit()
        conn.close()
        return jsonify({"mensaje": "Devolución resuelta correctamente"}), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500