import os
import mysql.connector
from mysql.connector import Error

# ============================================================
# DATABASE CONFIGURATION
# Railway MySQL + Local XAMPP fallback
# ============================================================

DB_CONFIG = {
    "host": os.getenv("MYSQLHOST", "localhost"),
    "port": int(os.getenv("MYSQLPORT", "3306")),
    "database": os.getenv("MYSQLDATABASE", "cablevision_db"),
    "user": os.getenv("MYSQLUSER", "root"),
    "password": os.getenv("MYSQLPASSWORD", "")
}


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            database=DB_CONFIG["database"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            connection_timeout=10
        )

        if connection.is_connected():
            # Ensure all NOW()/CURRENT_TIMESTAMP calls use Philippine time
            cursor = connection.cursor()
            cursor.execute("SET time_zone = '+08:00'")
            cursor.close()

            print(
                f"[DB] Connected successfully "
                f"→ {DB_CONFIG['host']}:{DB_CONFIG['port']}"
            )
            return connection

    except Error as e:
        print(f"[DB CONNECTION ERROR] {e}")

    return None


# ============================================================
# UNIVERSAL QUERY EXECUTOR
# ============================================================

def execute_query(query, params=None, fetch=False, fetch_one=False):
    connection = get_db_connection()

    if not connection:
        print("[DB] Connection failed")
        return None

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)

        print("=" * 60)
        print("[QUERY]")
        print(query)
        print("[PARAMS]")
        print(params)

        if isinstance(params, list):
            params = tuple(params)

        cursor.execute(query, params or ())

        # ----------------------------------------------------
        # FETCH MANY
        # ----------------------------------------------------
        if fetch:
            result = cursor.fetchall()
            print(f"[FETCH] Found {len(result)} rows")
            return result

        # ----------------------------------------------------
        # FETCH ONE
        # ----------------------------------------------------
        if fetch_one:
            result = cursor.fetchone()
            print(
                f"[FETCH_ONE] Found "
                f"{'Yes' if result else 'No'}"
            )
            return result

        # ----------------------------------------------------
        # INSERT / UPDATE / DELETE
        # ----------------------------------------------------
        connection.commit()

        affected = cursor.rowcount

        print(f"[AFFECTED] {affected} rows affected")

        return affected

    except Error as e:
        print(f"[QUERY ERROR] {e}")
        print(f"[QUERY] {query}")
        print(f"[PARAMS] {params}")

        try:
            connection.rollback()
        except Exception:
            pass

        return None

    finally:
        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()
            print("[DB] Connection closed")