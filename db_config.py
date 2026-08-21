import mysql.connector
from mysql.connector import Error

# ===============================
# DATABASE CONFIG
# ===============================
DB_CONFIG = {
    'host': 'localhost',
    'database': 'cablevision_db',
    'user': 'root',
    'password': '',
    'port': 3306  # XAMPP default port (change ONLY if you really use 3307)
}

# ===============================
# CONNECTION
# ===============================
def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)

        if connection.is_connected():
            print("[DB] Connected successfully")
            return connection

    except Error as e:
        print(f"[DB CONNECTION ERROR] {e}")

    return None


# ===============================
# UNIVERSAL QUERY EXECUTOR - FIXED
# ===============================
def execute_query(query, params=None, fetch=False, fetch_one=False):
    connection = get_db_connection()

    if not connection:
        print("[DB] Connection failed")
        return None

    cursor = None
    try:
        cursor = connection.cursor(dictionary=True)

        # ✅ I-print ang query at params para sa debugging
        print(f"[QUERY] {query}")
        print(f"[PARAMS] {params}")

        # ✅ I-convert ang params sa tuple kung list
        if isinstance(params, list):
            params = tuple(params)

        cursor.execute(query, params or ())

        result = None

        if fetch:
            result = cursor.fetchall()
            print(f"[FETCH] Found {len(result) if result else 0} rows")

        elif fetch_one:
            result = cursor.fetchone()
            print(f"[FETCH_ONE] Found {'Yes' if result else 'No'}")

        else:
            # ✅ IMPORTANTE: I-COMMIT ANG CHANGES PARA SA INSERT/UPDATE/DELETE
            connection.commit()
            result = cursor.rowcount
            print(f"[AFFECTED] {result} rows affected")

        return result

    except Error as e:
        print(f"[QUERY ERROR] {e}")
        print(f"[QUERY] {query}")
        print(f"[PARAMS] {params}")
        if connection:
            connection.rollback()
        return None

    finally:
        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()
            print("[DB] Connection closed")