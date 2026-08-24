import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ===============================
# DATABASE CONFIG
# ===============================
DB_CONFIG = {
    'host': os.getenv('MYSQLHOST', 'localhost'),
    'database': os.getenv('MYSQLDATABASE', 'cablevision_db'),
    'user': os.getenv('MYSQLUSER', 'root'),
    'password': os.getenv('MYSQLPASSWORD', ''),
    'port': int(os.getenv('MYSQLPORT', 3306))
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            print(f"[DB] Connected successfully to {DB_CONFIG['host']}:{DB_CONFIG['port']}")
            return connection
    except Error as e:
        print(f"[DB CONNECTION ERROR] {e}")
    return None

def update_database():
    """Update all image paths to Cloudinary URLs"""
    connection = get_db_connection()
    if not connection:
        print("[DB] Connection failed. Exiting.")
        return
    
    cursor = connection.cursor(dictionary=True)
    
    # ===============================
    # ✅ UPDATED LIST OF TABLES AND COLUMNS
    # ===============================
    tables_to_update = [
        # Plans
        {'table': 'plans', 'column': 'image_path'},
        
        # Advertisements - ✅ CORRECTED: file_path ang column
        {'table': 'advertisements', 'column': 'file_path'},
        
        # Announcements
        {'table': 'announcements', 'column': 'image_path'},
        
        # Channels
        {'table': 'channels', 'column': 'logo_path'},
        
        # Applications - ✅ DITO LANG ANG MAY MGA DOCUMENTS
        {'table': 'applications', 'column': 'profile_photo'},
        {'table': 'applications', 'column': 'id_front'},
        {'table': 'applications', 'column': 'id_back'},
        {'table': 'applications', 'column': 'proof_billing'},
        {'table': 'applications', 'column': 'signature'},
    ]
    
    total_updated = 0
    
    print("=" * 60)
    print("🔄 STARTING DATABASE UPDATE")
    print("=" * 60)
    
    for item in tables_to_update:
        table = item['table']
        column = item['column']
        
        print(f"\n📋 Checking {table}.{column}...")
        
        # Check if table exists
        cursor.execute("SHOW TABLES LIKE %s", (table,))
        if not cursor.fetchone():
            print(f"   ⚠️ Table '{table}' not found. Skipping.")
            continue
        
        # Check if column exists
        cursor.execute(f"SHOW COLUMNS FROM {table} LIKE %s", (column,))
        if not cursor.fetchone():
            print(f"   ⚠️ Column '{column}' not found in table '{table}'. Skipping.")
            continue
        
        # Count records to update
        cursor.execute(f"""
            SELECT COUNT(*) as count FROM {table}
            WHERE {column} LIKE '%shared-uploads%'
        """)
        count = cursor.fetchone()['count']
        
        if count == 0:
            print(f"   ℹ️ No records to update in {table}.{column}")
            continue
        
        print(f"   📊 Found {count} records to update")
        
        # Update paths - replace /shared-uploads/ with cablevision/
        cursor.execute(f"""
            UPDATE {table}
            SET {column} = REPLACE(
                REPLACE({column}, '/shared-uploads/', 'cablevision/'),
                'shared-uploads/', 'cablevision/'
            )
            WHERE {column} LIKE '%shared-uploads%'
        """)
        
        updated = cursor.rowcount
        total_updated += updated
        print(f"   ✅ Updated {updated} records in {table}.{column}")
    
    # Commit all changes
    connection.commit()
    cursor.close()
    connection.close()
    
    print("\n" + "=" * 60)
    print(f"🎉 DATABASE UPDATE COMPLETE!")
    print(f"   Total records updated: {total_updated}")
    print("=" * 60)

if __name__ == "__main__":
    update_database()