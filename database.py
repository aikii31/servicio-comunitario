import sqlite3
import os
import sys

DB_NAME = "embotelladora.db"

def obtener_ruta_db():
    """ 
    Garantiza que la base de datos se ubique en el directorio de ejecución real del usuario 
    y no en las carpetas temporales volátiles del ejecutable compilado.
    """
    if hasattr(sys, '_MEIPASS'):
        # Si corre como ejecutable, la base de datos se guarda en la carpeta donde está el .exe
        directorio_ejecucion = os.path.dirname(sys.executable)
        return os.path.join(directorio_ejecucion, DB_NAME)
    
    # En desarrollo local (.py), se crea en la raíz del proyecto
    return os.path.join(os.path.abspath("."), DB_NAME)

def init_db():
    ruta_final_db = obtener_ruta_db()
    conn = sqlite3.connect(ruta_final_db)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS productos (\
            id INTEGER PRIMARY KEY AUTOINCREMENT,\
            nombre TEXT NOT NULL,\
            tipo TEXT NOT NULL,\
            precio REAL NOT NULL,\
            stock INTEGER NOT NULL,\
            stock_minimo INTEGER NOT NULL DEFAULT 5\
        )\
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (\
            id INTEGER PRIMARY KEY AUTOINCREMENT,\
            username TEXT UNIQUE NOT NULL,\
            password TEXT NOT NULL,\
            rol TEXT NOT NULL DEFAULT 'empleado'\
        )\
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ventas (\
            id INTEGER PRIMARY KEY AUTOINCREMENT,\
            cliente_nombre TEXT NOT NULL,\
            fecha TEXT NOT NULL,\
            referencia_pago TEXT NOT NULL,\
            total REAL NOT NULL,\
            usuario TEXT NOT NULL DEFAULT 'FA',\
            estado TEXT NOT NULL DEFAULT 'ACTIVA'\
        )\
    ''')

    # Migración: asegurar columna `estado` en tablas existentes
    try:
        cursor.execute("SELECT estado FROM ventas LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE ventas ADD COLUMN estado TEXT NOT NULL DEFAULT 'ACTIVA'")


    cursor.execute('''
        CREATE TABLE IF NOT EXISTS detalle_ventas (\
            id INTEGER PRIMARY KEY AUTOINCREMENT,\
            venta_id INTEGER,\
            producto_id INTEGER,\
            cantidad INTEGER,\
            precio_unitario REAL,\
            FOREIGN KEY(venta_id) REFERENCES ventas(id),\
            FOREIGN KEY(producto_id) REFERENCES productos(id)\
        )\
    ''')
    
    # --- SE REMOVIÓ EL BLOQUE DE PRODUCTOS DE PRUEBA PARA INICIAR DESDE CERO ---
        
    # Mantener los usuarios base para poder iniciar sesión en el sistema limpio
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    if cursor.fetchone()[0] == 0:
        usuarios_iniciales = [
            ("Francisco Alarcón", "12345", "FA"),
            ("María Auxiliadora", "qwerty", "MA"),
            ("admin", "admin123", "ROOT")
        ]
        cursor.executemany(
            "INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)",
            usuarios_iniciales
        )
        
    conn.commit()
    conn.close()