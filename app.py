import webview
import sqlite3
import os
import sys
from datetime import datetime
from database import init_db, obtener_ruta_db

# Función para resolver rutas dinámicas en producción (.exe) y desarrollo (.py)
def obtener_ruta_recurso(ruta_relativa):
    """ Obtiene la ruta absoluta para recursos estáticos, compatible con PyInstaller """
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, ruta_relativa)
    return os.path.join(os.path.abspath("."), ruta_relativa)

class ApiBackend:
    
    def get_productos(self):
        conn = sqlite3.connect(obtener_ruta_db())
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM productos")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def agregar_producto(self, nombre, tipo, precio, stock, stock_minimo):
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO productos (nombre, tipo, precio, stock, stock_minimo) VALUES (?, ?, ?, ?, ?)",
                (nombre, tipo, float(precio), int(stock), int(stock_minimo))
            )
            conn.commit()
            conn.close()
            return {"status": "success", "message": f"Producto '{nombre}' agregado exitosamente."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def editar_producto(self, id_prod, nombre, tipo, precio, stock, stock_minimo):
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE productos SET nombre=?, tipo=?, precio=?, stock=?, stock_minimo=? WHERE id=?",
                (nombre, tipo, float(precio), int(stock), int(stock_minimo), int(id_prod))
            )
            conn.commit()
            conn.close()
            return {"status": "success", "message": f"Producto ID [{id_prod}] actualizado."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def eliminar_producto(self, id_prod):
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            cursor = conn.cursor()
            cursor.execute("DELETE FROM productos WHERE id=?", (int(id_prod),))
            conn.commit()
            conn.close()
            return {"status": "success", "message": f"Producto ID [{id_prod}] eliminado."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def registrar_venta(self, cliente, total, metodo_pago, usuario, items):
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            cursor = conn.cursor()
            fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute(
                "INSERT INTO ventas (cliente_nombre, fecha, referencia_pago, total, usuario) VALUES (?, ?, ?, ?, ?)",
                (cliente, fecha_actual, metodo_pago, float(total), usuario)
            )
            venta_id = cursor.lastrowid

            for item in items:
                prod_id = int(item['producto_id'] if 'producto_id' in item else item['productoId'])
                cantidad = int(item['cantidad'])
                precio_u = float(item['precio_unitario'] if 'precio_unitario' in item else item['precioUnitario'])

                cursor.execute(
                    "INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
                    (venta_id, prod_id, cantidad, precio_u)
                )
                cursor.execute(
                    "UPDATE productos SET stock = stock - ? WHERE id = ?",
                    (cantidad, prod_id)
                )

            conn.commit()
            conn.close()
            return {"status": "success", "venta_id": venta_id, "message": f"Venta #{venta_id} procesada con éxito."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_ventas(self):
        """ Retorna todas las ventas de la base de datos por si la cancelas o por si estas estupido. """
        conn = sqlite3.connect(obtener_ruta_db())
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ventas ORDER BY fecha DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def anular_venta(self, id_venta):
        """por fin logre que al cancelar una venta aparezca en el historial del admin :D
        """
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            cursor = conn.cursor()

            # Revertir inventario
            cursor.execute(
                "SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = ?",
                (int(id_venta),)
            )
            items = cursor.fetchall()
            for prod_id, cantidad in items:
                cursor.execute(
                    "UPDATE productos SET stock = stock + ? WHERE id = ?",
                    (cantidad, prod_id)
                )

            # Marcar venta como anulada
            cursor.execute(
                "UPDATE ventas SET estado = 'ANULADA' WHERE id = ?",
                (int(id_venta),)
            )

            conn.commit()
            conn.close()
            return {"status": "success", "message": f"Venta #{id_venta} anulada exitosamente."}
        except Exception as e:
            return {"status": "error", "message": str(e)}


    def verificar_login(self, username, password):
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM usuarios WHERE LOWER(username) = LOWER(?) AND password = ?", (username.strip(), password.strip()))
            user = cursor.fetchone()
            conn.close()
            if user:
                return {"status": "success", "user": dict(user)}
            else:
                return {"status": "error", "message": "Credenciales inválidas."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_usuarios(self):
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT id, username, password, rol FROM usuarios")
            rows = cursor.fetchall()
            conn.close()
            return [dict(r) for r in rows]
        except Exception as e:
            return []

    def agregar_usuario(self, username, password, rol):
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)",
                (username, password, rol)
            )
            conn.commit()
            conn.close()
            return {"status": "success", "message": f"Usuario [{username}] registrado correctamente."}
        except sqlite3.IntegrityError:
            return {"status": "error", "message": "Ese nombre de operador ya está registrado."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def eliminar_usuario(self, username):
        if username.lower() == 'admin':
            return {"status": "error", "message": "No se puede eliminar la cuenta del Administrador Root primario."}
        try:
            conn = sqlite3.connect(obtener_ruta_db())
            cursor = conn.cursor()
            cursor.execute("DELETE FROM usuarios WHERE LOWER(username) = LOWER(?)", (username,))
            conn.commit()
            conn.close()
            return {"status": "success", "message": f"Operador [{username}] eliminado del sistema."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def set_password_usuario(self, username, nueva_password):
        """Cambia la contraseña de un usuario existente (ROOT/admin está protegido)."""
        try:
            username = (username or "").strip()
            nueva_password = (nueva_password or "").strip()

            if not username or not nueva_password:
                return {"status": "error", "message": "Usuario y contraseña son obligatorios."}

            if username.lower() == 'admin':
                return {"status": "error", "message": "No se puede modificar la cuenta del Administrador Root primario."}

            conn = sqlite3.connect(obtener_ruta_db())
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE usuarios SET password=? WHERE LOWER(username)=LOWER(?)",
                (nueva_password, username)
            )
            conn.commit()

            actualizado = cursor.rowcount
            conn.close()

            if actualizado == 0:
                return {"status": "error", "message": "No existe un usuario con ese nombre."}

            return {"status": "success", "message": f"Contraseña actualizada para [{username}]."}
        except Exception as e:
            return {"status": "error", "message": str(e)}




def main():
    init_db()
    api = ApiBackend()
    
    html_path = obtener_ruta_recurso('web/index.html')
    
    webview.create_window(
        title="Sistema de Gestión - Embotelladora de Agua",
        url=html_path,
        js_api=api,
        width=1000,
        height=700
    )
    webview.start()

if __name__ == '__main__':
    main()