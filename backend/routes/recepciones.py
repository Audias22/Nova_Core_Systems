from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from db import get_connection

recepciones_bp = Blueprint("recepciones", __name__)

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


@recepciones_bp.route("/", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "compras", "informatica")
def get_recepciones():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    r.id_recepcion,
                    r.numero_recepcion,
                    pr.nombre AS proveedor,
                    pr.pais_origen,
                    er.nombre AS estado,
                    u.nombre_completo AS registrado_por,
                    r.fecha_recepcion,
                    COUNT(dr.id_detalle_rec) AS total_productos,
                    SUM(dr.cantidad_recibida) AS unidades_recibidas,
                    SUM(dr.cantidad_aprobada) AS unidades_aprobadas
                FROM RECEPCIONES r
                JOIN PROVEEDORES pr ON r.id_proveedor = pr.id_proveedor
                JOIN ESTADOS_RECEPCION er ON r.id_estado = er.id_estado
                JOIN USUARIOS u ON r.id_registrado_por = u.id_usuario
                LEFT JOIN DETALLE_RECEPCION dr ON r.id_recepcion = dr.id_recepcion
                GROUP BY r.id_recepcion
                ORDER BY r.fecha_recepcion DESC
            """)
            recepciones = cursor.fetchall()
        conn.close()
        return jsonify(recepciones), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@recepciones_bp.route("/<int:id_recepcion>", methods=["GET"])
@require_roles("jefe_almacen", "almacen", "admin", "compras", "informatica")
def get_recepcion(id_recepcion):
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    r.id_recepcion,
                    r.numero_recepcion,
                    pr.nombre AS proveedor,
                    pr.pais_origen,
                    pr.nombre_contacto,
                    er.nombre AS estado,
                    u.nombre_completo AS registrado_por,
                    r.fecha_recepcion
                FROM RECEPCIONES r
                JOIN PROVEEDORES pr ON r.id_proveedor = pr.id_proveedor
                JOIN ESTADOS_RECEPCION er ON r.id_estado = er.id_estado
                JOIN USUARIOS u ON r.id_registrado_por = u.id_usuario
                WHERE r.id_recepcion = %s
            """, (id_recepcion,))
            recepcion = cursor.fetchone()

            if not recepcion:
                conn.close()
                return jsonify({"error": "Recepción no encontrada"}), 404

            cursor.execute("""
                SELECT
                    dr.id_detalle_rec,
                    p.codigo,
                    p.nombre AS producto,
                    p.marca,
                    ei.nombre AS estado_inspeccion,
                    dr.cantidad_recibida,
                    dr.cantidad_aprobada,
                    dr.precio_compra,
                    (dr.cantidad_aprobada * dr.precio_compra) AS subtotal
                FROM DETALLE_RECEPCION dr
                JOIN PRODUCTOS p ON dr.id_producto = p.id_producto
                JOIN ESTADOS_INSPECCION ei ON dr.id_estado_inspeccion = ei.id_estado
                WHERE dr.id_recepcion = %s
            """, (id_recepcion,))
            detalle = cursor.fetchall()
            recepcion["detalle"] = detalle
        conn.close()
        return jsonify(recepcion), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@recepciones_bp.route("/", methods=["POST"])
@require_roles("jefe_almacen", "almacen", "compras")
def crear_recepcion():
    data = request.get_json()
    id_proveedor = data.get("id_proveedor")
    productos = data.get("productos", [])

    if not id_proveedor or not productos:
        return jsonify({"error": "id_proveedor y productos son requeridos"}), 400

    try:
        verify_jwt_in_request()
        claims = get_jwt()
        id_usuario = int(claims.get("sub"))

        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS total FROM RECEPCIONES")
            count = cursor.fetchone()["total"]
            numero_recepcion = f"REC-2026-{str(count + 1).zfill(3)}"

            cursor.execute("""
                INSERT INTO RECEPCIONES (numero_recepcion, id_proveedor, id_estado, id_registrado_por, fecha_recepcion)
                VALUES (%s, %s, 1, %s, CURDATE())
            """, (numero_recepcion, id_proveedor, id_usuario))
            id_recepcion = cursor.lastrowid

            for item in productos:
                id_producto = item.get("id_producto")
                cantidad_recibida = item.get("cantidad_recibida")
                cantidad_aprobada = item.get("cantidad_aprobada", cantidad_recibida)
                precio_compra = item.get("precio_compra")
                id_estado_inspeccion = item.get("id_estado_inspeccion", 1)

                if not all([id_producto, cantidad_recibida, precio_compra]):
                    conn.rollback()
                    conn.close()
                    return jsonify({"error": "Cada producto requiere id_producto, cantidad_recibida y precio_compra"}), 400

                cursor.execute("""
                    INSERT INTO DETALLE_RECEPCION 
                    (id_recepcion, id_producto, id_estado_inspeccion, cantidad_recibida, cantidad_aprobada, precio_compra)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (id_recepcion, id_producto, id_estado_inspeccion, cantidad_recibida, cantidad_aprobada, precio_compra))

                if id_estado_inspeccion == 1:
                    cursor.execute("""
                        UPDATE INVENTARIO 
                        SET cantidad_disponible = cantidad_disponible + %s,
                            ultima_actualizacion = NOW()
                        WHERE id_producto = %s
                    """, (cantidad_aprobada, id_producto))

                    cursor.execute("""
                        INSERT INTO MOVIMIENTOS_INVENTARIO
                        (id_producto, id_tipo, id_usuario, cantidad, cantidad_anterior, cantidad_nueva, referencia)
                        SELECT %s, 1, %s, %s, cantidad_disponible - %s, cantidad_disponible, %s
                        FROM INVENTARIO WHERE id_producto = %s
                    """, (id_producto, id_usuario, cantidad_aprobada, cantidad_aprobada, numero_recepcion, id_producto))

            conn.commit()
        conn.close()
        return jsonify({
            "mensaje": "Recepción registrada correctamente",
            "numero_recepcion": numero_recepcion,
            "id_recepcion": id_recepcion
        }), 201

    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500


@recepciones_bp.route("/<int:id_recepcion>/estado", methods=["PUT"])
@require_roles("jefe_almacen", "compras")
def actualizar_estado_recepcion(id_recepcion):
    data = request.get_json()
    nuevo_estado = data.get("id_estado")

    if not nuevo_estado:
        return jsonify({"error": "id_estado es requerido"}), 400

    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_recepcion FROM RECEPCIONES WHERE id_recepcion = %s", (id_recepcion,)
            )
            if not cursor.fetchone():
                conn.close()
                return jsonify({"error": "Recepción no encontrada"}), 404

            cursor.execute(
                "UPDATE RECEPCIONES SET id_estado = %s WHERE id_recepcion = %s",
                (nuevo_estado, id_recepcion)
            )
            conn.commit()
        conn.close()
        return jsonify({"mensaje": "Estado de recepción actualizado correctamente"}), 200
    except Exception as e:
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500