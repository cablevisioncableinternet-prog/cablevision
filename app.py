from flask import Flask, request, jsonify, render_template, send_from_directory, make_response, session
from flask_cors import CORS
import requests
import random
import smtplib
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import re
from datetime import datetime, date
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from flask import send_file
import base64


# ========== ITO LANG ANG IDINAGDAG ==========
from db_config import execute_query
# ===========================================

app = Flask(__name__)

@app.after_request
def add_security_headers(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    return response

app.secret_key = "my_super_secure_random_key_12345"
CORS(app)

# ========== WALA NA ITO (TINANGGAL ANG FIREBASE) ==========
# cred = credentials.Certificate("cablevision-27a81-firebase-adminsdk-fbsvc-23f87c44c6.json")
# firebase_admin.initialize_app(cred, {"databaseURL": "https://cablevision-27a81-default-rtdb.firebaseio.com/"})
# =========================================================

SUPER_ADMIN_USERNAME = "super admin"
SUPER_ADMIN_PASSWORD = "cablevisioninternet"
FIREBASE_WEB_API_KEY = "YOUR_FIREBASE_WEB_API_KEY"

# ========== ITO ANG PUMALIT SA FIREBASE SUPERADMIN ==========
query = "SELECT * FROM superadmins WHERE username = %s"
existing = execute_query(query, (SUPER_ADMIN_USERNAME,), fetch_one=True)

if not existing:
    insert_query = """
        INSERT INTO superadmins (username, password, area, email, name) 
        VALUES (%s, %s, %s, %s, %s)
    """
    execute_query(insert_query, (SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD, "Main Office", "superadmin@cablevision.com", "System Administrator"))

# ===============================
# Serve Login Page
# ===============================
@app.route("/")
def index():
    """Render the login page"""
    return render_template("login.html")

# ===============================
# Serve Super Admin Dashboard
# ===============================
@app.route("/superadmin")
def superadmin_dashboard():
    return render_template("superadmin-dashboard.html")

# ===============================
# CREATE NOTIFICATION - SUPERADMIN (CONVERTED TO MYSQL)
# ===============================
@app.route("/api/superadmin/notifications", methods=["POST"])
def create_notification():
    """Create a new notification (called from admin side)"""
    try:
        data = request.json
        import time
        notification_id = int(time.time() * 1000)
        timestamp = datetime.now().isoformat()
        
        query = """
            INSERT INTO notifications (id, title, message, type, relatedId, timestamp, read_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            notification_id,
            data.get("title"),
            data.get("message"),
            data.get("type"),
            data.get("relatedId"),
            data.get("timestamp", timestamp),
            0  # read_status = 0 (unread)
        )
        
        execute_query(query, params)
        return jsonify({"message": "Notification created", "id": notification_id}), 201
        
    except Exception as e:
        print(f"Error creating notification: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/superadmin/notifications", methods=["GET"])
def get_notifications():
    """Get all notifications for superadmin"""
    try:
        query = """
            SELECT id, title, message, type, relatedId, timestamp, read_status
            FROM notifications 
            ORDER BY timestamp DESC
        """
        # Use fetch=True instead of fetch_all=True
        notifications_list = execute_query(query, fetch=True)
        
        if not notifications_list:
            return jsonify([])
        
        formatted = []
        for n in notifications_list:
            formatted.append({
                "id": n["id"],
                "title": n["title"],
                "message": n["message"],
                "type": n["type"] if n["type"] else "info",
                "relatedId": n["relatedId"],
                "timestamp": n["timestamp"],
                "read": n["read_status"] == 1
            })
        
        return jsonify(formatted)
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify([])




# ===============================
# MARK NOTIFICATION AS READ - SUPERADMIN (CONVERTED TO MYSQL)
# ===============================
@app.route("/api/superadmin/notifications/<int:notification_id>/read", methods=["PUT"])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        query = "UPDATE notifications SET read_status = 1 WHERE id = %s"
        execute_query(query, (notification_id,))
        return jsonify({"message": "Notification marked as read"})
        
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# MARK ALL NOTIFICATIONS AS READ - SUPERADMIN (CONVERTED TO MYSQL)
# ===============================
@app.route("/api/superadmin/notifications/read-all", methods=["PUT"])
def mark_all_notifications_read():
    """Mark all notifications as read"""
    try:
        query = "UPDATE notifications SET read_status = 1"
        execute_query(query)
        return jsonify({"message": "All notifications marked as read"})
        
    except Exception as e:
        print(f"Error marking all notifications as read: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# DELETE NOTIFICATION - SUPERADMIN (OPTIONAL)
# ===============================
@app.route("/api/superadmin/notifications/<int:notification_id>", methods=["DELETE"])
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        query = "DELETE FROM notifications WHERE id = %s"
        execute_query(query, (notification_id,))
        return jsonify({"message": "Notification deleted"})
        
    except Exception as e:
        print(f"Error deleting notification: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# GET UNREAD NOTIFICATION COUNT ONLY - SUPERADMIN
# ===============================
@app.route("/api/superadmin/notifications/unread/count", methods=["GET"])
def get_unread_notification_count():
    """Get only the unread notification count"""
    try:
        query = "SELECT COUNT(*) as unread_count FROM notifications WHERE read_status = 0"
        result = execute_query(query, fetch_one=True)
        unread_count = result['unread_count'] if result else 0
        return jsonify({"unread_count": unread_count})
        
    except Exception as e:
        print(f"Error getting unread count: {e}")
        return jsonify({"unread_count": 0})
    

# ===============================
# LOGIN API - CONVERTED TO MYSQL
# ===============================
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Missing credentials"}), 400

    try:
        # ========== CHECK SUPER ADMIN FROM MYSQL ==========
        query = "SELECT * FROM superadmins WHERE username = %s"
        superadmin = execute_query(query, (username,), fetch_one=True)
        
        if superadmin and superadmin.get('password') == password:
            # Store superadmin info in session
            session['admin_id'] = superadmin.get('username')
            session['admin_username'] = superadmin.get('username')
            session['admin_type'] = 'superadmin'
            session['admin_area'] = superadmin.get('area', 'All Areas')
            session['admin_city'] = superadmin.get('area', 'All Areas')
            
            print(f"[LOGIN] Superadmin {username} logged in from MySQL")
            
            return jsonify({
                "message": "Login successful",
                "type": "superadmin",
                "email": superadmin.get('email', ''),
                "area": superadmin.get('area', 'All Areas'),
                "id": superadmin.get('username'),
                "username": superadmin.get('username'),
                "name": superadmin.get('name', '')
            })
        
        # ========== FALLBACK: CHECK HARDCODED SUPER ADMIN ==========
        if username == SUPER_ADMIN_USERNAME and password == SUPER_ADMIN_PASSWORD:
            # Check if superadmin exists in MySQL
            query = "SELECT * FROM superadmins WHERE username = %s"
            existing = execute_query(query, (SUPER_ADMIN_USERNAME,), fetch_one=True)
            
            if existing:
                email = existing.get('email', '')
                area = existing.get('area', 'Sta. Cruz')
            else:
                email = "emmanuelarticona3@gmail.com"
                area = "Sta. Cruz"
                # Create superadmin if not exists
                insert_query = """
                    INSERT INTO superadmins (username, password, area, email, name) 
                    VALUES (%s, %s, %s, %s, %s)
                """
                execute_query(insert_query, (SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD, area, email, "System Administrator"))
            
            session['admin_id'] = SUPER_ADMIN_USERNAME
            session['admin_username'] = SUPER_ADMIN_USERNAME
            session['admin_type'] = 'superadmin'
            session['admin_area'] = area
            session['admin_city'] = area
            
            return jsonify({
                "message": "Login successful",
                "type": "superadmin",
                "email": email,
                "area": area,
                "id": SUPER_ADMIN_USERNAME,
                "username": SUPER_ADMIN_USERNAME
            })

        # ========== REGULAR ADMIN LOGIN FROM MYSQL ==========
        query = "SELECT * FROM admins WHERE username = %s OR email = %s OR admin_id = %s"
        admin_data = execute_query(query, (username, username, username), fetch_one=True)

        if not admin_data:
            return jsonify({"error": "Unauthorized account"}), 403

        # Compare password
        if admin_data.get('password') != password:
            return jsonify({"error": "Invalid password"}), 401

        # Prevent deactivated admin from logging in
        if admin_data.get('status') == "Deactivated":
            return jsonify({"error": "Account is deactivated. Contact Super Admin."}), 403

        # Store admin info in session
        session['admin_id'] = admin_data.get('admin_id')
        session['admin_username'] = admin_data.get('username')
        session['admin_type'] = 'admin'
        session['admin_area'] = admin_data.get('area', '')
        session['admin_city'] = admin_data.get('area', '')

        return jsonify({
            "message": "Login successful",
            "type": "admin",
            "username": admin_data.get('username'),
            "area": admin_data.get('area', ''),
            "city": admin_data.get('area', ''),
            "status": admin_data.get('status', 'Active'),
            "id": admin_data.get('admin_id')
        })

    except Exception as e:
        print("Login error:", e)
        return jsonify({"error": "Not Registered Account", "details": str(e)}), 500

# ===============================
# SEND OTP EMAIL (NO CHANGES NEEDED)
# ===============================
def send_otp_email(to_email, otp_code, is_superadmin=False):
    gmail_user = "cablevision.cableinternet@gmail.com"
    gmail_app_password = "svql qzea vmjt xndx"

    admin_type = "Super Admin" if is_superadmin else "Admin"
    subject = f"CableVision {admin_type} Password Reset OTP"
    
    plain_body = f"Hello {admin_type}! Your OTP code is: {otp_code}"
    
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f0f4f8; padding: 20px;">
            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; max-width: 500px; margin: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #003d73;">CableVision - {admin_type} Password Reset</h2>
                <p>Hello {admin_type},</p>
                <p>Your One-Time Password (OTP) for password reset is:</p>
                <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #001f3f;">{otp_code}</p>
                <p>This code expires in 5 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
                <hr>
                <p style="font-size: 12px; color: #666;">&copy; 2026 CableVision Systems Corp. All rights reserved.</p>
            </div>
        </body>
    </html>
    """

    msg = MIMEMultipart('alternative')
    msg['From'] = gmail_user
    msg['To'] = to_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(plain_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(gmail_user, gmail_app_password)
        server.send_message(msg)
        server.quit()
        print(f"OTP sent successfully to {to_email} for {admin_type}")
        return True
    except Exception as e:
        print("Error sending OTP:", e)
        return False

# ===============================
# FORGOT PASSWORD - CONVERTED TO MYSQL
# ===============================
@app.route("/api/admin/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    identifier = data.get("identifier")
    if not identifier:
        return jsonify({"error": "Identifier required"}), 400

    # ========== CHECK SUPERADMINS TABLE FIRST ==========
    query = "SELECT * FROM superadmins WHERE username = %s OR email = %s"
    superadmin = execute_query(query, (identifier, identifier), fetch_one=True)
    
    if superadmin:
        email = superadmin.get('email')
        username = superadmin.get('username')
        user_type = "superadmin"
        area = superadmin.get('area', 'All Areas')
        
        # Generate OTP
        otp_code = str(random.randint(100000, 999999))
        expiry = datetime.now().timestamp() + 300  # 5 minutes
        
        # Store OTP in temp_reset table
        insert_query = """
            INSERT INTO temp_reset (email, otp, expiry, user_type, area, username)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        execute_query(insert_query, (email, otp_code, expiry, user_type, area, username))
        
        # Send email
        if not send_otp_email(email, otp_code, is_superadmin=True):
            return jsonify({"error": "Failed to send OTP"}), 500
        
        return jsonify({
            "message": "OTP sent successfully", 
            "username": username,
            "type": user_type
        })

    # ========== CHECK REGULAR ADMINS TABLE ==========
    query = """
        SELECT * FROM admins 
        WHERE username = %s OR email = %s OR admin_id = %s
    """
    admin = execute_query(query, (identifier, identifier, identifier), fetch_one=True)

    if not admin:
        return jsonify({"error": "Admin not found"}), 404

    username = admin.get('username')
    email = admin.get('email')
    
    # Generate OTP
    otp_code = str(random.randint(100000, 999999))
    expiry = datetime.now().timestamp() + 300  # 5 minutes
    
    # Store OTP in temp_reset table
    insert_query = """
        INSERT INTO temp_reset (email, otp, expiry, user_type, area, username)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    execute_query(insert_query, (email, otp_code, expiry, 'admin', admin.get('area', ''), username))

    # Send email
    if not send_otp_email(email, otp_code, is_superadmin=False):
        return jsonify({"error": "Failed to send OTP"}), 500

    return jsonify({"message": "OTP sent successfully", "username": username, "type": "admin"})

# ===============================
# RESET PASSWORD - CONVERTED TO MYSQL
# ===============================
@app.route("/api/admin/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    username = data.get("username")
    code = data.get("code")
    new_password = data.get("new_password")

    print(f"🔍 RESET PASSWORD DEBUG:")
    print(f"   Username: {username}")
    print(f"   Code: {code}")
    print(f"   New Password: {new_password[:3]}...")

    if not username or not code or not new_password:
        return jsonify({"error": "All fields are required"}), 400

    # Check temp_reset table
    query = """
        SELECT * FROM temp_reset 
        WHERE username = %s AND otp = %s
        ORDER BY expiry DESC LIMIT 1
    """
    temp_data = execute_query(query, (username, code), fetch_one=True)
    
    print(f"🔍 Temp data found: {temp_data}")
    
    if not temp_data:
        return jsonify({"error": "Invalid verification code"}), 400
    
    # Check if OTP expired
    current_time = datetime.now().timestamp()
    expiry_time = temp_data.get('expiry', 0)
    
    print(f"🔍 Current time: {current_time}")
    print(f"🔍 Expiry time: {expiry_time}")
    
    if current_time > expiry_time:
        execute_query("DELETE FROM temp_reset WHERE id = %s", (temp_data.get('id'),))
        return jsonify({"error": "Verification code expired"}), 400
    
    user_type = temp_data.get('user_type')
    area = temp_data.get('area', '')
    actual_username = temp_data.get('username')  # Use username from temp_reset
    
    print(f"🔍 User type: {user_type}")
    print(f"🔍 Actual username from temp: {actual_username}")
    
    # Update password based on user type
    if user_type == "superadmin":
        update_query = "UPDATE superadmins SET password = %s WHERE username = %s"
        execute_query(update_query, (new_password, actual_username))
        print(f"✅ Superadmin password updated for {actual_username}")
    else:
        update_query = "UPDATE admins SET password = %s WHERE username = %s"
        execute_query(update_query, (new_password, actual_username))
        print(f"✅ Admin password updated for {actual_username}")
    
    # Delete temporary reset data
    execute_query("DELETE FROM temp_reset WHERE username = %s", (actual_username,))
    
    return jsonify({
        "message": "Password updated successfully",
        "username": actual_username,
        "type": user_type,
        "area": area
    }), 200

# ===============================
# My Admins Page
# ===============================
@app.route("/superadmin/admins")
def superadmin_admins():
    return render_template("superadmin-admins.html")

# ===============================
# HELPER FUNCTION: Generate Next Admin ID
# ===============================
def generate_next_admin_id():
    """Generate the next available admin ID (ACV-XXXX format)"""
    try:
        # Get all admin IDs from MySQL
        query = "SELECT admin_id FROM admins WHERE admin_id LIKE 'ACV-%'"
        results = execute_query(query, fetch=True) or []
        
        # Extract numbers from existing IDs
        existing_numbers = set()
        for row in results:
            admin_id = row.get('admin_id', '')
            if admin_id.startswith("ACV-"):
                try:
                    num = int(admin_id.split("-")[1])
                    existing_numbers.add(num)
                except:
                    pass
        
        # Find the smallest missing number starting from 1
        next_number = 1
        while next_number in existing_numbers:
            next_number += 1
        
        # Generate admin ID with zero-padded 4 digits
        admin_id = f"ACV-{str(next_number).zfill(4)}"
        print(f"✨ Generated new admin ID: {admin_id}")
        return admin_id
        
    except Exception as e:
        print(f"Error generating admin ID: {e}")
        return f"ACV-{int(datetime.now().timestamp())}"

# ===============================
# CREATE ADMIN (Super Admin Only) - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/admins", methods=["POST"])
def create_admin():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    area = data.get("area")

    print(f"📝 Received - Username: {username}, Email: {email}, Area: {area}")

    if not username or not email or not area:
        return jsonify({"error": "All fields are required"}), 400

    # USERNAME VALIDATION
    username_pattern = re.compile(r"^[a-zA-Z0-9_-]{4,20}$")
    if not username_pattern.match(username):
        return jsonify({"error": "Invalid username. Use 4-20 characters (letters, numbers, _, -)"}), 400

    # EMAIL VALIDATION
    email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    if not email_pattern.match(email):
        return jsonify({"error": "Invalid email address"}), 400

    try:
        # Check for duplicate username or email in MySQL
        check_query = """
            SELECT username, email FROM admins 
            WHERE username = %s OR email = %s
        """
        existing = execute_query(check_query, (username, email), fetch_one=True)
        
        if existing:
            if existing.get('username') == username:
                return jsonify({"error": "Username already exists"}), 400
            if existing.get('email') == email:
                return jsonify({"error": "Email already exists"}), 400

        # Generate next available Admin ID
        admin_id = generate_next_admin_id()
        default_password = "123456"
        created_at = datetime.now().isoformat()

        # Insert into MySQL
        insert_query = """
            INSERT INTO admins 
            (admin_id, username, email, password, area, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            admin_id,
            username,
            email,
            default_password,
            area,
            "Active",
            created_at
        )
        
        execute_query(insert_query, params)
        
        print(f"✅ Admin saved successfully: {admin_id}")
        
        # Send email (with plain password, not hashed)
        try:
            send_admin_email(email, admin_id, username, default_password)
        except Exception as e:
            print(f"⚠️ Email error but admin was created: {e}")

        return jsonify({
            "message": "Admin created successfully",
            "admin_id": admin_id
        }), 201

    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ===============================
# SEND ADMIN EMAIL (NO CHANGES NEEDED)
# ===============================
def send_admin_email(to_email, admin_id, username, password):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    sender_email = "cablevision.cableinternet@gmail.com"
    sender_app_password = "svql qzea vmjt xndx"
    subject = "Your Admin Account - CableVision"

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f0f4f8; padding: 20px;">
            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; max-width: 500px; margin: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #003d73;">CableVision Admin Account</h2>
                <p>Hello,</p>
                <p>Your administrator account has been successfully created.</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <p><strong>Admin ID:</strong> {admin_id}</p>
                    <p><strong>Username:</strong> {username}</p>
                    <p><strong>Password:</strong> {password}</p>
                </div>
                <p style="color:#c0392b; font-weight: bold;">⚠️ Please change your password after your first login.</p>
                <hr>
                <p style="font-size: 12px; color: #666;">&copy; 2026 CableVision Systems Corp. All rights reserved.</p>
            </div>
        </body>
    </html>
    """

    plain_body = f"""
    CableVision Admin Account

    Your admin account has been created.

    Admin ID: {admin_id}
    Username: {username}
    Password: {password}

    Please change your password after login.
    """

    msg = MIMEMultipart('alternative')
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(plain_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(sender_email, sender_app_password)
        server.send_message(msg)
        server.quit()
        print(f"✅ Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False

# ===============================
# LIST ALL ADMINS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/admins", methods=["GET"])
def list_admins():
    try:
        query = """
            SELECT admin_id, username, email, area, status, created_at
            FROM admins 
            ORDER BY admin_id
        """
        admins_list = execute_query(query, fetch=True) or []
        
        print(f"📋 Listing {len(admins_list)} admins")
        return jsonify(admins_list)
        
    except Exception as e:
        print(f"Error listing admins: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# GET SINGLE ADMIN BY ID - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/admins/<admin_id>", methods=["GET"])
def get_admin(admin_id):
    try:
        query = """
            SELECT admin_id, username, email, area, status, created_at
            FROM admins 
            WHERE admin_id = %s
        """
        admin_data = execute_query(query, (admin_id,), fetch_one=True)
        
        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404
        
        # Don't return password for security
        if 'password' in admin_data:
            del admin_data['password']
        
        return jsonify(admin_data)
        
    except Exception as e:
        print(f"Error getting admin: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# UPDATE ADMIN (PUT) - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/admins/<admin_id>", methods=["PUT"])
def update_admin(admin_id):
    try:
        data = request.json
        username = data.get("username")
        email = data.get("email")
        area = data.get("area")
        
        # Check if admin exists
        check_query = "SELECT admin_id FROM admins WHERE admin_id = %s"
        exists = execute_query(check_query, (admin_id,), fetch_one=True)
        
        if not exists:
            return jsonify({"error": "Admin not found"}), 404
        
        # Check for duplicate username/email (excluding current admin)
        duplicate_query = """
            SELECT username, email FROM admins 
            WHERE (username = %s OR email = %s) AND admin_id != %s
        """
        duplicate = execute_query(duplicate_query, (username, email, admin_id), fetch_one=True)
        
        if duplicate:
            if duplicate.get('username') == username:
                return jsonify({"error": "Username already exists"}), 400
            if duplicate.get('email') == email:
                return jsonify({"error": "Email already exists"}), 400
        
        # Update admin
        update_query = """
            UPDATE admins 
            SET username = %s, email = %s, area = %s
            WHERE admin_id = %s
        """
        execute_query(update_query, (username, email, area, admin_id))
        
        return jsonify({"message": "Admin updated successfully"})
        
    except Exception as e:
        print(f"Error updating admin: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# DELETE ADMIN BY ID - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/admins/<admin_id>", methods=["DELETE"])
def delete_admin(admin_id):
    try:
        print(f"🗑️ Attempting to delete admin with ID: {admin_id}")
        
        # Get admin info first (for logging)
        get_query = "SELECT username, email FROM admins WHERE admin_id = %s"
        admin_data = execute_query(get_query, (admin_id,), fetch_one=True)
        
        if not admin_data:
            print(f"❌ Admin not found with ID: {admin_id}")
            return jsonify({"error": "Admin not found"}), 404
        
        username = admin_data.get("username")
        print(f"📝 Found admin: {username} (ID: {admin_id})")
        
        # Delete from MySQL
        delete_query = "DELETE FROM admins WHERE admin_id = %s"
        execute_query(delete_query, (admin_id,))
        
        print(f"✅ Admin '{username}' (ID: {admin_id}) deleted successfully")
        return jsonify({"message": f"Admin '{username}' deleted successfully"})
        
    except Exception as e:
        print(f"Error deleting admin: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# UPDATE ADMIN STATUS BY ID - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/admins/<admin_id>/status", methods=["POST"])
def update_admin_status(admin_id):
    try:
        data = request.get_json()
        new_status = data.get("status")
        
        print(f"🔄 Updating admin {admin_id} status to: {new_status}")
        
        if new_status not in ["Active", "Deactivated"]:
            return jsonify({"error": "Invalid status. Use 'Active' or 'Deactivated'"}), 400
        
        # Check if admin exists
        check_query = "SELECT username FROM admins WHERE admin_id = %s"
        admin_data = execute_query(check_query, (admin_id,), fetch_one=True)
        
        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404
        
        # Update status
        update_query = "UPDATE admins SET status = %s WHERE admin_id = %s"
        execute_query(update_query, (new_status, admin_id))
        
        username = admin_data.get("username")
        print(f"✅ Admin '{username}' status updated to {new_status}")
        return jsonify({"message": f"Admin '{username}' status updated to {new_status}"})
        
    except Exception as e:
        print(f"Error updating status: {e}")
        return jsonify({"error": str(e)}), 500
    

# =========================
# ADD AREA PAGE
# =========================
@app.route("/superadmin/area")
def superadmin_area():
    return render_template("superadmin-area.html")

# =========================
# ADD AREA (WITH DUPLICATE VALIDATION + ZIP) - CONVERTED TO MYSQL
# =========================
@app.route("/api/superadmin/area", methods=["POST"])
def add_area():
    data = request.json

    province = data.get("province")
    city = data.get("city")
    barangay = data.get("barangay")
    zip_code = data.get("zip_code")

    # VALIDATION
    if not province or not city or not barangay or not zip_code:
        return jsonify({"error": "Missing fields"}), 400

    # FORMAT (para consistent)
    province = province.upper().strip()
    city = city.upper().strip()
    barangay = barangay.upper().strip()
    zip_code = str(zip_code).strip()

    try:
        # CHECK DUPLICATE (same province + city + barangay)
        check_query = """
            SELECT id FROM areas 
            WHERE province = %s AND city = %s AND barangay = %s
        """
        existing = execute_query(check_query, (province, city, barangay), fetch_one=True)
        
        if existing:
            return jsonify({
                "error": "Duplicate area already exists",
                "duplicate": True,
                "existing_id": existing['id']
            }), 409

        # INSERT INTO MYSQL
        insert_query = """
            INSERT INTO areas (province, city, barangay, zip, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """
        area_id = execute_query(insert_query, (province, city, barangay, zip_code))
        
        return jsonify({
            "success": True,
            "id": area_id,
            "message": "Area added successfully"
        })

    except Exception as e:
        print(f"Error adding area: {e}")
        return jsonify({"error": str(e)}), 500

# =========================
# GET AREAS - CONVERTED TO MYSQL
# =========================
@app.route("/api/superadmin/areas")
def get_areas():
    try:
        query = """
            SELECT id, province, city, barangay, zip, created_at
            FROM areas 
            ORDER BY province, city, barangay
        """
        areas = execute_query(query, fetch=True) or []
        
        # Format response to match frontend expectations
        result = []
        for area in areas:
            result.append({
                "id": area['id'],
                "province": area['province'],
                "city": area['city'],
                "barangay": area['barangay'],
                "zip": area.get('zip', ''),
                "created_at": area.get('created_at', '')
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting areas: {e}")
        return jsonify({"error": str(e)}), 500

# =========================
# DELETE AREA - CONVERTED TO MYSQL
# =========================
@app.route("/api/superadmin/area/<int:area_id>", methods=["DELETE"])
def delete_area(area_id):
    try:
        # Check if area exists before deleting
        check_query = "SELECT id, city, barangay FROM areas WHERE id = %s"
        area = execute_query(check_query, (area_id,), fetch_one=True)
        
        if not area:
            return jsonify({"error": "Area not found"}), 404
        
        # Delete from MySQL
        delete_query = "DELETE FROM areas WHERE id = %s"
        execute_query(delete_query, (area_id,))
        
        return jsonify({
            "success": True, 
            "message": f"Area '{area['barangay']}, {area['city']}' deleted successfully"
        })
        
    except Exception as e:
        print(f"Error deleting area: {e}")
        return jsonify({"error": str(e)}), 500

# =========================
# UPDATE AREA - NEW ENDPOINT
# =========================
@app.route("/api/superadmin/area/<int:area_id>", methods=["PUT"])
def update_area(area_id):
    data = request.json
    
    province = data.get("province")
    city = data.get("city")
    barangay = data.get("barangay")
    zip_code = data.get("zip_code")
    
    if not province or not city or not barangay:
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # Check if area exists
        check_query = "SELECT id FROM areas WHERE id = %s"
        exists = execute_query(check_query, (area_id,), fetch_one=True)
        
        if not exists:
            return jsonify({"error": "Area not found"}), 404
        
        # Check for duplicate (excluding current area)
        duplicate_query = """
            SELECT id FROM areas 
            WHERE province = %s AND city = %s AND barangay = %s AND id != %s
        """
        duplicate = execute_query(duplicate_query, (province, city, barangay, area_id), fetch_one=True)
        
        if duplicate:
            return jsonify({"error": "Duplicate area already exists"}), 409
        
        # Update area
        update_query = """
            UPDATE areas 
            SET province = %s, city = %s, barangay = %s, zip = %s
            WHERE id = %s
        """
        execute_query(update_query, (province, city, barangay, zip_code, area_id))
        
        return jsonify({
            "success": True,
            "message": "Area updated successfully"
        })
        
    except Exception as e:
        print(f"Error updating area: {e}")
        return jsonify({"error": str(e)}), 500

# =========================
# BULK ADD AREAS (with duplicate handling) - CONVERTED TO MYSQL
# =========================
@app.route("/api/superadmin/areas/bulk", methods=["POST"])
def add_areas_bulk():
    data = request.json
    areas_to_add = data.get("areas", [])
    
    if not areas_to_add:
        return jsonify({"error": "No areas provided"}), 400
    
    added = []
    duplicates = []
    failed = []
    
    for area in areas_to_add:
        province = area.get("province", "").upper().strip()
        city = area.get("city", "").upper().strip()
        barangay = area.get("barangay", "").upper().strip()
        zip_code = area.get("zip", "").strip()
        
        if not province or not city or not barangay:
            failed.append({"area": area, "reason": "Missing fields"})
            continue
        
        try:
            # Check for duplicate
            check_query = """
                SELECT id FROM areas 
                WHERE province = %s AND city = %s AND barangay = %s
            """
            existing = execute_query(check_query, (province, city, barangay), fetch_one=True)
            
            if existing:
                duplicates.append({
                    "province": province, 
                    "city": city, 
                    "barangay": barangay
                })
            else:
                # Insert new area
                insert_query = """
                    INSERT INTO areas (province, city, barangay, zip, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                """
                area_id = execute_query(insert_query, (province, city, barangay, zip_code))
                added.append({
                    "id": area_id, 
                    "province": province, 
                    "city": city, 
                    "barangay": barangay
                })
        except Exception as e:
            print(f"Error adding area {barangay}: {e}")
            failed.append({"area": area, "reason": str(e)})
    
    return jsonify({
        "success": True,
        "added_count": len(added),
        "added": added,
        "duplicate_count": len(duplicates),
        "duplicates": duplicates,
        "failed_count": len(failed),
        "failed": failed,
        "message": f"Added {len(added)} areas, {len(duplicates)} duplicates skipped, {len(failed)} failed"
    })

# =========================
# GET MISSING BARANGAYS - CONVERTED TO MYSQL
# =========================
@app.route("/api/superadmin/missing-barangays/<city>")
def get_missing_barangays(city):
    """Get list of barangays that are not yet added for a specific city"""
    city_upper = city.upper().strip()
    
    # All valid barangays per city
    barangay_database = {
        "SANTA CRUZ": ["BAGUMBAYAN", "BUBUKAL", "CALIOS", "DUHAT", "GATID", "LABUIN", "OOGONG", "PAGSAWITAN", "PATIMBAO", "BARANGAY I", "BARANGAY II", "BARANGAY III", "BARANGAY IV", "BARANGAY V", "SAN JOSE", "SAN JUAN", "SAN PABLO NORTE", "SAN PABLO SUR", "SANTISIMA CRUZ", "SANTO ANGEL CENTRAL", "SANTO ANGEL NORTE", "SANTO ANGEL SUR", "ALIPIT", "JASAAN", "MALINAO", "PALASAN"],
        "PAGSANJAN": ["BARANGAY UNO", "BARANGAY DOS", "BIÑAN", "BUBOY", "CABANBANAN", "LAYUGAN", "MAGDAPIO", "MAULAWIN", "PINAGSANJAN", "SABANG", "SAMPALOC", "SAN ISIDRO", "ANIBONG", "CALUSICHE", "DINGIN", "LAMBAC"],
        "MAGDALENA": ["MALAKING AMBLING", "MUNTING AMBLING", "BUCAL", "BUENAVISTA", "CIGARAS", "IBABANG ATINGAY", "IBABANG BUTNONG", "ILAYANG ATINGAY", "ILAYANG BUTNONG", "POBLACION", "SABANG", "SALASAD", "TIPUNAN", "ALIPIT", "BANAAN", "BALANAC", "BUNGKOL", "BUO", "BURLUNGAN", "HALAYHAYIN", "ILOG", "MALINAO", "MARAVILLA", "TANAWAN"],
        "PILA": ["APLAYA", "BAGONG POOK", "BULILAN NORTE", "BULILAN SUR", "CONCEPCION", "LABUIN", "LINGA", "MOJON", "PANSOL", "PINAGBAYANAN", "SAN ANTONIO", "SAN MIGUEL", "SANTA CLARA NORTE", "SANTA CLARA SUR", "TUBUAN", "BUKAL"]
    }
    
    # Check if city exists
    if city_upper not in barangay_database:
        return jsonify({
            "error": f"'{city}' is not a valid city",
            "valid_cities": list(barangay_database.keys())
        }), 404
    
    all_barangays = set(barangay_database[city_upper])
    
    try:
        # Get already added barangays from MySQL
        query = """
            SELECT DISTINCT barangay FROM areas 
            WHERE city = %s
        """
        existing_areas = execute_query(query, (city_upper,), fetch=True) or []
        
        added_barangays = set([area['barangay'].upper() for area in existing_areas])
        
        # Find missing barangays (not yet added)
        missing_barangays = list(all_barangays - added_barangays)
        missing_barangays.sort()
        
        # Get province from existing area or default
        province_query = "SELECT province FROM areas WHERE city = %s LIMIT 1"
        province_result = execute_query(province_query, (city_upper,), fetch_one=True)
        province = province_result['province'] if province_result else "LAGUNA"
        
        return jsonify({
            "city": city_upper,
            "province": province,
            "total_barangays": len(all_barangays),
            "added_count": len(added_barangays),
            "missing_count": len(missing_barangays),
            "missing_barangays": missing_barangays
        })
        
    except Exception as e:
        print(f"Error getting missing barangays: {e}")
        return jsonify({"error": str(e)}), 500

# =========================
# GET AREA STATISTICS - NEW ENDPOINT
# =========================
@app.route("/api/superadmin/areas/stats", methods=["GET"])
def get_area_stats():
    try:
        # Get total count of areas
        total_query = "SELECT COUNT(*) as total FROM areas"
        total_result = execute_query(total_query, fetch_one=True)
        total_areas = total_result['total'] if total_result else 0
        
        # Get count per city
        city_query = """
            SELECT city, COUNT(*) as count 
            FROM areas 
            GROUP BY city 
            ORDER BY city
        """
        city_stats = execute_query(city_query, fetch=True) or []
        
        return jsonify({
            "total_areas": total_areas,
            "cities": city_stats
        })
        
    except Exception as e:
        print(f"Error getting area stats: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# USER MANAGEMENT PAGE
# ===============================
@app.route("/superadmin/users")
def superadmin_users():
    return render_template("superadmin-users.html")

# ===============================
# GET ALL USERS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/users", methods=["GET"])
def get_users():
    try:
        # Query users table for customer role
        users_query = """
            SELECT user_id, email, status, connection_status, 
                   first_name, last_name, middle_name, suffix,
                   customer_id
            FROM users 
            WHERE role = 'customer'
        """
        users_data = execute_query(users_query, fetch=True) or []
        
        users = []
        
        for user in users_data:
            user_id = user.get('user_id')
            
            # Build full name from users table fields
            first = user.get('first_name', '')
            middle = user.get('middle_name', '')
            last = user.get('last_name', '')
            suffix = user.get('suffix', '')
            
            full_name_parts = [first]
            if middle:
                full_name_parts.append(middle)
            if last:
                full_name_parts.append(last)
            if suffix:
                full_name_parts.append(suffix)
            
            full_name = " ".join(filter(None, full_name_parts)) if full_name_parts else "N/A"
            
            users.append({
                "user_id": user_id,
                "full_name": full_name,
                "email": user.get('email', ''),
                "status": user.get('status', 'Active'),
                "connection_status": user.get('connection_status', 'Disconnected')
            })
        
        return jsonify(users)
        
    except Exception as e:
        print("Get users error:", e)
        return jsonify({"error": str(e)}), 500

# ===============================
# UPDATE USER STATUS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/users/<user_id>/status", methods=["POST"])
def update_user_status(user_id):
    try:
        data = request.get_json()
        new_status = data.get("status")
        
        if new_status not in ["Active", "Deactivated"]:
            return jsonify({"error": "Invalid status"}), 400
        
        # Check if user exists
        check_query = "SELECT user_id FROM users WHERE user_id = %s"
        user = execute_query(check_query, (user_id,), fetch_one=True)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Update status
        update_query = "UPDATE users SET status = %s WHERE user_id = %s"
        execute_query(update_query, (new_status, user_id))
        
        # ========== CREATE NOTIFICATION FOR THE USER ==========
        try:
            # Get user details for notification
            user_query = """
                SELECT email, first_name, last_name 
                FROM users 
                WHERE user_id = %s
            """
            user_details = execute_query(user_query, (user_id,), fetch_one=True)
            
            notification_id = int(datetime.now().timestamp() * 1000)
            user_name = f"{user_details.get('first_name', '')} {user_details.get('last_name', '')}".strip() or 'User'
            user_email = user_details.get('email', '')
            
            # Create message based on new status
            if new_status == "Active":
                title = "Account Activated"
                message = f"Your account has been successfully activated. You can now log in to your dashboard."
                notif_type = "account_activated"
            else:
                title = "Account Deactivated"
                message = f"Your account has been deactivated. Please contact support for assistance."
                notif_type = "account_deactivated"
            
            # Insert notification into user_notifications table
            notif_query = """
                INSERT INTO user_notifications 
                (id, title, message, type, relatedId, user_id, user_email, user_name, status_value, timestamp, read_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            execute_query(notif_query, (
                notification_id,
                title,
                message,
                notif_type,
                user_id,
                user_id,
                user_email,
                user_name,
                new_status,
                datetime.now().isoformat(),
                0
            ))
            print(f"✅ Notification sent to user {user_id} about status {new_status}")
            
        except Exception as notif_error:
            print(f"⚠️ Error creating user notification: {notif_error}")
        
        return jsonify({"message": f"User {user_id} updated to {new_status}"})
        
    except Exception as e:
        print("Update user status error:", e)
        return jsonify({"error": str(e)}), 500

# ===============================
# UPDATE USER CONNECTION STATUS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/users/<user_id>/connection", methods=["POST"])
def update_user_connection(user_id):
    try:
        data = request.get_json()
        new_status = data.get("connection_status")
        
        if new_status not in ["Connected", "Disconnected"]:
            return jsonify({"error": "Invalid connection status"}), 400
        
        # Check if user exists and get details
        check_query = """
            SELECT user_id, email, first_name, last_name, connection_status 
            FROM users 
            WHERE user_id = %s
        """
        user = execute_query(check_query, (user_id,), fetch_one=True)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Update the connection status
        update_query = "UPDATE users SET connection_status = %s WHERE user_id = %s"
        execute_query(update_query, (new_status, user_id))
        
        # ========== CREATE NOTIFICATION FOR THE USER ==========
        try:
            notification_id = int(datetime.now().timestamp() * 1000)
            user_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or 'User'
            user_email = user.get('email', '')
            
            # Create message based on new status
            if new_status == "Connected":
                title = "Internet Connection Activated"
                message = f"Your internet connection has been successfully activated. You can now enjoy our high-speed internet service."
                notif_type = "connection_activated"
            else:
                title = "Internet Connection Deactivated"
                message = f"Your internet connection has been deactivated. Please contact support for assistance."
                notif_type = "connection_deactivated"
            
            # Insert notification into user_notifications table
            notif_query = """
                INSERT INTO user_notifications 
                (id, title, message, type, relatedId, user_id, user_email, user_name, connection_status, timestamp, read_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            execute_query(notif_query, (
                notification_id,
                title,
                message,
                notif_type,
                user_id,
                user_id,
                user_email,
                user_name,
                new_status,
                datetime.now().isoformat(),
                0
            ))
            print(f"✅ Notification sent to user {user_id} about connection {new_status}")
            
        except Exception as notif_error:
            print(f"⚠️ Error creating user notification: {notif_error}")
        
        return jsonify({"message": f"User {user_id} connection updated to {new_status}"})
        
    except Exception as e:
        print("Update user connection error:", e)
        return jsonify({"error": str(e)}), 500

# ===============================
# GET SINGLE USER DETAILS - NEW ENDPOINT
# ===============================
@app.route("/api/superadmin/users/<user_id>", methods=["GET"])
def get_user_details(user_id):
    try:
        query = """
            SELECT user_id, email, status, connection_status, 
                   first_name, last_name, middle_name, suffix,
                   contact_number, address, created_at
            FROM users 
            WHERE user_id = %s
        """
        user = execute_query(query, (user_id,), fetch_one=True)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Build full name
        first = user.get('first_name', '')
        middle = user.get('middle_name', '')
        last = user.get('last_name', '')
        suffix = user.get('suffix', '')
        
        full_name_parts = [first]
        if middle:
            full_name_parts.append(middle)
        if last:
            full_name_parts.append(last)
        if suffix:
            full_name_parts.append(suffix)
        
        full_name = " ".join(filter(None, full_name_parts)) if full_name_parts else "N/A"
        
        return jsonify({
            "user_id": user.get('user_id'),
            "full_name": full_name,
            "email": user.get('email', ''),
            "status": user.get('status', 'Active'),
            "connection_status": user.get('connection_status', 'Disconnected'),
            "contact_number": user.get('contact_number', ''),
            "address": user.get('address', ''),
            "created_at": user.get('created_at', '')
        })
        
    except Exception as e:
        print("Get user details error:", e)
        return jsonify({"error": str(e)}), 500

# ===============================
# GLOBAL STATISTICS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/statistics", methods=["GET"])
def superadmin_statistics():
    try:
        # ========== GET APPLICATIONS COUNT ==========
        # Count total applications (excluding rejected? keep original logic)
        apps_query = "SELECT COUNT(*) as total FROM applications"
        apps_result = execute_query(apps_query, fetch_one=True)
        total_applicants = apps_result['total'] if apps_result else 0
        
        # ========== GET ADMINS COUNT ==========
        admins_query = "SELECT COUNT(*) as total FROM admins"
        admins_result = execute_query(admins_query, fetch_one=True)
        total_admins = admins_result['total'] if admins_result else 0
        
        # ========== GET ACTIVE ADMINS COUNT ==========
        active_admins_query = "SELECT COUNT(*) as total FROM admins WHERE status = 'Active'"
        active_admins_result = execute_query(active_admins_query, fetch_one=True)
        active_admins = active_admins_result['total'] if active_admins_result else 0
        
        # ========== GET POPULAR PLANS ==========
        plans_query = """
            SELECT plan, COUNT(*) as count 
            FROM applications 
            WHERE plan IS NOT NULL AND plan != ''
            GROUP BY plan 
            ORDER BY count DESC
        """
        popular_plans_result = execute_query(plans_query, fetch=True) or []
        popular_plans = {}
        for row in popular_plans_result:
            popular_plans[row['plan']] = row['count']
        
        # ========== GET COVERAGE GROWTH (applications per city/area) ==========
        coverage_query = """
            SELECT city, COUNT(*) as count 
            FROM applications 
            WHERE city IS NOT NULL AND city != ''
            GROUP BY city 
            ORDER BY count DESC
        """
        coverage_result = execute_query(coverage_query, fetch=True) or []
        coverage_growth = {}
        for row in coverage_result:
            coverage_growth[row['city']] = row['count']
        
        # ========== GET TOTAL ACTIVE APPLICANTS (non-rejected) - optional ==========
        active_applicants_query = """
            SELECT COUNT(*) as total 
            FROM applications 
            WHERE status != 'Rejected'
        """
        active_applicants_result = execute_query(active_applicants_query, fetch_one=True)
        total_active_applicants = active_applicants_result['total'] if active_applicants_result else 0
        
        return jsonify({
            "total_applicants": total_applicants,
            "total_active_applicants": total_active_applicants,
            "popular_plans": popular_plans,
            "coverage_growth": coverage_growth,
            "total_admins": total_admins,
            "active_admins": active_admins
        })
        
    except Exception as e:
        print(f"Error in superadmin_statistics: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# GET SUPERADMIN PROFILE (XAMPP/MYSQL)
# ===============================
@app.route("/api/superadmin/profile", methods=["GET"])
def get_superadmin_profile():
    try:
        if session.get('admin_type') != 'superadmin':
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get username from session (this is the original login username)
        username = session.get('admin_username')
        
        if not username:
            return jsonify({"error": "Not logged in"}), 401
        
        print(f"🔍 Getting profile for username: {username}")
        
        query = "SELECT username, name, email, area, status FROM superadmins WHERE username = %s"
        superadmin = execute_query(query, (username,), fetch_one=True)
        
        if superadmin:
            # Use display name from session if available, otherwise from database
            display_name = session.get('admin_display_name') or superadmin.get("name") or superadmin.get("username")
            
            return jsonify({
                "username": superadmin.get("username"),
                "name": display_name,
                "email": superadmin.get("email", ""),
                "area": superadmin.get("area", "Sta. Cruz"),
                "status": superadmin.get("status", "Active")
            })
        
        return jsonify({
            "username": username,
            "name": username,
            "email": "",
            "area": "Sta. Cruz",
            "status": "Active"
        })
        
    except Exception as e:
        print(f"Get superadmin profile error: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# UPDATE SUPERADMIN PROFILE (XAMPP/MYSQL) - FINAL FIX
# ===============================
@app.route("/api/update-superadmin-profile", methods=["POST"])
def update_superadmin_profile():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    area = data.get("area")

    # Check if user is superadmin via session
    if session.get('admin_type') != 'superadmin':
        return jsonify({"error": "Unauthorized"}), 403

    # IMPORTANT: Get the original username from session (DO NOT CHANGE THIS)
    username = session.get('admin_username')
    
    print(f"🔍 Updating profile for username: {username}")
    
    if not username:
        return jsonify({"error": "Not logged in"}), 401

    try:
        # First, check if the username exists in database
        check_query = "SELECT username FROM superadmins WHERE username = %s"
        check_result = execute_query(check_query, (username,), fetch_one=True)
        
        if not check_result:
            print(f"❌ Username '{username}' not found in database!")
            return jsonify({"error": f"User '{username}' not found in database"}), 404
        
        # Build update query
        update_fields = []
        params = []
        
        if name:
            update_fields.append("name = %s")
            params.append(name)
        if email:
            update_fields.append("email = %s")
            params.append(email)
        if area:
            update_fields.append("area = %s")
            params.append(area)
        if password and len(password) >= 8:
            update_fields.append("password = %s")
            params.append(password)
        
        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400
        
        params.append(username)
        update_query = f"UPDATE superadmins SET {', '.join(update_fields)} WHERE username = %s"
        
        print(f"🔍 UPDATE QUERY: {update_query}")
        print(f"🔍 PARAMS: {params}")
        
        # Execute update
        result = execute_query(update_query, params)
        print(f"✅ Update result: {result}")
        
        # DO NOT change session['admin_username'] - keep the original username
        # Only update session display name if needed
        if name:
            session['admin_display_name'] = name  # Use separate variable for display
        
        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        }), 200

    except Exception as e:
        print(f"Update error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ===============================
# SERVE SUPERADMIN PROFILE PAGE
# ===============================
@app.route("/superadmin/profile")
def superadmin_profile():
    return render_template("superadmin-profile.html")
    
import os
from werkzeug.utils import secure_filename

# ==================== PLANS MANAGEMENT ====================
# Configure upload folder
UPLOAD_FOLDER = os.path.join('static', 'uploads', 'plans')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Create upload folder if not exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/superadmin/plans")
def superadmin_plans():
    return render_template("superadmin-plans.html")

# GET ALL PLANS - CONVERTED TO MYSQL
@app.route("/api/superadmin/plans", methods=["GET"])
def get_plans():
    try:
        query = """
            SELECT id, name, speed, price, image_path, created_at
            FROM plans 
            ORDER BY id DESC
        """
        plans = execute_query(query, fetch=True) or []
        
        plan_list = []
        for plan in plans:
            plan_list.append({
                "id": plan['id'],
                "name": plan['name'],
                "speed": plan['speed'],
                "price": float(plan['price']) if plan['price'] else 0,
                "image": plan.get('image_path', '')  # Path to image file
            })
        
        return jsonify(plan_list)
        
    except Exception as e:
        print("Get plans error:", e)
        return jsonify([])

# CREATE PLAN - CONVERTED TO MYSQL (with image upload)
@app.route("/api/superadmin/plans", methods=["POST"])
def create_plan():
    try:
        name = request.form.get("name")
        speed = request.form.get("speed")
        price = request.form.get("price")
        
        # Handle image upload
        image_file = request.files.get("image")
        image_path = None
        
        if not name or not speed or not price:
            return jsonify({"error": "Name, speed, and price are required"}), 400
        
        if not image_file or not allowed_file(image_file.filename):
            return jsonify({"error": "Valid image file is required (png, jpg, jpeg, gif, webp)"}), 400
        
        # Save image to static/uploads/plans/
        filename = secure_filename(f"plan_{int(datetime.now().timestamp())}_{image_file.filename}")
        image_path = os.path.join('uploads', 'plans', filename)  # Relative path for database
        full_path = os.path.join('static', image_path)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        image_file.save(full_path)
        
        # Insert into MySQL
        insert_query = """
            INSERT INTO plans (name, speed, price, image_path, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """
        plan_id = execute_query(insert_query, (name, speed, float(price), image_path))
        
        return jsonify({
            "message": "Plan created successfully", 
            "id": plan_id,
            "image_path": image_path
        })
        
    except Exception as e:
        print("Create plan error:", e)
        return jsonify({"error": str(e)}), 500

# UPDATE PLAN - CONVERTED TO MYSQL (with optional image upload)
@app.route("/api/superadmin/plans/<int:plan_id>", methods=["PUT"])
def update_plan(plan_id):
    try:
        name = request.form.get("name")
        speed = request.form.get("speed")
        price = request.form.get("price")
        
        if not name or not speed or not price:
            return jsonify({"error": "Name, speed, and price are required"}), 400
        
        # Check if plan exists
        check_query = "SELECT id, image_path FROM plans WHERE id = %s"
        existing = execute_query(check_query, (plan_id,), fetch_one=True)
        
        if not existing:
            return jsonify({"error": "Plan not found"}), 404
        
        # Handle image upload (optional)
        image_file = request.files.get("image")
        image_path = existing.get('image_path')
        
        if image_file and allowed_file(image_file.filename):
            # Delete old image if exists
            if image_path:
                old_full_path = os.path.join('static', image_path)
                if os.path.exists(old_full_path):
                    os.remove(old_full_path)
            
            # Save new image
            filename = secure_filename(f"plan_{int(datetime.now().timestamp())}_{image_file.filename}")
            image_path = os.path.join('uploads', 'plans', filename)
            full_path = os.path.join('static', image_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            image_file.save(full_path)
        
        # Update plan
        if image_path:
            update_query = """
                UPDATE plans 
                SET name = %s, speed = %s, price = %s, image_path = %s
                WHERE id = %s
            """
            execute_query(update_query, (name, speed, float(price), image_path, plan_id))
        else:
            update_query = """
                UPDATE plans 
                SET name = %s, speed = %s, price = %s
                WHERE id = %s
            """
            execute_query(update_query, (name, speed, float(price), plan_id))
        
        return jsonify({"message": "Plan updated successfully"})
        
    except Exception as e:
        print("Update plan error:", e)
        return jsonify({"error": str(e)}), 500

# DELETE PLAN - CONVERTED TO MYSQL (with image deletion)
@app.route("/api/superadmin/plans/<int:plan_id>", methods=["DELETE"])
def delete_plan(plan_id):
    try:
        # Get plan info first
        check_query = "SELECT id, image_path FROM plans WHERE id = %s"
        plan = execute_query(check_query, (plan_id,), fetch_one=True)
        
        if not plan:
            return jsonify({"error": "Plan not found"}), 404
        
        # Delete image file if exists
        image_path = plan.get('image_path')
        if image_path:
            full_path = os.path.join('static', image_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                print(f"Deleted image: {full_path}")
        
        # Delete from MySQL
        delete_query = "DELETE FROM plans WHERE id = %s"
        execute_query(delete_query, (plan_id,))
        
        return jsonify({"message": "Plan deleted successfully"})
        
    except Exception as e:
        print("Delete plan error:", e)
        return jsonify({"error": str(e)}), 500
    
# ===============================
# Internet Applications Page
# ===============================
@app.route("/superadmin/internet-applications")
def superadmin_internet_applications_page():
    return render_template("superadmin-internet-applications.html")


# ===============================
# GET APPLICATIONS - CONVERTED TO MYSQL (FIXED)
# ===============================
@app.route("/api/superadmin/applications", methods=["GET"])
def superadmin_get_all_applications():
    try:
        limit = int(request.args.get("limit", 50))

        # Get latest applications (by application_number or timestamp descending)
        query = """
            SELECT application_number, first_name, last_name, email, 
                   date_submitted, barangay, city, birthdate, status, 
                   rejection_reason
            FROM applications 
            ORDER BY timestamp DESC 
            LIMIT %s
        """
        applications = execute_query(query, (limit,), fetch=True) or []

        # Format response (same structure as Firebase version)
        apps = []
        for app in applications:
            apps.append({
                "id": app.get("application_number", ""),  # Use application_number as id
                "application_number": app.get("application_number", ""),
                "first_name": app.get("first_name", ""),
                "last_name": app.get("last_name", ""),
                "email": app.get("email", ""),
                "date_submitted": app.get("date_submitted", ""),
                "barangay": app.get("barangay", ""),
                "city": app.get("city", ""),
                "birthdate": app.get("birthdate", ""),
                "status": app.get("status", "Pending"),
                "rejection_reason": app.get("rejection_reason", "")
            })

        return jsonify(apps)

    except Exception as e:
        print("Superadmin get applications error:", e)
        return jsonify({"error": str(e)}), 500


# ===============================
# View Single Application Page (Superadmin)
# ===============================
@app.route("/superadmin/view-application/<app_id>")
def superadmin_view_application(app_id):
    return render_template("superadmin-view_application.html", app_id=app_id)


# ===============================
# GET SINGLE APPLICATION - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/application/<string:app_id>", methods=["GET"])
def superadmin_get_single_application(app_id):
    try:
        query = """
            SELECT 
                application_number, address, approval_date, barangay, 
                billing_address, billing_date, birthdate, business_address, 
                business_phone, citizenship, city, civil_status, contract_number,
                date_submitted, email, employer, father_name, first_name,
                home_ownership, house_number, id_back, id_front,
                installation_address, installation_fee, installation_phone,
                installation_status, landmark, last_name, latitude, longitude,
                middle_name, mobile, mother_maiden_name, occupation, phone,
                place_of_birth, plan, plan_price, plan_speed, profile_photo,
                proof_billing, province, secondary_mobile, service_type, sex,
                signature, spouse_employer, spouse_name, spouse_occupation,
                spouse_phone, status, suffix, terms_agreed, time_submitted,
                timestamp, rejection_reason, user_created, user_created_at,
                user_id, zip, tv_qty, tv_brand, tv_type
            FROM applications 
            WHERE application_number = %s
        """
        application = execute_query(query, (app_id,), fetch_one=True)
        
        if not application:
            return jsonify({"error": "Application not found"}), 404
        
        # Parse JSON fields (tv_qty, tv_brand, tv_type are stored as JSON strings)
        if application.get('tv_qty'):
            try:
                application['tv_qty'] = json.loads(application['tv_qty'])
            except:
                application['tv_qty'] = []
        
        if application.get('tv_brand'):
            try:
                application['tv_brand'] = json.loads(application['tv_brand'])
            except:
                application['tv_brand'] = []
        
        if application.get('tv_type'):
            try:
                application['tv_type'] = json.loads(application['tv_type'])
            except:
                application['tv_type'] = []
        
        # Keep id field for frontend compatibility
        application['id'] = application.get('application_number')
        
        return jsonify(application)
        
    except Exception as e:
        print("Get single application error:", e)
        return jsonify({"error": str(e)}), 500
    
    
# ===============================
# SUPERADMIN DOWNLOAD - CONVERTED TO MYSQL
# ===============================
@app.route('/superadmin/download/pdf/<app_id>')
def superadmin_download_pdf(app_id):
    try:
        # Get application data from MySQL using application_number (app_id)
        query = """
            SELECT application_number FROM applications 
            WHERE application_number = %s
        """
        data = execute_query(query, (app_id,), fetch_one=True)

        if not data:
            return "Application not found", 404

        # Get application_number
        application_number = data.get("application_number")

        if not application_number:
            return "Application number missing", 400

        # Use existing PDF generator
        return download_pdf(application_number)

    except Exception as e:
        print(f"PDF download error: {e}")
        return str(e), 500
    
@app.route('/download/pdf/<application_number>')
def download_pdf(application_number):
    import io, base64
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.utils import ImageReader
    from flask import send_file
    import requests
    import json

    # Get application data from MySQL (HINDI Firebase)
    query = """
        SELECT * FROM applications 
        WHERE application_number = %s
    """
    data = execute_query(query, (application_number,), fetch_one=True)
    
    if not data:
        return "Application not found", 404
    
    # Parse JSON fields (tv_qty, tv_brand, tv_type are stored as JSON strings)
    if data.get('tv_qty'):
        try:
            data['tv_qty'] = json.loads(data['tv_qty'])
        except:
            data['tv_qty'] = []
    
    if data.get('tv_brand'):
        try:
            data['tv_brand'] = json.loads(data['tv_brand'])
        except:
            data['tv_brand'] = []
    
    if data.get('tv_type'):
        try:
            data['tv_type'] = json.loads(data['tv_type'])
        except:
            data['tv_type'] = []

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # ================= MAX PAGES =================
    MAX_PAGES = 4
    current_page = 1
    y = height - 120

    # ================= HEADER =================
    def draw_header():
        nonlocal y
        try:
            logo = ImageReader("static/logo1.png")
            p.drawImage(logo, 40, height - 90, width=60, height=60, mask='auto')
        except:
            pass

        p.setFont("Helvetica-Bold", 16)
        p.drawString(110, height - 60, "APPLICATION FORM")

        p.setFont("Helvetica-Bold", 10)
        p.drawRightString(width - 50, height - 60, f"Application No: {application_number}")

        p.setFont("Helvetica", 8)
        p.drawString(110, height - 75, "Sitio Sampaguita, Brgy. Pagsawitan, Santa Cruz, 4009 Laguna")
        p.drawString(110, height - 87, "Tel: (049) 501-1495 | Fax: (049) 501-0229 | Mobile: 0917 501 0341")

        y = height - 110

    def draw_page_number():
        p.setFont("Helvetica-Bold", 10)
        p.setFillColorRGB(0.4, 0.4, 0.4)
        p.drawRightString(width - 25, 20, str(current_page))
        p.setFillColorRGB(0, 0, 0)

    def new_page():
        nonlocal y, current_page
        if current_page >= MAX_PAGES:
            return False
        p.showPage()
        current_page += 1
        draw_header()
        draw_page_number()
        y = height - 110
        return True

    def ensure_space(required):
        nonlocal y
        if y - required < 50:
            return new_page()
        return True

    def draw_section_title(title):
        nonlocal y
        ensure_space(30)
        p.setFont("Helvetica-Bold", 12)
        p.setFillColorRGB(0, 0.4, 0.6)
        p.drawString(50, y, title)
        p.setFillColorRGB(0, 0, 0)
        y -= 22

    def draw_section_title_centered(title):
        nonlocal y
        ensure_space(30)
        p.setFont("Helvetica-Bold", 14)
        p.setFillColorRGB(0, 0.4, 0.6)
        p.drawCentredString(width / 2, y, title)
        p.setFillColorRGB(0, 0, 0)
        y -= 25

    # Two-column field drawer
    def draw_two_columns(fields):
        nonlocal y
        col1_x = 50
        col2_x = 310
        label_width = 120
        value_x = col1_x + label_width + 5
        
        for i in range(0, len(fields), 2):
            ensure_space(20)
            # Left column
            label1, value1 = fields[i]
            p.setFont("Helvetica-Bold", 9)
            p.drawString(col1_x, y, f"{label1}:")
            p.setFont("Helvetica", 9)
            val1_str = str(value1) if value1 and value1 != "-" and value1 != "none" else "___________________"
            if len(val1_str) > 35:
                val1_str = val1_str[:32] + "..."
            p.drawString(value_x, y, val1_str)
            
            # Right column
            if i + 1 < len(fields):
                label2, value2 = fields[i + 1]
                p.setFont("Helvetica-Bold", 9)
                p.drawString(col2_x, y, f"{label2}:")
                p.setFont("Helvetica", 9)
                val2_str = str(value2) if value2 and value2 != "-" and value2 != "none" else "___________________"
                if len(val2_str) > 30:
                    val2_str = val2_str[:27] + "..."
                p.drawString(col2_x + label_width + 5, y, val2_str)
            
            y -= 18
        y -= 5

    # Draw images top and bottom
    def draw_images_top_bottom(label1, img1_data, label2, img2_data, img_width=280, img_height=190):
        nonlocal y
        
        # Front ID
        ensure_space(img_height + 60)
        p.setFont("Helvetica-Bold", 11)
        p.drawCentredString(width / 2, y, label1)
        y -= 22
        
        if img1_data:
            try:
                if "base64," in str(img1_data):
                    img1_data = img1_data.split(",")[1]
                img = ImageReader(io.BytesIO(base64.b64decode(img1_data)))
                x_center = (width - img_width) / 2
                p.drawImage(img, x_center, y - img_height, img_width, img_height, preserveAspectRatio=True, mask='auto')
                y -= img_height + 35
            except Exception as e:
                print(f"Image error: {e}")
                p.drawCentredString(width / 2, y, "[Image error]")
                y -= 25
        else:
            p.drawCentredString(width / 2, y, "Not provided")
            y -= 25
        
        # Back ID
        ensure_space(img_height + 60)
        p.setFont("Helvetica-Bold", 11)
        p.drawCentredString(width / 2, y, label2)
        y -= 22
        
        if img2_data:
            try:
                if "base64," in str(img2_data):
                    img2_data = img2_data.split(",")[1]
                img = ImageReader(io.BytesIO(base64.b64decode(img2_data)))
                x_center = (width - img_width) / 2
                p.drawImage(img, x_center, y - img_height, img_width, img_height, preserveAspectRatio=True, mask='auto')
                y -= img_height + 35
            except Exception as e:
                print(f"Image error: {e}")
                p.drawCentredString(width / 2, y, "[Image error]")
                y -= 25
        else:
            p.drawCentredString(width / 2, y, "Not provided")
            y -= 25

    # Signature section
    def draw_signature_section(signature_img, full_name):
        nonlocal y
        
        y -= 15
        
        sig_width = 250
        sig_height = 85
        if signature_img:
            try:
                if "base64," in str(signature_img):
                    signature_img = signature_img.split(",")[1]
                img = ImageReader(io.BytesIO(base64.b64decode(signature_img)))
                x_center = (width - sig_width) / 2
                p.drawImage(img, x_center, y - sig_height, sig_width, sig_height, preserveAspectRatio=True, mask='auto')
            except Exception as e:
                print(f"Signature error: {e}")
                p.setFont("Helvetica", 9)
                p.drawCentredString(width / 2, y, "[Signature not displayable]")
        else:
            p.setFont("Helvetica", 9)
            p.drawCentredString(width / 2, y, "No signature provided")
        
        y -= sig_height + 20
        
        p.setFont("Helvetica", 10)
        p.drawCentredString(width / 2, y, full_name if full_name else "_________________________")
        y -= 20
        
        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.4, 0.4, 0.4)
        p.drawCentredString(width / 2, y, "signature over printed name")
        p.setFillColorRGB(0, 0, 0)
        y -= 30

    # ================= START BUILDING =================
    draw_header()
    draw_page_number()

    # ================= PAGE 1: PERSONAL INFORMATION =================
    draw_section_title("I. PERSONAL INFORMATION")
    draw_two_columns([
        ("Last Name", data.get("last_name")),
        ("First Name", data.get("first_name")),
        ("Middle Name", data.get("middle_name")),
        ("Suffix", data.get("suffix")),
        ("Date of Birth", data.get("birthdate")),
        ("Place of Birth", data.get("place_of_birth")),
        ("Sex", data.get("sex")),
        ("Civil Status", data.get("civil_status")),
        ("Citizenship", data.get("citizenship")),
        ("Occupation", data.get("occupation")),
    ])

    draw_section_title("II. FAMILY DETAILS")
    draw_two_columns([
        ("Mother's Maiden Name", data.get("mother_maiden_name")),
        ("Father's Name", data.get("father_name")),
    ])

    draw_section_title("III. CONTACT & ADDRESS")
    draw_two_columns([
        ("Mobile Number", data.get("mobile")),
        ("Email Address", data.get("email")),
        ("Home Ownership", data.get("home_ownership")),
        ("House No./Unit", data.get("house_number")),
        ("Nearest Landmark", data.get("landmark")),
        ("Street/Village", data.get("address")),
    ])

    # Billing Address
    p.setFont("Helvetica-Bold", 9)
    p.drawString(50, y, "Billing Address:")
    p.setFont("Helvetica", 9)
    
    billing_address = data.get("billing_address", "")
    if not billing_address or billing_address == "-" or billing_address == "none":
        billing_address = "_________________________"
    
    from reportlab.pdfbase.pdfmetrics import stringWidth
    max_width = 400
    words = billing_address.split()
    lines = []
    current_line = ""
    
    for word in words:
        test_line = current_line + (" " if current_line else "") + word
        if stringWidth(test_line, "Helvetica", 9) <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    for line in lines:
        p.drawString(170, y, line)
        y -= 14
    y -= 5

    draw_section_title("IV. EMPLOYMENT DETAILS")
    draw_two_columns([
        ("Employer / Company", data.get("employer")),
        ("Business Phone", data.get("business_phone")),
        ("Business Address", data.get("business_address")),
        ("", ""),
    ])

    civil_status = data.get("civil_status", "")
    if civil_status and civil_status.lower() in ["married", "Married"]:
        draw_section_title("V. SPOUSE INFORMATION")
        draw_two_columns([
            ("Spouse Full Name", data.get("spouse_name")),
            ("Spouse Occupation", data.get("spouse_occupation")),
            ("Spouse Employer", data.get("spouse_employer")),
            ("Spouse Phone", data.get("spouse_phone")),
        ])

    draw_section_title("VI. SERVICE PLAN")
    draw_two_columns([
        ("Service Type / Plan", data.get("service_type")),
        ("Installation Fee", data.get("installation_fee")),
    ])

    # Installation Phone
    p.setFont("Helvetica-Bold", 9)
    p.drawString(50, y, "Installation Phone:")
    p.setFont("Helvetica", 9)
    installation_phone = data.get("installation_phone", "")
    if not installation_phone or installation_phone == "-" or installation_phone == "none":
        installation_phone = "_________________________"
    p.drawString(170, y, installation_phone)
    y -= 18
    y -= 5

    # Installation Address
    p.setFont("Helvetica-Bold", 9)
    p.drawString(50, y, "Installation Address:")
    p.setFont("Helvetica", 9)
    
    installation_address = data.get("installation_address", "")
    if not installation_address or installation_address == "-" or installation_address == "none":
        installation_address = "_________________________"
    
    words = installation_address.split()
    lines = []
    current_line = ""
    
    for word in words:
        test_line = current_line + (" " if current_line else "") + word
        if stringWidth(test_line, "Helvetica", 9) <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    for line in lines:
        p.drawString(170, y, line)
        y -= 14
    y -= 5

    # TV SET DETAILS
    tv_qty = data.get("tv_qty", [])
    tv_brand = data.get("tv_brand", [])
    tv_type = data.get("tv_type", [])
    
    if tv_qty and any(tv_qty):
        draw_section_title("VII. TV SET DETAILS")
        ensure_space(40)
        
        p.setFont("Helvetica-Bold", 9)
        p.drawString(50, y, "QTY")
        p.drawString(120, y, "BRAND / MODEL")
        p.drawString(320, y, "TYPE (HD/REGULAR)")
        y -= 15
        
        p.setFont("Helvetica", 9)
        for i in range(min(len(tv_qty), 5)):
            if y < 120:
                break
            qty = str(tv_qty[i]) if i < len(tv_qty) else "-"
            brand = tv_brand[i] if i < len(tv_brand) else "-"
            if len(brand) > 25:
                brand = brand[:22] + "..."
            tv_t = tv_type[i] if i < len(tv_type) else "-"
            
            p.drawString(50, y, qty)
            p.drawString(120, y, brand)
            p.drawString(320, y, tv_t)
            y -= 16
        y -= 5

    draw_section_title("VIII. SUBMISSION DETAILS")
    draw_two_columns([
        ("Date Submitted", data.get("date_submitted")),
        ("Time Submitted", data.get("time_submitted")),
    ])

    full_name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
    draw_signature_section(data.get("signature"), full_name)

    # ================= PAGE 2: MAP =================
    new_page()
    draw_section_title_centered("INSTALLATION LOCATION MAP")

    lat = data.get("latitude")
    lng = data.get("longitude")
    google_maps_url = None
    google_maps_direction_url = None
    map_img = None

    try:
        if lat and lng:
            lat = float(lat)
            lng = float(lng)
            
            google_maps_url = f"https://www.google.com/maps?q={lat},{lng}"
            google_maps_direction_url = f"https://www.google.com/maps/dir//{lat},{lng}"
            
            map_url = f"https://maps.locationiq.com/v3/staticmap?key=pk.0fdad07272d959e4de881139988b0883&center={lat},{lng}&zoom=17&size=600x400&markers=icon:large-red-cutout|{lat},{lng}"
            response = requests.get(map_url, timeout=10)
            if response.status_code == 200:
                map_img = ImageReader(io.BytesIO(response.content))
    except Exception as e:
        print("Map error:", e)

    draw_two_columns([
        ("Street/Village", data.get("address")),
        ("Barangay/City", f"{data.get('barangay', '-')}, {data.get('city', '-')}"),
        ("Latitude", lat if lat else "-"),
        ("Longitude", lng if lng else "-"),
    ])

    if google_maps_direction_url:
        ensure_space(25)
        p.setFont("Helvetica-Bold", 12)
        p.setFillColorRGB(0, 0.5, 0)
        p.drawCentredString(width / 2, y, "📍 GET DIRECTIONS from your current location to this address")
        text_width = p.stringWidth("📍 GET DIRECTIONS from your current location to this address", "Helvetica-Bold", 12)
        p.linkURL(google_maps_direction_url, ((width - text_width) / 2, y - 2, (width + text_width) / 2, y + 12), relative=0)
        p.setFillColorRGB(0, 0, 0)
        y -= 20
        
        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.5, 0.5, 0.5)
        p.drawCentredString(width / 2, y, "👉 Click above to see distance from YOUR location, travel time, and turn-by-turn directions")
        p.setFillColorRGB(0, 0, 0)
        y -= 20

    if google_maps_url:
        p.setFont("Helvetica", 9)
        p.setFillColorRGB(0, 0, 1)
        p.drawCentredString(width / 2, y, "Or click here to view location on Google Maps")
        text_width = p.stringWidth("Or click here to view location on Google Maps", "Helvetica", 9)
        p.linkURL(google_maps_url, ((width - text_width) / 2, y - 2, (width + text_width) / 2, y + 8), relative=0)
        p.setFillColorRGB(0, 0, 0)
        y -= 30

    if map_img:
        ensure_space(380)
        img_width = 500
        img_height = 320
        x_center = (width - img_width) / 2
        p.drawImage(map_img, x_center, y - img_height, img_width, img_height)
        y -= img_height + 20
        
        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.5, 0.5, 0.5)
        p.drawCentredString(width / 2, y, "💡 Tip: Click the green 'GET DIRECTIONS' link above to see distance from your current location")
        p.setFillColorRGB(0, 0, 0)
        y -= 15
    else:
        draw_two_columns([("Map Status", "Not available")])

    # ================= PAGE 3: FRONT AND BACK ID =================
    new_page()
    draw_section_title_centered("VALID IDENTIFICATION")
    
    draw_images_top_bottom(
        "VALID ID (FRONT)", data.get("id_front"),
        "VALID ID (BACK)", data.get("id_back"),
        img_width=320, img_height=220
    )

    # ================= PAGE 4: PROOF OF BILLING =================
    new_page()
    draw_section_title_centered("PROOF OF BILLING")
    
    proof = data.get("proof_billing")
    if proof:
        try:
            if "base64," in str(proof):
                proof = proof.split(",")[1]
            img = ImageReader(io.BytesIO(base64.b64decode(proof)))
            img_width = 500
            img_height = 580
            x_center = (width - img_width) / 2
            p.drawImage(img, x_center, y - img_height, img_width, img_height, preserveAspectRatio=True, mask='auto')
            y -= img_height + 30
        except Exception as e:
            print(f"Proof of billing error: {e}")
            p.drawCentredString(width / 2, y, "Image not renderable")
            y -= 30
    else:
        p.drawCentredString(width / 2, y, "No proof of billing provided")
        y -= 30

    p.save()
    buffer.seek(0)
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name="Application_Form.pdf")

# ==================== UPDATE APPLICATION STATUS - CONVERTED TO MYSQL ====================
@app.route("/api/superadmin/application/<string:app_id>/status", methods=["PUT"])
def update_internet_application_status(app_id):
    try:
        data = request.get_json()
        status = data.get("status")
        reason = data.get("reason", "")
        contract_number = data.get("contract_number", None)
        billing_date = data.get("billing_date", None)
        first_installment_date = data.get("first_installment_date", None)
        last_installment_date = data.get("last_installment_date", None)

        print(f"🔍 DEBUG - Received request for app_id: {app_id}")
        print(f"🔍 DEBUG - Status: {status}")

        if status not in ["Approved", "Rejected"]:
            return jsonify({"error": "Invalid status"}), 400

        # Check if application exists
        check_query = "SELECT * FROM applications WHERE application_number = %s"
        app_data = execute_query(check_query, (app_id,), fetch_one=True)

        if not app_data:
            return jsonify({"error": "Application not found"}), 404

        # Generate contract number if approved and not provided
        if status == "Approved" and not contract_number:
            import random
            import string
            date_part = datetime.now().strftime("%Y%m%d")
            random_part = ''.join(random.choices(string.digits, k=4))
            contract_number = f"CV-{date_part}-{random_part}"
            
            if not billing_date:
                billing_date = "15th"
            print(f"🔍 DEBUG - Generated contract number: {contract_number}")

        # Prepare update data for applications table
        update_fields = ["status = %s", "rejection_reason = %s"]
        params = [status, reason if status == "Rejected" else ""]
        
        if status == "Approved" and contract_number:
            update_fields.append("contract_number = %s")
            params.append(contract_number)
            update_fields.append("billing_date = %s")
            params.append(billing_date)
            update_fields.append("approval_date = %s")
            params.append(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            update_fields.append("installation_status = %s")
            params.append("Pending")
            
            if first_installment_date:
                update_fields.append("first_installment_date = %s")
                params.append(first_installment_date)
            if last_installment_date:
                update_fields.append("last_installment_date = %s")
                params.append(last_installment_date)
        
        params.append(app_id)
        update_query = f"UPDATE applications SET {', '.join(update_fields)} WHERE application_number = %s"
        execute_query(update_query, params)
        print(f"✅ Application {app_id} updated")

        # Send email notification
        customer_email = app_data.get("email")
        first_name = app_data.get("first_name")
        application_number = app_data.get("application_number", "N/A")
        reapplied_count = app_data.get("reapplied_count", 0)

        if customer_email:
            send_application_status_email(
                to_email=customer_email,
                first_name=first_name,
                status=status,
                app_id=application_number,
                reason=reason if status == "Rejected" else None,
                contract_number=contract_number if status == "Approved" else None,
                billing_date=billing_date if status == "Approved" else None,
                application_id=app_id,
                reapplied_count=reapplied_count
            )
            print(f"✅ Email sent to {customer_email}")

        # ========== IF APPROVED, INSERT INTO CUSTOMERS TABLE ==========
        if status == "Approved":
            print(f"🔍 DEBUG - Processing customer record for {app_id}")
            
            # Prepare customer data
            customer_data = {
                "application_number": app_data.get("application_number"),
                "first_name": app_data.get("first_name"),
                "last_name": app_data.get("last_name"),
                "middle_name": app_data.get("middle_name"),
                "suffix": app_data.get("suffix"),
                "email": app_data.get("email"),
                "mobile": app_data.get("mobile"),
                "address": app_data.get("address"),
                "barangay": app_data.get("barangay"),
                "city": app_data.get("city"),
                "province": app_data.get("province"),
                "zip": app_data.get("zip"),
                "plan": app_data.get("plan"),
                "status": "Approved",
                "installation_status": "Pending",
                "contract_number": contract_number,
                "billing_date": billing_date,
                "approval_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "date_pending": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "first_installment_date": first_installment_date,
                "last_installment_date": last_installment_date
            }
            
            customer_data = {k: v for k, v in customer_data.items() if v is not None}
            
            check_customer = "SELECT application_number FROM customers WHERE application_number = %s"
            existing_customer = execute_query(check_customer, (app_id,), fetch_one=True)
            
            if not existing_customer:
                columns = ', '.join(customer_data.keys())
                placeholders = ', '.join(['%s'] * len(customer_data))
                insert_query = f"INSERT INTO customers ({columns}) VALUES ({placeholders})"
                execute_query(insert_query, list(customer_data.values()))
                print(f"✅ Customer INSERTED for {app_id}")
            else:
                update_customer_fields = []
                update_params = []
                for key, value in customer_data.items():
                    update_customer_fields.append(f"{key} = %s")
                    update_params.append(value)
                update_params.append(app_id)
                update_customer_query = f"UPDATE customers SET {', '.join(update_customer_fields)} WHERE application_number = %s"
                execute_query(update_customer_query, update_params)
                print(f"✅ Customer UPDATED for {app_id}")
            
            # ========== DIRECT INSERT TO CONTRACTS TABLE ==========
            try:
                print(f"🔵 CONTRACT - Direct insert for {app_id}")
                
                # Calculate age
                age_value = calculate_age(app_data.get('birthdate', ''))
                
                # Build full name
                full_name = ' '.join(filter(None, [
                    app_data.get('first_name', ''),
                    app_data.get('middle_name', ''),
                    app_data.get('last_name', ''),
                    app_data.get('suffix', '')
                ])).strip()
                
                # Build address
                address = f"{app_data.get('barangay', '')}, {app_data.get('city', '')}, {app_data.get('province', '')}".strip(', ')
                
                # Direct SQL INSERT
                contract_insert_query = """
                    INSERT INTO contracts (
                        contract_number, application_id, first_name, middle_name, last_name, suffix,
                        full_name, age, civil_status, address, barangay, city, province,
                        billing_date, date_submitted, status, created_at,
                        is_installment_plan, first_installment_date, last_installment_date,
                        installation_fee, application_data
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                contract_params = (
                    contract_number,
                    app_id,
                    app_data.get('first_name', ''),
                    app_data.get('middle_name', ''),
                    app_data.get('last_name', ''),
                    app_data.get('suffix', ''),
                    full_name,
                    age_value if age_value else None,
                    app_data.get('civil_status', ''),
                    address if address else 'Not provided',
                    app_data.get('barangay', ''),
                    app_data.get('city', ''),
                    app_data.get('province', ''),
                    billing_date,
                    app_data.get('date_submitted', ''),
                    "Active",
                    datetime.now().isoformat(),
                    1 if first_installment_date else 0,
                    first_installment_date,
                    last_installment_date,
                    app_data.get('installation_fee', ''),
                    json.dumps(app_data)
                )
                
                execute_query(contract_insert_query, contract_params)
                print(f"✅ Contract {contract_number} INSERTED directly!")
                
            except Exception as contract_err:
                print(f"❌ Direct contract insert error: {contract_err}")
                import traceback
                traceback.print_exc()

        return jsonify({"message": "Status updated successfully, email sent with PDF"})

    except Exception as e:
        print(f"❌ Update status error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ==================== CHECK CONTRACT NUMBER UNIQUENESS - CONVERTED TO MYSQL ====================
@app.route("/api/superadmin/check-contract-number/<contract_number>", methods=["GET"])
def check_contract_number(contract_number):
    try:
        # Check in applications table
        app_query = "SELECT contract_number FROM applications WHERE contract_number = %s LIMIT 1"
        app_result = execute_query(app_query, (contract_number,), fetch_one=True)
        
        if app_result:
            return jsonify({"exists": True})
        
        # Check in customers table
        customer_query = "SELECT contract_number FROM customers WHERE contract_number = %s LIMIT 1"
        customer_result = execute_query(customer_query, (contract_number,), fetch_one=True)
        
        if customer_result:
            return jsonify({"exists": True})
        
        return jsonify({"exists": False})
        
    except Exception as e:
        print("Error checking contract number:", e)
        return jsonify({"error": str(e)}), 500
    

# ===============================
# SEND EMAIL STATUS
# ===============================
def send_application_status_email(to_email, first_name, status, app_id, reason=None, contract_number=None, billing_date=None, application_id=None, reapplied_count=0):
    sender_email = "cablevision.cableinternet@gmail.com"
    sender_app_password = "svql qzea vmjt xndx"

    subject = "Cablevision Application Status Update"

    status_color = "#10b981" if status == "Approved" else "#ef4444"
    status_bg = "#ecfdf5" if status == "Approved" else "#fef2f2"
    status_icon = "✓" if status == "Approved" else "✗"

    # Base URL
    BASE_URL = "http://127.0.0.1:5000"
    
    if status == "Approved":
        message = f"Congratulations, {first_name}!"
        message_sub = "Your application has been approved successfully."
        reapply_section = ""
    else:
        message = f"Application Update, {first_name}"
        message_sub = "We regret to inform you about your application status."
        
        if reapplied_count < 2:
            remaining = 2 - reapplied_count
            reapply_section = f"""
            <div style="margin: 20px 0; text-align: center;">
                <a href="{BASE_URL}/reapply/{application_id}" 
                   style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                          color: white; text-decoration: none; padding: 14px 32px; border-radius: 50px;
                          font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                          transition: all 0.2s ease;">
                    🔄 Re-apply Now
                </a>
                <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">
                    You have {remaining} re-application(s) left.
                </p>
            </div>
            """
        else:
            reapply_section = f"""
            <div style="margin: 20px 0; padding: 12px; background: #fef2f2; border-radius: 12px; text-align: center;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                    ⚠️ You have reached the maximum number of re-applications (2). Further re-applications are not allowed.
                </p>
            </div>
            """

    extra_message = ""
    if status == "Approved":
        if contract_number:
            extra_message = f"""
            <div style="margin-top: 20px; padding: 16px; background: #f0fdf4; border-radius: 12px;">
                <p style="margin: 0 0 8px 0; color: #166534;">
                    <strong>What's Next?</strong>
                </p>
                <p style="margin: 0; color: #14532d; font-size: 14px;">
                    Please find attached your application PDF with contract details.<br>
                    Our team will contact you soon for installation scheduling.<br>
                    For inquiries, please contact our support team.
                </p>
            </div>
            """
        else:
            extra_message = f"""
            <div style="margin-top: 20px; padding: 16px; background: #f0fdf4; border-radius: 12px;">
                <p style="margin: 0 0 8px 0; color: #166534;">
                    <strong>What's Next?</strong>
                </p>
                <p style="margin: 0; color: #14532d; font-size: 14px;">
                    Please find attached your application PDF.<br>
                    Our team will contact you soon for installation scheduling.<br>
                    For inquiries, please contact our support team.
                </p>
            </div>
            """
    else:
        extra_message = f"""
        <div style="margin-top: 20px; padding: 16px; background: #fef2f2; border-radius: 12px;">
            <p style="margin: 0 0 8px 0; color: #991b1b;">
                <strong>Reason for Rejection</strong>
            </p>
            <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
                {reason}
            </p>
            <p style="margin-top: 12px; color: #7f1d1d; font-size: 13px;">
                You may re-apply with corrected information. Click the "Re-apply Now" button above.
            </p>
        </div>
        """

    # Contract number display section
    contract_section = ""
    if status == "Approved" and contract_number:
        contract_section = f"""
        <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 16px; text-align: center;">
            <div style="font-size: 14px; color: #047857; margin-bottom: 8px; letter-spacing: 1px;">CONTRACT NUMBER</div>
            <div style="font-size: 28px; font-weight: 700; color: #065f46; letter-spacing: 2px; font-family: monospace;">{contract_number}</div>
            <div style="font-size: 11px; color: #059669; margin-top: 8px;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
            <div style="font-size: 11px; color: #047857; margin-top: 6px;">Please keep this number for future reference</div>
        </div>
        """
    
    # Billing date display section
    billing_section = ""
    if status == "Approved" and billing_date:
        billing_section = f"""
        <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
            <div>
                <div style="font-size: 12px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">BILLING INFORMATION</div>
                <div style="font-size: 16px; font-weight: 600; color: #1e3a8a;">Every {billing_date} of the month</div>
                <div style="font-size: 11px; color: #3b82f6; margin-top: 4px;">Your monthly bill will be generated on this date</div>
            </div>
        </div>
        """

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cablevision Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #eef2ff;">
        
        <div style="max-width: 580px; margin: 0 auto; padding: 30px 20px;">
            <div style="background: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.15);">
                
                <!-- HEADER SECTION -->
                <div style="background: linear-gradient(135deg, #001f3f 0%, #002b5c 100%); padding: 32px 28px; text-align: center;">
                    <div style="position: absolute; top: 20px; right: 25px;">
                        <span style="background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 50px; font-size: 11px; font-weight: 600; color: #a5f3fc;">STATUS UPDATE</span>
                    </div>
                    <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff;">Cablevision</h1>
                    <p style="margin: 6px 0 0 0; color: #93c5fd; font-size: 13px;">Internet Service Provider</p>
                </div>

                <!-- STATUS BADGE -->
                <div style="padding: 20px 28px 0 28px; text-align: center;">
                    <div style="display: inline-block; background: {status_bg}; padding: 8px 24px; border-radius: 60px;">
                        <span style="font-size: 14px; font-weight: 600; color: {status_color};">
                            {status_icon} APPLICATION {status.upper()}
                        </span>
                    </div>
                </div>

                <!-- CONTENT SECTION -->
                <div style="padding: 20px 28px 32px 28px;">
                    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a;">{message}</h2>
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">{message_sub}</p>

                    <!-- Application Details -->
                    <div style="background: #f8fafc; border-radius: 20px; padding: 18px; margin-bottom: 16px;">
                        <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                            <div style="font-size: 11px; font-weight: 600; color: #64748b;">Application Number</div>
                            <div style="font-size: 18px; font-weight: 700; color: #0f172a; font-family: monospace;">{app_id}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 600; color: #64748b;">Status</div>
                            <div style="font-size: 16px; font-weight: 700; color: {status_color};">{status}</div>
                        </div>
                    </div>

                    {contract_section}
                    {billing_section}
                    {reapply_section}
                    {extra_message}

                    <div style="margin-top: 28px; padding-top: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            Thank you for choosing Cablevision!
                        </p>
                    </div>
                </div>

                <!-- FOOTER -->
                <div style="background: #f1f5f9; padding: 16px 28px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b;">
                        © 2026 Cablevision Internet Service Provider. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("mixed")
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(html_body, "html"))

    # ================= PDF ATTACHMENT =================
    if status == "Approved":
        try:
            pdf_app_key = application_id if application_id else app_id
            
            if pdf_app_key:
                print(f" Generating PDF for application: {pdf_app_key}")
                # Fetch application data from MySQL
                query = "SELECT * FROM applications WHERE application_number = %s"
                app_data = execute_query(query, (pdf_app_key,), fetch_one=True)
                
                if app_data:
                    pdf_buffer = generate_application_pdf(pdf_app_key, app_data, contract_number)
                    
                    if pdf_buffer:
                        part = MIMEApplication(pdf_buffer.read(), _subtype="pdf")
                        part.add_header(
                            'Content-Disposition',
                            'attachment',
                            filename=f"Application_{app_id}_Contract_{contract_number}.pdf" if contract_number else f"Application_{app_id}.pdf"
                        )
                        msg.attach(part)
                        print(f" PDF attached successfully for application {pdf_app_key}")
                    else:
                        print(" PDF buffer is empty")
                else:
                    print(f" Could not find application data for: {pdf_app_key}")
            else:
                print(f" Could not find application key for app_id: {app_id}")

        except Exception as e:
            print(" PDF attachment failed:", e)
            import traceback
            traceback.print_exc()

    # ================= SEND EMAIL =================
    try:
        print("🔹 Sending email with PDF attachment...")
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_app_password)
        server.send_message(msg)
        server.quit()
        print(f" Email sent to {to_email} with PDF attachment")
        return True

    except Exception as e:
        print(f" Email failed: {e}")
        return False

@app.route("/api/superadmin/contracts/<contract_number>", methods=["POST"])
def save_contract(contract_number):
    print(f"🟢🟢🟢 SAVE_CONTRACT CALLED! Contract: {contract_number}")
    
    try:
        data = request.get_json()
        print(f"🟢 Data received: {data}")
        
        if not data:
            print("❌ No data received!")
            return jsonify({"error": "No data provided"}), 400
        
        # I-print ang lahat ng keys at values para makita kung may mali
        print(f"🟢 Data keys: {list(data.keys())}")
        
        # Check if contract already exists
        check_query = "SELECT contract_number FROM contracts WHERE contract_number = %s"
        existing = execute_query(check_query, (contract_number,), fetch_one=True)
        print(f"🟢 Existing contract: {existing}")
        
        # Prepare data for insert
        insert_data = data.copy()
        
        # Convert application_data to JSON if it's a dict
        if 'application_data' in insert_data and isinstance(insert_data['application_data'], dict):
            insert_data['application_data'] = json.dumps(insert_data['application_data'])
            print(f"🟢 Converted application_data to JSON")
        
        # Remove any keys that might cause issues
        if 'id' in insert_data:
            del insert_data['id']
        
        # I-print ang final data bago i-insert
        print(f"🟢 Final data for insert: {insert_data}")
        
        # Build INSERT query
        columns = ', '.join(insert_data.keys())
        placeholders = ', '.join(['%s'] * len(insert_data))
        insert_query = f"INSERT INTO contracts ({columns}) VALUES ({placeholders})"
        print(f"🟢 Insert query: {insert_query}")
        print(f"🟢 Values: {list(insert_data.values())}")
        
        # Execute insert
        result = execute_query(insert_query, list(insert_data.values()))
        print(f"🟢 Execute result: {result}")
        
        # Verify if inserted
        verify_query = "SELECT * FROM contracts WHERE contract_number = %s"
        verify_result = execute_query(verify_query, (contract_number,), fetch_one=True)
        print(f"🟢 Verification result: {verify_result}")
        
        if verify_result:
            print(f"✅ Contract {contract_number} successfully saved to MySQL!")
            return jsonify({"success": True, "message": "Contract saved successfully"})
        else:
            print(f"❌ Contract {contract_number} was NOT saved!")
            return jsonify({"error": "Contract was not saved"}), 500
        
    except Exception as e:
        print(f"❌ Error saving contract: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

import json
# ===============================
# GET CONTRACT BY NUMBER - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/contracts/<contract_number>", methods=["GET"])
def get_contract(contract_number):
    try:
        query = "SELECT * FROM contracts WHERE contract_number = %s"
        contract = execute_query(query, (contract_number,), fetch_one=True)
        
        if not contract:
            return jsonify({"error": "Contract not found"}), 404
        
        # Parse application_data back to dict if it's a JSON string
        if contract.get('application_data') and isinstance(contract.get('application_data'), str):
            try:
                contract['application_data'] = json.loads(contract['application_data'])
            except:
                pass
        
        return jsonify(contract)
        
    except Exception as e:
        print("Error getting contract:", e)
        return jsonify({"error": str(e)}), 500
    
# ===============================
# DOWNLOAD CONTRACT PDF - CONVERTED TO MYSQL
# ===============================
@app.route("/superadmin/download/contract/<app_id>/<contract_number>")
def download_contract_pdf(app_id, contract_number):
    """Generate and download contract PDF - with Addendum and Installment on second page"""
    try:
        # ========== 1. FETCH DATA FROM MYSQL ==========
        # Get application data
        app_query = "SELECT * FROM applications WHERE application_number = %s"
        application_data = execute_query(app_query, (app_id,), fetch_one=True)
        
        if not application_data:
            return "Application not found", 404
        
        # Get contract data
        contract_query = "SELECT * FROM contracts WHERE contract_number = %s"
        contract_data = execute_query(contract_query, (contract_number,), fetch_one=True)
        
        # Parse JSON fields
        if application_data.get('tv_qty'):
            try:
                application_data['tv_qty'] = json.loads(application_data['tv_qty'])
            except:
                application_data['tv_qty'] = []
        
        if application_data.get('tv_brand'):
            try:
                application_data['tv_brand'] = json.loads(application_data['tv_brand'])
            except:
                application_data['tv_brand'] = []
        
        if application_data.get('tv_type'):
            try:
                application_data['tv_type'] = json.loads(application_data['tv_type'])
            except:
                application_data['tv_type'] = []
        
        signature_data = application_data.get('signature')
        
        # If no contract data, create from application data
        if not contract_data:
            first_name = application_data.get('first_name', '')
            middle_name = application_data.get('middle_name', '')
            last_name = application_data.get('last_name', '')
            full_name = ' '.join(filter(None, [first_name, middle_name, last_name])).strip()
            contract_data = {
                'full_name': full_name,
                'first_name': first_name,
                'middle_name': middle_name,
                'last_name': last_name,
                'age': calculate_age(application_data.get('birthdate', '')),
                'civil_status': application_data.get('civil_status', ''),
                'address': f"{application_data.get('barangay', '')}, {application_data.get('city', '')}, {application_data.get('province', '')}".strip(', '),
                'billing_date': application_data.get('billing_date', ''),
                'date_submitted': application_data.get('date_submitted', ''),
                'contract_number': contract_number,
                'signature': signature_data,
                'plan': application_data.get('plan', ''),
                'plan_speed': application_data.get('plan_speed', ''),
                'installation_fee': application_data.get('installation_fee', ''),
                'first_installment_date': application_data.get('first_installment_date', ''),
                'last_installment_date': application_data.get('last_installment_date', '')
            }
        
        full_name = contract_data.get('full_name', '')
        if not full_name:
            first = contract_data.get('first_name', '') or application_data.get('first_name', '')
            middle = contract_data.get('middle_name', '') or application_data.get('middle_name', '')
            last = contract_data.get('last_name', '') or application_data.get('last_name', '')
            full_name = ' '.join(filter(None, [first, middle, last])).strip()
        if not full_name:
            full_name = "Customer Name Not Available"
        
        age = contract_data.get('age', '') or calculate_age(application_data.get('birthdate', ''))
        civil_status = contract_data.get('civil_status', '') or application_data.get('civil_status', '')
        address = contract_data.get('address', '') or f"{application_data.get('barangay', '')}, {application_data.get('city', '')}, {application_data.get('province', '')}".strip(', ')
        billing_date = contract_data.get('billing_date', '') or application_data.get('billing_date', '')
        date_submitted = contract_data.get('date_submitted', '') or application_data.get('date_submitted', '')
        plan_name = contract_data.get('plan', '') or application_data.get('plan', '')
        plan_speed = contract_data.get('plan_speed', '') or application_data.get('plan_speed', '')
        installation_fee = contract_data.get('installation_fee', '') or application_data.get('installation_fee', '')
        first_installment = contract_data.get('first_installment_date', '') or application_data.get('first_installment_date', '')
        last_installment = contract_data.get('last_installment_date', '') or application_data.get('last_installment_date', '')
        
        # Check if installment plan
        is_installment = False
        if installation_fee:
            fee_lower = installation_fee.lower()
            if 'installment' in fee_lower:
                is_installment = True
        
        # Format dates for display
        def format_month_year(date_str):
            if not date_str:
                return '_____________'
            try:
                year, month = date_str.split('-')
                month_names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                return f"{month_names[int(month) - 1]} {year}"
            except:
                return '_____________'
        
        first_installment_formatted = format_month_year(first_installment)
        last_installment_formatted = format_month_year(last_installment)
        approval_date = datetime.now().strftime('%B %d, %Y')
        
        # ========== 2. PDF SETUP ==========
        from reportlab.lib.pagesizes import LEGAL
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        import io, base64, requests, os
        from flask import current_app, send_file
        
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(buffer, pagesize=LEGAL,
                                rightMargin=36, leftMargin=36,
                                topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet()
        story = []
        
        # ========== 3. STYLES ==========
        header_style = ParagraphStyle(
            'HeaderStyle',
            parent=styles['Normal'],
            fontSize=11,
            alignment=1,
            spaceAfter=2,
            fontName='Times-Bold'
        )
        heading_style = ParagraphStyle(
            'HeadingStyle',
            parent=styles['Normal'],
            fontSize=11,
            alignment=1,
            spaceBefore=8,
            spaceAfter=6,
            fontName='Times-Bold'
        )
        contract_style = ParagraphStyle(
            'ContractStyle',
            parent=styles['Normal'],
            fontSize=8.5,
            leading=10,
            alignment=4,
            spaceAfter=2
        )
        addendum_style = ParagraphStyle(
            'AddendumStyle',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            alignment=4,
            spaceAfter=4
        )
        signature_name_style = ParagraphStyle(
            'SignatureNameStyle',
            parent=styles['Normal'],
            fontSize=9,
            alignment=1,
            fontName='Helvetica',
            textDecoration='underline'
        )
        signature_label_style = ParagraphStyle(
            'SignatureLabelStyle',
            parent=styles['Normal'],
            fontSize=7,
            alignment=1,
            fontName='Helvetica',
            textColor=colors.grey
        )
        
        # Helper function for signature image
        def get_signature_image(signature_data, width=180, height=50):
            try:
                if not signature_data:
                    return None
                if isinstance(signature_data, str):
                    if 'base64,' in signature_data:
                        signature_data = signature_data.split('base64,')[1]
                    image_bytes = base64.b64decode(signature_data)
                    img = Image(io.BytesIO(image_bytes), width=width, height=height)
                    img.drawWidth = width
                    img.drawHeight = height
                    return img
                elif signature_data.startswith(('http://','https://')):
                    resp = requests.get(signature_data)
                    if resp.status_code == 200:
                        img = Image(io.BytesIO(resp.content), width=width, height=height)
                        img.drawWidth = width
                        img.drawHeight = height
                        return img
                return None
            except Exception as e:
                print(f"Signature error: {e}")
                return None
        
        signature_img = get_signature_image(signature_data, 180, 50)
        
        # ========== PAGE 1: HEADER AND MAIN CONTRACT ==========
        left_logo_path = os.path.join(current_app.root_path, 'static', 'logo.png')
        right_logo_path = os.path.join(current_app.root_path, 'static', 'logo_right.png')
        
        left_logo_exists = os.path.exists(left_logo_path)
        right_logo_exists = os.path.exists(right_logo_path)
        
        left_logo = None
        right_logo = None
        
        if left_logo_exists:
            left_logo = Image(left_logo_path, width=60, height=60)
        if right_logo_exists:
            right_logo = Image(right_logo_path, width=60, height=60)
        
        title_1 = Paragraph("CABLE TELEVISION/CABLE ONLY/OR", header_style)
        title_2 = Paragraph("CABLE &amp; INTERNET SERVICE CONTRACT", header_style)
        title_3 = Paragraph(f"NO. <u>{contract_number}</u>", header_style)
        
        center_text = Table(
            [[title_1], [title_2], [Spacer(1, 2)], [title_3]],
            colWidths=[360]
        )
        center_text.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ]))
        
        if left_logo_exists and right_logo_exists:
            header_table = Table([[left_logo, center_text, right_logo]], colWidths=[70, 360, 70])
        elif left_logo_exists and not right_logo_exists:
            header_table = Table([[left_logo, center_text, '']], colWidths=[70, 360, 70])
        elif not left_logo_exists and right_logo_exists:
            header_table = Table([['', center_text, right_logo]], colWidths=[70, 360, 70])
        else:
            header_table = Table([[center_text]], colWidths=[500])
        
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (0,0), 'LEFT'),
            ('ALIGN', (1,0), (1,0), 'CENTER'),
            ('ALIGN', (2,0), (2,0), 'RIGHT'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        
        story.append(header_table)
        story.append(Spacer(1, 12))
        story.append(Paragraph("CONTRACT TERMS AND CONDITIONS", heading_style))
        story.append(Spacer(1, 3))
        
        # Opening statement
        story.append(Paragraph(
            f"I, <strong>{full_name}</strong>, legal age, <strong>{age}</strong> years old, {civil_status} "
            f"and residing at <strong>{address}</strong> hereby apply and subscribed for the service of "
            f"CABLE &amp; INTERNET and agree to the following terms and conditions:",
            contract_style
        ))
        story.append(Spacer(1, 4))
        
        # Payment (continued - rest of the contract text remains the same)
        payment_text = (
            f"<strong>Payment:</strong> The subscriber shall pay a Non-Refundable connection fee of P 1800 and "
            f"cable in excess of 100 meters at P10.00 per meter. For CABLE/INTERNET BUNDLE subscriber, a one (1) "
            f"month subscription fee of P800 shall be paid upon installation and activation of the service. "
            f"Succeeding monthly subscription fee is due and payable every <strong>{billing_date}</strong> of each month. "
            f"Failure to pay the monthly subscription fee on due date and after the grace period of 7 days will mean "
            f"automatic disconnection of cable/internet service. "
            f"<strong>For CABLE SUBSCRIBER ONLY</strong>, subscriber shall pay a monthly subscription fee of P per month "
            f"from the period the TV set is activated on or before of each month. "
            f"The company shall have the right to discontinue/terminate/cancel and effect disconnection of Cable TV services "
            f"in case of default or non-payment of accounts for two (2) succeeding payments."
        )
        story.append(Paragraph(payment_text, contract_style))
        story.append(Spacer(1, 2))
        
        # Deposit
        story.append(Paragraph(
            "<strong>Deposit:</strong> Subscriber, who leases his/her house or does not own the house where service "
            "will be installed, shall pay a DEPOSIT upon installation. A deposit equivalent to one (1) month subscription fee "
            "for CABLE/INTERNET BUNDLE subscriber while two (2) months subscription fee for CABLE SUBSCRIBER ONLY. "
            "The said deposit cannot be applied to the monthly fee and shall only be refunded upon termination of the contract "
            "and upon pull out of all equipment installed in the premises of the subscriber. Should the subscriber wishes to apply "
            "for reconnection, a reconnection fee of P500.00 shall be paid plus the Deposit and the one (1) month advance "
            "subscription fee for CABLE/INTERNET BUNDLE subscriber. For CABLE SUBSCRIBER ONLY, a reconnection fee of P300.00 "
            "plus the DEPOSIT shall be paid.",
            contract_style
        ))
        story.append(Spacer(1, 2))
        
        # Access to the Premises
        story.append(Paragraph(
            "<strong>Access to the Premises:</strong> The subscriber authorizes our employees, contractors and "
            "representatives to enter your premise in order to install, maintain, inspect, repair, remove and replace "
            "Equipment at a time mutually agreeable upon by both parties.",
            contract_style
        ))
        story.append(Spacer(1, 2))
        
        # Subscriber Usage
        story.append(Paragraph(
            "<strong>Subscriber Usage:</strong> The subscriber shall not in any way use his subscription for commercial purposes. "
            "Transmission of any Internet content which violates national or international law is prohibited. This includes but "
            "not limited to copyrighted materials, those legally adjudged to be threat to national security, or intruding into the "
            "privacy of individuals, offensive on moral, religious, racial or political grounds; abusive, indecent, obscene or "
            "menacing nature of material or information, infringement of intellectual property rights of any person as well as trade secrets.",
            contract_style
        ))
        story.append(Spacer(1, 2))
        
        # Relocating Equipment
        story.append(Paragraph(
            "<strong>Relocating Equipment:</strong> The subscriber is not allowed to relocate equipment installed in their premises. "
            "However, equipment may be relocated by the company's authorized representatives upon the request of the subscriber at a time "
            "mutually agreeable to both parties. Applicable fees and charges may apply.",
            contract_style
        ))
        story.append(Spacer(1, 2))
        
        # Cable Modem and Setup Box
        story.append(Paragraph(
            "<strong>Cable Modem and Setup Box:</strong> The subscriber will be given FREE USE of a Cable Modem and Set Top Box. "
            "This equipment will remain the property of CABLEVISION SYSTEMS CORP. For any Cable TV Extension the subscriber will have to pay "
            "for the cost of the SET TOP BOX amounting to 1400 and a HUB amounting to 420. There will be no additional cost on the monthly "
            "subscription. All equipment has one (1) year warranty against factory defects. If the defect was due to improper use and mishandling "
            "by the user during the warranty period, the cost of replacement will be chargeable to the account of the subscriber. If cable modem "
            "or Set Top Box becomes defective after the warranty period, cost of the new equipment is chargeable to the subscriber.",
            contract_style
        ))
        story.append(Spacer(1, 2))
        
        # Termination/Suspension
        story.append(Paragraph(
            "<strong>Termination/Suspension of Service:</strong> The company reserves the right to suspend or terminate this contract without "
            "prior notice and pull out equipment provided at the subscriber's premises due to non-payment of all applicable fees and charges within "
            "the period and shall not be held liable for any damage; or loss which the Subscriber may incur by reason of suspension and/or termination "
            "of services based on this agreement.",
            contract_style
        ))
        story.append(Spacer(1, 2))
        
        # Disclaimer
        disclaimer_text = (
            "<strong>Disclaimer:</strong> Cablevision Systems Corp./MyCv Broadband shall not be held liable for any damages or delay in business transaction "
            "or communication of the subscriber or whatsoever, the subscriber may suffer or may have suffered due to the use of myCv Broadband Services. "
            "This includes but not limited to any loss of profits, incidental or consequential damages arising out of the Costumer's use of or inability to use; "
            "any loss of information howsoever caused whether as a result of any interruption, suspension, or termination of the Service or otherwise, or for the "
            "contents, accuracy or quality of information available, received or transmitted through the Service; or for failure of the Subscriber to comply with "
            "applicable laws, rules and regulations and all the terms prescribed by the Philippine National Telecommunications Commission for the use of any "
            "telecommunication systems, service or equipment. myCv Broadband shall not be liable for any delay or failure in the performance of service under "
            "this agreement resulting from acts beyond its control, including without limitation, acts of God, acts or regulations of any government or national authority, "
            "war or national emergency, accident, fire, electric power failure, temporary loss of signal not attributed to myCv Broadband, lightning, strikes, lock-outs, "
            "industrial disputes whether or not involving myCv Broadband employees."
        )
        story.append(Paragraph(disclaimer_text, contract_style))
        story.append(Spacer(1, 2))
        
        # Right to modify
        story.append(Paragraph(
            "myCv Broadband reserves the right to adjust, modify, amend or supplements these terms and condition as the service may require. "
            "myCv Broadband will advise SUBSCRIBER of any change by sending him notice setting out these changes.",
            contract_style
        ))
        story.append(Spacer(1, 2))
        
        # Governing Law
        story.append(Paragraph(
            "<strong>Governing Law and Jurisdiction:</strong> The Laws of the Republic of the Philippines governs this Agreement and the Subscriber and myCv Broadband "
            "hereby submit to the exclusive jurisdiction of the courts of Sta. Cruz, Laguna, Philippines.",
            contract_style
        ))
        story.append(Spacer(1, 6))
        
        # Acknowledgment
        story.append(Paragraph(
            "I hereby acknowledge that I have read and understood all the terms and conditions herein and that I voluntarily sign this agreement with full knowledge "
            "and consent of everything this Agreement contains, implies and entails.",
            contract_style
        ))
        story.append(Spacer(1, 10))
        
        # Top Signature Section
        if signature_img:
            top_left_data = [
                [signature_img],
                [Spacer(1, 3)],
                [Paragraph(f"<u>{full_name}</u>", signature_name_style)],
                [Spacer(1, 2)],
                [Paragraph("Subscriber's Signature Over Printed Name", signature_label_style)]
            ]
        else:
            top_left_data = [
                [Paragraph("_________________________", signature_label_style)],
                [Spacer(1, 3)],
                [Paragraph(f"<u>{full_name}</u>", signature_name_style)],
                [Spacer(1, 2)],
                [Paragraph("Subscriber's Signature Over Printed Name", signature_label_style)]
            ]
        
        top_right_data = [
            [Spacer(1, 50)],
            [Paragraph(f"<u>{date_submitted}</u>", signature_name_style)],
            [Spacer(1, 2)],
            [Paragraph("Date", signature_label_style)]
        ]
        
        top_left_table = Table(top_left_data, colWidths=[220])
        top_left_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        
        top_right_table = Table(top_right_data, colWidths=[220])
        top_right_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        
        top_signature_table = Table([[top_left_table, top_right_table]], colWidths=[220, 220])
        top_signature_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        story.append(top_signature_table)
        
        # ========== PAGE BREAK ==========
        story.append(PageBreak())
        
        # ========== PAGE 2: ADDENDUM AND INSTALLMENT SECTIONS ==========
        story.append(Spacer(1, 30))
        story.append(Paragraph("<strong>CABLEVISION SYSTEMS CORPORATION</strong>", heading_style))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"<strong>ADDENDUM TO CONTRACT NUMBER {contract_number}</strong>", heading_style))
        story.append(Spacer(1, 15))
        
        addendum_text = (
            f"That I, <strong>{full_name}</strong> holder of CONTRACT Number <strong>{contract_number}</strong> dated <strong>{approval_date}</strong> "
            f"wishes to avail of your INTERNET SERVICE under <strong>{plan_name} ({plan_speed})</strong>. To take effect on <strong>_________________________</strong>."
        )
        story.append(Paragraph(addendum_text, addendum_style))
        story.append(Spacer(1, 8))
        
        story.append(Paragraph(
            "This is also to acknowledge that I have to pay in advance the monthly dues corresponding to the plan that I choose and it is understood that the "
            "TERMS AND CONDITIONS on the original contract remain.",
            addendum_style
        ))
        story.append(Spacer(1, 25))
        
        # INSTALLMENT SECTION
        story.append(Paragraph("<strong>AGREEMENT TO PAY ON INSTALLMENT</strong>", heading_style))
        story.append(Paragraph("<strong>FOR THE INSTALLATION FEE AND/OR SET TOP BOX FOR TV EXTENSION</strong>", heading_style))
        story.append(Spacer(1, 15))
        
        if is_installment:
            display_full_name = full_name
            display_contract_number = contract_number
            display_first_date = first_installment_formatted
            display_last_date = last_installment_formatted
        else:
            display_full_name = '_____________'
            display_contract_number = '_____________'
            display_first_date = '_____________'
            display_last_date = '_____________'
        
        installment_text = (
            f"That I, <strong>{display_full_name}</strong> holder of contract no. <strong>{display_contract_number}</strong> wishes to avail of the INSTALLMENT PLAN "
            f"for the INSTALLATION FEE starting <strong>{display_first_date}</strong> up to <strong>{display_last_date}</strong> "
            f"and the SET TOP BOX for our <strong>_________</strong> TV Extension/s for five (5) months."
        )
        
        story.append(Paragraph(installment_text, addendum_style))
        story.append(Spacer(1, 12))
        
        story.append(Paragraph(
            "<strong>NOTE:</strong> In the event that the account is disconnected during the said period, the remaining installment shall be paid in full.",
            addendum_style
        ))
        story.append(Spacer(1, 40))
        
        # Bottom Signature Section
        if signature_img:
            bottom_signature_data = [
                [signature_img],
                [Spacer(1, 5)],
                [Paragraph(f"<u>{full_name}</u>", signature_name_style)],
                [Spacer(1, 2)],
                [Paragraph("Signature over printed name", signature_label_style)]
            ]
        else:
            bottom_signature_data = [
                [Paragraph("_________________________", signature_label_style)],
                [Spacer(1, 5)],
                [Paragraph(f"<u>{full_name}</u>", signature_name_style)],
                [Spacer(1, 2)],
                [Paragraph("Signature over printed name", signature_label_style)]
            ]
        
        bottom_signature_table = Table(bottom_signature_data, colWidths=[250])
        bottom_signature_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        
        right_aligned_table = Table([[bottom_signature_table]], colWidths=[500])
        right_aligned_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        
        story.append(right_aligned_table)
        
        # ========== BUILD PDF ==========
        doc.build(story)
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"Service_Contract_{contract_number}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error generating contract PDF: {e}")
        import traceback
        traceback.print_exc()
        return f"Error generating PDF: {str(e)}", 500


# ===============================
# CALCULATE AGE - CONVERTED TO MYSQL (No changes needed)
# ===============================
def calculate_age(birthdate):
    if not birthdate:
        return ''
    try:
        from datetime import datetime
        birth = datetime.strptime(birthdate, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth.year
        if (today.month, today.day) < (birth.month, birth.day):
            age -= 1
        return str(age)
    except:
        return ''
    
    
def generate_application_pdf(application_number, application_data=None, contract_number=None):
    """Generate PDF for an application using MySQL data"""
    import io, base64
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import requests
    import json

    # If data not provided, fetch from MySQL
    if application_data is None:
        query = """
            SELECT * FROM applications 
            WHERE application_number = %s
        """
        application_data = execute_query(query, (application_number,), fetch_one=True)
    
    if not application_data:
        print(f"❌ Application not found for: {application_number}")
        return None
    
    # Parse JSON fields (tv_qty, tv_brand, tv_type)
    if application_data.get('tv_qty'):
        try:
            application_data['tv_qty'] = json.loads(application_data['tv_qty'])
        except:
            application_data['tv_qty'] = []
    
    if application_data.get('tv_brand'):
        try:
            application_data['tv_brand'] = json.loads(application_data['tv_brand'])
        except:
            application_data['tv_brand'] = []
    
    if application_data.get('tv_type'):
        try:
            application_data['tv_type'] = json.loads(application_data['tv_type'])
        except:
            application_data['tv_type'] = []
    
    # Add contract number to data if provided
    if contract_number:
        application_data["contract_number"] = contract_number

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # ================= MAX PAGES =================
    MAX_PAGES = 4
    current_page = 1
    y = height - 120

    # ================= HEADER =================
    def draw_header():
        nonlocal y
        try:
            logo = ImageReader("static/logo1.png")
            p.drawImage(logo, 40, height - 90, width=60, height=60, mask='auto')
        except:
            pass

        p.setFont("Helvetica-Bold", 16)
        p.drawString(110, height - 60, "APPLICATION FORM")

        p.setFont("Helvetica-Bold", 10)
        p.drawRightString(width - 50, height - 60, f"Application No: {application_number}")

        p.setFont("Helvetica", 8)
        p.drawString(110, height - 75, "Sitio Sampaguita, Brgy. Pagsawitan, Santa Cruz, 4009 Laguna")
        p.drawString(110, height - 87, "Tel: (049) 501-1495 | Fax: (049) 501-0229 | Mobile: 0917 501 0341")

        y = height - 110

    def draw_page_number():
        p.setFont("Helvetica-Bold", 10)
        p.setFillColorRGB(0.4, 0.4, 0.4)
        p.drawRightString(width - 25, 20, str(current_page))
        p.setFillColorRGB(0, 0, 0)

    def new_page():
        nonlocal y, current_page
        if current_page >= MAX_PAGES:
            return False
        p.showPage()
        current_page += 1
        draw_header()
        draw_page_number()
        y = height - 110
        return True

    def ensure_space(required):
        nonlocal y
        if y - required < 50:
            return new_page()
        return True

    def draw_section_title(title):
        nonlocal y
        ensure_space(30)
        p.setFont("Helvetica-Bold", 12)
        p.setFillColorRGB(0, 0.4, 0.6)
        p.drawString(50, y, title)
        p.setFillColorRGB(0, 0, 0)
        y -= 22

    def draw_section_title_centered(title):
        nonlocal y
        ensure_space(30)
        p.setFont("Helvetica-Bold", 14)
        p.setFillColorRGB(0, 0.4, 0.6)
        p.drawCentredString(width / 2, y, title)
        p.setFillColorRGB(0, 0, 0)
        y -= 25

    # Two-column field drawer
    def draw_two_columns(fields):
        nonlocal y
        col1_x = 50
        col2_x = 310
        label_width = 120
        value_x = col1_x + label_width + 5
        
        for i in range(0, len(fields), 2):
            ensure_space(20)
            # Left column
            label1, value1 = fields[i]
            p.setFont("Helvetica-Bold", 9)
            p.drawString(col1_x, y, f"{label1}:")
            p.setFont("Helvetica", 9)
            val1_str = str(value1) if value1 and value1 != "-" and value1 != "none" else "___________________"
            if len(val1_str) > 35:
                val1_str = val1_str[:32] + "..."
            p.drawString(value_x, y, val1_str)
            
            # Right column
            if i + 1 < len(fields):
                label2, value2 = fields[i + 1]
                p.setFont("Helvetica-Bold", 9)
                p.drawString(col2_x, y, f"{label2}:")
                p.setFont("Helvetica", 9)
                val2_str = str(value2) if value2 and value2 != "-" and value2 != "none" else "___________________"
                if len(val2_str) > 30:
                    val2_str = val2_str[:27] + "..."
                p.drawString(col2_x + label_width + 5, y, val2_str)
            
            y -= 18
        y -= 5

    # Draw images top and bottom
    def draw_images_top_bottom(label1, img1_data, label2, img2_data, img_width=280, img_height=190):
        nonlocal y
        
        # Front ID
        ensure_space(img_height + 60)
        p.setFont("Helvetica-Bold", 11)
        p.drawCentredString(width / 2, y, label1)
        y -= 22
        
        if img1_data:
            try:
                if "base64," in str(img1_data):
                    img1_data = img1_data.split(",")[1]
                img = ImageReader(io.BytesIO(base64.b64decode(img1_data)))
                x_center = (width - img_width) / 2
                p.drawImage(img, x_center, y - img_height, img_width, img_height, preserveAspectRatio=True, mask='auto')
                y -= img_height + 35
            except Exception as e:
                print(f"Image error: {e}")
                p.drawCentredString(width / 2, y, "[Image error]")
                y -= 25
        else:
            p.drawCentredString(width / 2, y, "Not provided")
            y -= 25
        
        # Back ID
        ensure_space(img_height + 60)
        p.setFont("Helvetica-Bold", 11)
        p.drawCentredString(width / 2, y, label2)
        y -= 22
        
        if img2_data:
            try:
                if "base64," in str(img2_data):
                    img2_data = img2_data.split(",")[1]
                img = ImageReader(io.BytesIO(base64.b64decode(img2_data)))
                x_center = (width - img_width) / 2
                p.drawImage(img, x_center, y - img_height, img_width, img_height, preserveAspectRatio=True, mask='auto')
                y -= img_height + 35
            except Exception as e:
                print(f"Image error: {e}")
                p.drawCentredString(width / 2, y, "[Image error]")
                y -= 25
        else:
            p.drawCentredString(width / 2, y, "Not provided")
            y -= 25

    # Signature section
    def draw_signature_section(signature_img, full_name):
        nonlocal y
        
        y -= 15
        
        sig_width = 250
        sig_height = 85
        if signature_img:
            try:
                if "base64," in str(signature_img):
                    signature_img = signature_img.split(",")[1]
                img = ImageReader(io.BytesIO(base64.b64decode(signature_img)))
                x_center = (width - sig_width) / 2
                p.drawImage(img, x_center, y - sig_height, sig_width, sig_height, preserveAspectRatio=True, mask='auto')
            except Exception as e:
                print(f"Signature error: {e}")
                p.setFont("Helvetica", 9)
                p.drawCentredString(width / 2, y, "[Signature not displayable]")
        else:
            p.setFont("Helvetica", 9)
            p.drawCentredString(width / 2, y, "No signature provided")
        
        y -= sig_height + 20
        
        p.setFont("Helvetica", 10)
        p.drawCentredString(width / 2, y, full_name if full_name else "_________________________")
        y -= 20
        
        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.4, 0.4, 0.4)
        p.drawCentredString(width / 2, y, "signature over printed name")
        p.setFillColorRGB(0, 0, 0)
        y -= 30

    # ================= START BUILDING =================
    draw_header()
    draw_page_number()

    # ================= PAGE 1 =================
    draw_section_title("I. PERSONAL INFORMATION")
    draw_two_columns([
        ("Last Name", application_data.get("last_name")),
        ("First Name", application_data.get("first_name")),
        ("Middle Name", application_data.get("middle_name")),
        ("Suffix", application_data.get("suffix")),
        ("Date of Birth", application_data.get("birthdate")),
        ("Place of Birth", application_data.get("place_of_birth")),
        ("Sex", application_data.get("sex")),
        ("Civil Status", application_data.get("civil_status")),
        ("Citizenship", application_data.get("citizenship")),
        ("Occupation", application_data.get("occupation")),
    ])

    draw_section_title("II. FAMILY DETAILS")
    draw_two_columns([
        ("Mother's Maiden Name", application_data.get("mother_maiden_name")),
        ("Father's Name", application_data.get("father_name")),
    ])

    draw_section_title("III. CONTACT & ADDRESS")
    draw_two_columns([
        ("Mobile Number", application_data.get("mobile")),
        ("Email Address", application_data.get("email")),
        ("Home Ownership", application_data.get("home_ownership")),
        ("House No./Unit", application_data.get("house_number")),
        ("Nearest Landmark", application_data.get("landmark")),
        ("Street/Village", application_data.get("address")),
    ])

    # Billing Address
    p.setFont("Helvetica-Bold", 9)
    p.drawString(50, y, "Billing Address:")
    p.setFont("Helvetica", 9)
    
    billing_address = application_data.get("billing_address", "")
    if not billing_address or billing_address == "-" or billing_address == "none":
        billing_address = "_________________________"
    
    from reportlab.pdfbase.pdfmetrics import stringWidth
    max_width = 400
    words = billing_address.split()
    lines = []
    current_line = ""
    
    for word in words:
        test_line = current_line + (" " if current_line else "") + word
        if stringWidth(test_line, "Helvetica", 9) <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    for line in lines:
        p.drawString(170, y, line)
        y -= 14
    y -= 5

    draw_section_title("IV. EMPLOYMENT DETAILS")
    draw_two_columns([
        ("Employer / Company", application_data.get("employer")),
        ("Business Phone", application_data.get("business_phone")),
        ("Business Address", application_data.get("business_address")),
        ("", ""),
    ])

    civil_status = application_data.get("civil_status", "")
    if civil_status and civil_status.lower() in ["married", "Married"]:
        draw_section_title("V. SPOUSE INFORMATION")
        draw_two_columns([
            ("Spouse Full Name", application_data.get("spouse_name")),
            ("Spouse Occupation", application_data.get("spouse_occupation")),
            ("Spouse Employer", application_data.get("spouse_employer")),
            ("Spouse Phone", application_data.get("spouse_phone")),
        ])

    draw_section_title("VI. SERVICE PLAN")
    draw_two_columns([
        ("Service Type / Plan", application_data.get("service_type")),
        ("Installation Fee", application_data.get("installation_fee")),
    ])

    # Installation Phone
    p.setFont("Helvetica-Bold", 9)
    p.drawString(50, y, "Installation Phone:")
    p.setFont("Helvetica", 9)
    installation_phone = application_data.get("installation_phone", "")
    if not installation_phone or installation_phone == "-" or installation_phone == "none":
        installation_phone = "_________________________"
    p.drawString(170, y, installation_phone)
    y -= 18
    y -= 5

    # Installation Address
    p.setFont("Helvetica-Bold", 9)
    p.drawString(50, y, "Installation Address:")
    p.setFont("Helvetica", 9)
    
    installation_address = application_data.get("installation_address", "")
    if not installation_address or installation_address == "-" or installation_address == "none":
        installation_address = "_________________________"
    
    words = installation_address.split()
    lines = []
    current_line = ""
    
    for word in words:
        test_line = current_line + (" " if current_line else "") + word
        if stringWidth(test_line, "Helvetica", 9) <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    for line in lines:
        p.drawString(170, y, line)
        y -= 14
    y -= 5

    # TV SET DETAILS
    tv_qty = application_data.get("tv_qty", [])
    tv_brand = application_data.get("tv_brand", [])
    tv_type = application_data.get("tv_type", [])
    
    if tv_qty and any(tv_qty):
        draw_section_title("VII. TV SET DETAILS")
        ensure_space(40)
        
        p.setFont("Helvetica-Bold", 9)
        p.drawString(50, y, "QTY")
        p.drawString(120, y, "BRAND / MODEL")
        p.drawString(320, y, "TYPE (HD/REGULAR)")
        y -= 15
        
        p.setFont("Helvetica", 9)
        for i in range(min(len(tv_qty), 5)):
            if y < 120:
                break
            qty = str(tv_qty[i]) if i < len(tv_qty) else "-"
            brand = tv_brand[i] if i < len(tv_brand) else "-"
            if len(brand) > 25:
                brand = brand[:22] + "..."
            tv_t = tv_type[i] if i < len(tv_type) else "-"
            
            p.drawString(50, y, qty)
            p.drawString(120, y, brand)
            p.drawString(320, y, tv_t)
            y -= 16
        y -= 5

    draw_section_title("VIII. SUBMISSION DETAILS")
    draw_two_columns([
        ("Date Submitted", application_data.get("date_submitted")),
        ("Time Submitted", application_data.get("time_submitted")),
    ])

    full_name = f"{application_data.get('first_name', '')} {application_data.get('last_name', '')}".strip()
    draw_signature_section(application_data.get("signature"), full_name)

    # ================= PAGE 2: MAP =================
    new_page()
    draw_section_title_centered("INSTALLATION LOCATION MAP")

    lat = application_data.get("latitude")
    lng = application_data.get("longitude")
    google_maps_url = None
    google_maps_direction_url = None
    map_img = None

    try:
        if lat and lng:
            lat = float(lat)
            lng = float(lng)
            
            google_maps_url = f"https://www.google.com/maps?q={lat},{lng}"
            google_maps_direction_url = f"https://www.google.com/maps/dir//{lat},{lng}"
            
            map_url = f"https://maps.locationiq.com/v3/staticmap?key=pk.0fdad07272d959e4de881139988b0883&center={lat},{lng}&zoom=17&size=600x400&markers=icon:large-red-cutout|{lat},{lng}"
            response = requests.get(map_url, timeout=10)
            if response.status_code == 200:
                map_img = ImageReader(io.BytesIO(response.content))
    except Exception as e:
        print("Map error:", e)

    draw_two_columns([
        ("Street/Village", application_data.get("address")),
        ("Barangay/City", f"{application_data.get('barangay', '-')}, {application_data.get('city', '-')}"),
        ("Latitude", lat if lat else "-"),
        ("Longitude", lng if lng else "-"),
    ])

    if google_maps_direction_url:
        ensure_space(25)
        p.setFont("Helvetica-Bold", 12)
        p.setFillColorRGB(0, 0.5, 0)
        p.drawCentredString(width / 2, y, "📍 GET DIRECTIONS from your current location to this address")
        text_width = p.stringWidth("📍 GET DIRECTIONS from your current location to this address", "Helvetica-Bold", 12)
        p.linkURL(google_maps_direction_url, ((width - text_width) / 2, y - 2, (width + text_width) / 2, y + 12), relative=0)
        p.setFillColorRGB(0, 0, 0)
        y -= 20
        
        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.5, 0.5, 0.5)
        p.drawCentredString(width / 2, y, "👉 Click above to see distance from YOUR location, travel time, and turn-by-turn directions")
        p.setFillColorRGB(0, 0, 0)
        y -= 20

    if google_maps_url:
        p.setFont("Helvetica", 9)
        p.setFillColorRGB(0, 0, 1)
        p.drawCentredString(width / 2, y, "Or click here to view location on Google Maps")
        text_width = p.stringWidth("Or click here to view location on Google Maps", "Helvetica", 9)
        p.linkURL(google_maps_url, ((width - text_width) / 2, y - 2, (width + text_width) / 2, y + 8), relative=0)
        p.setFillColorRGB(0, 0, 0)
        y -= 30

    if map_img:
        ensure_space(380)
        img_width = 500
        img_height = 320
        x_center = (width - img_width) / 2
        p.drawImage(map_img, x_center, y - img_height, img_width, img_height)
        y -= img_height + 20
        
        p.setFont("Helvetica", 8)
        p.setFillColorRGB(0.5, 0.5, 0.5)
        p.drawCentredString(width / 2, y, "💡 Tip: Click the green 'GET DIRECTIONS' link above to see distance from your current location")
        p.setFillColorRGB(0, 0, 0)
        y -= 15
    else:
        draw_two_columns([("Map Status", "Not available")])

    # ================= PAGE 3: FRONT AND BACK ID =================
    new_page()
    draw_section_title_centered("VALID IDENTIFICATION")
    
    draw_images_top_bottom(
        "VALID ID (FRONT)", application_data.get("id_front"),
        "VALID ID (BACK)", application_data.get("id_back"),
        img_width=320, img_height=220
    )

    # ================= PAGE 4: PROOF OF BILLING =================
    new_page()
    draw_section_title_centered("PROOF OF BILLING")
    
    proof = application_data.get("proof_billing")
    if proof:
        try:
            if "base64," in str(proof):
                proof = proof.split(",")[1]
            img = ImageReader(io.BytesIO(base64.b64decode(proof)))
            img_width = 500
            img_height = 580
            x_center = (width - img_width) / 2
            p.drawImage(img, x_center, y - img_height, img_width, img_height, preserveAspectRatio=True, mask='auto')
            y -= img_height + 30
        except Exception as e:
            print(f"Proof of billing error: {e}")
            p.drawCentredString(width / 2, y, "Image not renderable")
            y -= 30
    else:
        p.drawCentredString(width / 2, y, "No proof of billing provided")
        y -= 30

    p.save()
    buffer.seek(0)
    return buffer

# ===============================
# DELETE APPLICATION - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/application/<string:app_id>", methods=["DELETE"])
def delete_application(app_id):
    try:
        # Check if application exists
        check_query = "SELECT application_number FROM applications WHERE application_number = %s"
        existing = execute_query(check_query, (app_id,), fetch_one=True)
        
        if not existing:
            return jsonify({"error": "Application not found"}), 404
        
        # Delete the application from applications table
        delete_query = "DELETE FROM applications WHERE application_number = %s"
        execute_query(delete_query, (app_id,))
        
        # Also delete from customers table if exists (to keep data consistent)
        delete_customer_query = "DELETE FROM customers WHERE application_number = %s"
        execute_query(delete_customer_query, (app_id,))
        
        print(f"✅ Application {app_id} deleted successfully from MySQL")
        
        return jsonify({"message": "Application deleted successfully"})
        
    except Exception as e:
        print("Delete application error:", e)
        return jsonify({"error": str(e)}), 500
    

# ===============================
# GET ALL APPROVAL REQUESTS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/approval-requests", methods=["GET"])
def get_approval_requests():
    try:
        query = """
            SELECT id, request_id, app_id, requested_by, requested_status, 
                   status, admin_id, admin_area, admin_city, reason,
                   contract_number, billing_date, date_requested, processed_at
            FROM approval_requests 
            ORDER BY id DESC
        """
        data = execute_query(query, fetch=True) or []

        requests = []
        for req in data:
            requests.append({
                "id": req.get('request_id') or str(req.get('id')),
                "app_id": req.get("app_id"),
                "requested_by": req.get("requested_by"),
                "requested_status": req.get("requested_status"),
                "status": req.get("status"),
                "admin_id": req.get("admin_id"),
                "admin_area": req.get("admin_area"),
                "admin_city": req.get("admin_city"),
                "reason": req.get("reason"),
                "contract_number": req.get("contract_number"),
                "billing_date": req.get("billing_date"),
                "date_requested": req.get("date_requested"),
                "processed_at": req.get("processed_at")
            })

        return jsonify(requests)
        
    except Exception as e:
        print(f"Error getting approval requests: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# GET SINGLE APPROVAL REQUEST - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/approval-request/<string:request_id>", methods=["GET"])
def get_approval_request(request_id):
    try:
        print(f"Looking for approval request with ID: {request_id}")
        
        query = """
            SELECT id, request_id, app_id, requested_by, requested_status, 
                   status, admin_id, admin_area, admin_city, reason,
                   contract_number, billing_date, date_requested, processed_at
            FROM approval_requests 
            WHERE request_id = %s OR id = %s
        """
        request_data = execute_query(query, (request_id, request_id), fetch_one=True)
        
        print(f"Found data: {request_data}")
        
        if request_data:
            result = {
                "id": request_data.get('request_id') or str(request_data.get('id')),
                "app_id": request_data.get("app_id"),
                "requested_by": request_data.get("requested_by"),
                "requested_status": request_data.get("requested_status"),
                "status": request_data.get("status"),
                "admin_id": request_data.get("admin_id"),
                "admin_area": request_data.get("admin_area"),
                "admin_city": request_data.get("admin_city"),
                "date_requested": request_data.get("date_requested"),
                "reason": request_data.get("reason"),
                "contract_number": request_data.get("contract_number"),
                "billing_date": request_data.get("billing_date"),
                "processed_at": request_data.get("processed_at")
            }
            return jsonify(result)
        else:
            return jsonify({"error": "Request not found"}), 404
            
    except Exception as e:
        print(f"Error getting approval request: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/superadmin/approval-request/<string:req_id>", methods=["PUT"])
def approve_request(req_id):
    conn = None
    cursor = None
    try:
        print("=" * 60)
        print("🚀 APPROVE REQUEST STARTED")
        print(f"📝 Request ID: {req_id}")
        
        request_data = request.get_json()
        print(f"📝 Request data: {request_data}")
        
        contract_number = request_data.get("contract_number", None)
        billing_date = request_data.get("billing_date", None)
        first_installment_date = request_data.get("first_installment_date", None)
        last_installment_date = request_data.get("last_installment_date", None)
        
        print(f"🔍 Contract: {contract_number}, Billing: {billing_date}")
        print(f"🔍 Installment dates - First: {first_installment_date}, Last: {last_installment_date}")
        
        # Open database connection
        import mysql.connector
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="cablevision_db"
        )
        cursor = conn.cursor(dictionary=True)
        print("✅ Database connected")
        
        # Get the approval request
        req_query = """
            SELECT id, request_id, app_id, requested_by, requested_status, status,
                   admin_id, admin_area, admin_city, reason
            FROM approval_requests 
            WHERE request_id = %s OR id = %s
        """
        cursor.execute(req_query, (req_id, req_id))
        req = cursor.fetchone()
        print(f"📝 Approval request found: {req}")

        if not req:
            return jsonify({"error": "Request not found"}), 404

        app_id = req.get("app_id")
        requested_status = req.get("requested_status")
        requested_by = req.get("requested_by", "Unknown Admin")
        reason = req.get("reason", "")
        admin_id = req.get("admin_id")
        admin_area = req.get("admin_area")
        admin_city = req.get("admin_city")
        
        print(f"📝 App ID: {app_id}, Requested Status: {requested_status}")
        
        # Check if request is already processed
        if req.get("status") == "Done":
            return jsonify({"error": "This request has already been processed"}), 400

        # Get application data
        app_query = "SELECT * FROM applications WHERE application_number = %s"
        cursor.execute(app_query, (app_id,))
        app_data = cursor.fetchone()
        print(f"📝 Application data status: {app_data.get('status') if app_data else 'Not found'}")

        if not app_data:
            return jsonify({"error": "Application not found"}), 404

        if app_data.get("status") != "Request Sent":
            return jsonify({"error": f"Application status is '{app_data.get('status')}', cannot process this request"}), 400

        # Generate contract number if needed
        if requested_status == "Approved":
            if not contract_number or contract_number.strip() == "":
                import random
                import string
                date_part = datetime.now().strftime("%Y%m%d")
                random_part = ''.join(random.choices(string.digits, k=4))
                contract_number = f"CV-{date_part}-{random_part}"
                print(f"🔑 Auto-generated contract number: {contract_number}")
            
            if not billing_date or billing_date.strip() == "":
                billing_date = "15th"
                print(f"📅 Default billing date set to: {billing_date}")

        # ========== 1. UPDATE APPLICATIONS TABLE ==========
        update_fields = ["status = %s"]
        params = [requested_status]
        
        if requested_status == "Approved":
            update_fields.append("contract_number = %s")
            params.append(contract_number)
            update_fields.append("billing_date = %s")
            params.append(billing_date)
            update_fields.append("approval_date = %s")
            params.append(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            update_fields.append("installation_status = %s")
            params.append("Pending")
            if first_installment_date:
                update_fields.append("first_installment_date = %s")
                params.append(first_installment_date)
            if last_installment_date:
                update_fields.append("last_installment_date = %s")
                params.append(last_installment_date)
        elif requested_status == "Rejected" and reason:
            update_fields.append("rejection_reason = %s")
            params.append(reason)

        params.append(app_id)
        update_query = f"UPDATE applications SET {', '.join(update_fields)} WHERE application_number = %s"
        print(f"📝 UPDATE QUERY: {update_query}")
        print(f"📝 PARAMS: {params}")
        
        cursor.execute(update_query, params)
        print(f"✅ Application updated, rows affected: {cursor.rowcount}")

        # ========== 2. INSERT/UPDATE CUSTOMERS TABLE (if approved) ==========
        if requested_status == "Approved":
            current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            customer_data = {
                "application_number": app_data.get("application_number"),
                "first_name": app_data.get("first_name"),
                "last_name": app_data.get("last_name"),
                "middle_name": app_data.get("middle_name"),
                "suffix": app_data.get("suffix"),
                "email": app_data.get("email"),
                "mobile": app_data.get("mobile"),
                "address": app_data.get("address"),
                "barangay": app_data.get("barangay"),
                "city": app_data.get("city"),
                "province": app_data.get("province"),
                "zip": app_data.get("zip"),
                "plan": app_data.get("plan"),
                "status": "Approved",
                "installation_status": "Pending",
                "contract_number": contract_number,
                "billing_date": billing_date,
                "approval_date": current_datetime,
                "date_pending": current_datetime,
                "first_installment_date": first_installment_date,
                "last_installment_date": last_installment_date
            }
            
            customer_data = {k: v for k, v in customer_data.items() if v is not None}
            
            print("📝 CUSTOMER DATA:", customer_data)
            
            app_number = app_data.get("application_number")
            cursor.execute("SELECT application_number FROM customers WHERE application_number = %s", (app_number,))
            existing_customer = cursor.fetchone()
            
            if not existing_customer:
                columns = ', '.join(customer_data.keys())
                placeholders = ', '.join(['%s'] * len(customer_data))
                insert_query = f"INSERT INTO customers ({columns}) VALUES ({placeholders})"
                cursor.execute(insert_query, list(customer_data.values()))
                print(f"✅ Customer record INSERTED for {app_number}")
            else:
                update_customer_fields = []
                update_params = []
                for key, value in customer_data.items():
                    update_customer_fields.append(f"{key} = %s")
                    update_params.append(value)
                update_params.append(app_number)
                update_customer_query = f"UPDATE customers SET {', '.join(update_customer_fields)} WHERE application_number = %s"
                cursor.execute(update_customer_query, update_params)
                print(f"✅ Customer record UPDATED for {app_number}")

        # ========== 3. SAVE TO CONTRACTS TABLE (if approved) ==========
        if requested_status == "Approved":
            fullName = ' '.join(filter(None, [
                app_data.get('first_name', ''),
                app_data.get('middle_name', ''),
                app_data.get('last_name', ''),
                app_data.get('suffix', '')
            ])).strip()
            
            date_submitted_val = app_data.get('date_submitted')
            if date_submitted_val:
                if hasattr(date_submitted_val, 'strftime'):
                    date_submitted_str = date_submitted_val.strftime("%Y-%m-%d")
                else:
                    date_submitted_str = str(date_submitted_val)
            else:
                date_submitted_str = datetime.now().strftime("%Y-%m-%d")
            
            contract_data = {
                "contract_number": contract_number,
                "application_id": app_id,
                "first_name": app_data.get('first_name'),
                "middle_name": app_data.get('middle_name'),
                "last_name": app_data.get('last_name'),
                "suffix": app_data.get('suffix'),
                "full_name": fullName,
                "age": calculate_age(app_data.get('birthdate', '')),
                "civil_status": app_data.get('civil_status'),
                "address": f"{app_data.get('barangay', '')}, {app_data.get('city', '')}, {app_data.get('province', '')}".strip(', '),
                "barangay": app_data.get('barangay'),
                "city": app_data.get('city'),
                "province": app_data.get('province'),
                "billing_date": billing_date,
                "date_submitted": date_submitted_str,
                "status": "Active",
                "created_at": datetime.now().isoformat(),
                "is_installment_plan": 1 if first_installment_date else 0,
                "first_installment_date": first_installment_date,
                "last_installment_date": last_installment_date,
                "installation_fee": app_data.get('installation_fee'),
                "application_data": json.dumps(app_data, default=str)
            }
            
            contract_data = {k: v for k, v in contract_data.items() if v is not None}
            
            for key, value in contract_data.items():
                if hasattr(value, 'isoformat'):
                    contract_data[key] = value.isoformat()
                elif hasattr(value, 'strftime'):
                    contract_data[key] = value.strftime("%Y-%m-%d %H:%M:%S")
            
            cursor.execute("SELECT contract_number FROM contracts WHERE contract_number = %s", (contract_number,))
            existing_contract = cursor.fetchone()
            
            if not existing_contract:
                columns = ', '.join(contract_data.keys())
                placeholders = ', '.join(['%s'] * len(contract_data))
                insert_query = f"INSERT INTO contracts ({columns}) VALUES ({placeholders})"
                cursor.execute(insert_query, list(contract_data.values()))
                print(f"✅ Contract {contract_number} INSERTED")
            else:
                update_contract_fields = []
                update_params = []
                for key, value in contract_data.items():
                    if key != 'contract_number':
                        update_contract_fields.append(f"{key} = %s")
                        update_params.append(value)
                update_params.append(contract_number)
                update_contract_query = f"UPDATE contracts SET {', '.join(update_contract_fields)} WHERE contract_number = %s"
                cursor.execute(update_contract_query, update_params)
                print(f"✅ Contract {contract_number} UPDATED")

        # ========== 4. CREATE NOTIFICATION FOR ADMIN (in admin_notifications) ==========
        applicant_name = f"{app_data.get('first_name', '')} {app_data.get('last_name', '')}".strip()
        application_number = app_data.get('application_number', 'N/A')
        action_status = request_status = requested_status
        
        admin_notification_id = int(datetime.now().timestamp() * 1000)
        
        admin_notif_query = """
            INSERT INTO admin_notifications 
            (id, title, message, type, relatedId, request_id, timestamp, read_status,
             admin_id, admin_area, admin_city, requested_by, requested_status, 
             application_city, action_taken_by, action_status, contract_number, billing_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        admin_notif_params = (
            admin_notification_id,
            f"Request {requested_status} - Application {application_number}",
            f"Your request to {requested_status.lower()} {applicant_name}'s application ({application_number}) has been {requested_status.upper()} by superadmin.",
            "request_approved" if requested_status == "Approved" else "request_rejected",
            app_id,
            req_id,
            datetime.now().isoformat(),
            0,  # read_status = 0 (unread)
            admin_id,
            admin_area,
            admin_city,
            requested_by,
            requested_status,
            app_data.get('city', ''),
            "superadmin",
            action_status,
            contract_number if requested_status == "Approved" else None,
            billing_date if requested_status == "Approved" else None
        )
        
        cursor.execute(admin_notif_query, admin_notif_params)
        print(f"✅ Admin notification created for {admin_id} (ID: {admin_notification_id})")

        # ========== 5. MARK REQUEST AS DONE ==========
        processed_at_str = datetime.now().isoformat()
        update_req_query = """
            UPDATE approval_requests 
            SET status = 'Done', 
                contract_number = %s, 
                billing_date = %s, 
                processed_at = %s
            WHERE request_id = %s OR id = %s
        """
        cursor.execute(update_req_query, (contract_number, billing_date, processed_at_str, req_id, req_id))
        print(f"✅ Request {req_id} marked as Done, rows affected: {cursor.rowcount}")

        # ========== 6. CREATE GENERAL NOTIFICATION (for superadmin audit) ==========
        general_notification_id = int(datetime.now().timestamp() * 1000) + 1
        general_notif_query = """
            INSERT INTO notifications 
            (id, title, message, type, relatedId, timestamp, read_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(general_notif_query, (
            general_notification_id,
            f"Admin Request {requested_status}",
            f"Superadmin {requested_status.upper()} {requested_by}'s request to {requested_status.lower()} {applicant_name}'s application ({application_number})",
            "superadmin_action",
            app_id,
            datetime.now().isoformat(),
            0
        ))
        print(f"✅ General notification created (ID: {general_notification_id})")

        # ========== 7. COMMIT ALL CHANGES ==========
        conn.commit()
        print("✅ All changes COMMITTED to database")
        
        # ========== 8. VERIFY ALL UPDATES ==========
        cursor.execute("SELECT status, contract_number FROM applications WHERE application_number = %s", (app_id,))
        app_verified = cursor.fetchone()
        print(f"🔍 APPLICATION VERIFIED - Status: {app_verified.get('status') if app_verified else 'Not found'}")
        
        if requested_status == "Approved":
            cursor.execute("SELECT application_number FROM customers WHERE application_number = %s", (app_id,))
            customer_verified = cursor.fetchone()
            print(f"🔍 CUSTOMER VERIFIED - Exists: {customer_verified is not None}")
            
            cursor.execute("SELECT contract_number FROM contracts WHERE contract_number = %s", (contract_number,))
            contract_verified = cursor.fetchone()
            print(f"🔍 CONTRACT VERIFIED - Exists: {contract_verified is not None}")
        
        cursor.execute("SELECT status FROM approval_requests WHERE request_id = %s OR id = %s", (req_id, req_id))
        req_verified = cursor.fetchone()
        print(f"🔍 REQUEST VERIFIED - Status: {req_verified.get('status') if req_verified else 'Not found'}")
        
        cursor.execute("SELECT id FROM admin_notifications WHERE id = %s", (admin_notification_id,))
        notif_verified = cursor.fetchone()
        print(f"🔍 ADMIN NOTIFICATION VERIFIED - Exists: {notif_verified is not None}")

        # ========== 9. SEND EMAIL ==========
        try:
            applicant_email = app_data.get("email")
            if applicant_email:
                send_application_status_email(
                    to_email=applicant_email,
                    first_name=applicant_name,
                    status=requested_status,
                    app_id=application_number,
                    reason=reason if requested_status == "Rejected" else None,
                    contract_number=contract_number if requested_status == "Approved" else None,
                    billing_date=billing_date if requested_status == "Approved" else None,
                    application_id=app_id,
                    reapplied_count=app_data.get("reapplied_count", 0)
                )
                print(f"✅ Email sent to {applicant_email}")
        except Exception as email_err:
            print(f"⚠️ Error sending email: {email_err}")

        # ========== 10. RETURN SUCCESS RESPONSE ==========
        response_data = {
            "message": f"Request {requested_status} successfully",
            "contract_number": contract_number if requested_status == "Approved" else None,
            "billing_date": billing_date if requested_status == "Approved" else None,
            "status": requested_status,
            "request_status": "Done"
        }
        
        response_data = {k: v for k, v in response_data.items() if v is not None}
        
        print("=" * 60)
        print("✅ APPROVE REQUEST COMPLETED SUCCESSFULLY")
        print(f"📤 RESPONSE: {response_data}")
        print("=" * 60)
        
        return jsonify(response_data)

    except Exception as e:
        print(f"❌ Error in approve_request: {e}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()
            print("⚠️ Transaction rolled back")
        return jsonify({"error": str(e)}), 500
    
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("🔒 Database connection closed")



# ===============================
# SUPERADMIN REJECTS REQUEST (PATCH) - FIXED INSERT
# ===============================
@app.route("/api/superadmin/approval-request/<string:req_id>", methods=["PATCH"])
def reject_request(req_id):
    try:
        # Get the approval request from MySQL
        req_query = """
            SELECT id, request_id, app_id, requested_by, requested_status, status,
                   admin_id, admin_area, admin_city, reason
            FROM approval_requests 
            WHERE request_id = %s OR id = %s
        """
        req_data = execute_query(req_query, (req_id, req_id), fetch_one=True)
        
        if not req_data:
            return jsonify({"error": "Request not found"}), 404

        app_id = req_data.get("app_id")
        requested_status = req_data.get("requested_status", "Rejected")
        requested_by = req_data.get("requested_by", "Unknown Admin")
        reason = req_data.get("reason", "No specific reason provided")
        
        # Get application data
        app_query = "SELECT * FROM applications WHERE application_number = %s"
        app_data = execute_query(app_query, (app_id,), fetch_one=True)
        
        # Mark request as rejected
        update_req_query = """
            UPDATE approval_requests 
            SET status = 'Rejected', processed_at = %s
            WHERE request_id = %s OR id = %s
        """
        execute_query(update_req_query, (datetime.now().isoformat(), req_id, req_id))
        
        # Revert application back to Pending
        update_app_query = "UPDATE applications SET status = 'Pending' WHERE application_number = %s"
        execute_query(update_app_query, (app_id,))
        print(f"✅ Application {app_id} reverted to Pending status")
        
        # ========== SEND EMAIL TO APPLICANT ==========
        try:
            applicant_email = app_data.get("email") if app_data else None
            applicant_name = f"{app_data.get('first_name', '')} {app_data.get('last_name', '')}".strip() if app_data else "Applicant"
            application_number = app_data.get("application_number", "N/A") if app_data else "N/A"
            
            if applicant_email:
                send_application_status_email(
                    to_email=applicant_email,
                    first_name=applicant_name,
                    status="Request Rejected",
                    app_id=application_number,
                    reason=f"The admin's request to {requested_status.lower()} your application was rejected. Reason: {reason}",
                    contract_number=None,
                    billing_date=None,
                    application_id=app_id,
                    reapplied_count=0
                )
                print(f"✅ Email sent to {applicant_email} about request rejection")
        except Exception as email_err:
            print(f"⚠ Error sending email: {email_err}")
        
        # ========== CREATE NOTIFICATION FOR ADMIN ==========
        admin_id = req_data.get("admin_id")
        admin_area = req_data.get("admin_area") or ""
        admin_city = req_data.get("admin_city") or ""
        applicant_name = f"{app_data.get('first_name', '')} {app_data.get('last_name', '')}".strip() if app_data else "Unknown"
        application_number = app_data.get('application_number', 'N/A') if app_data else 'N/A'
        application_city = app_data.get('city', '') if app_data else ''
        
        # FIXED: Simplified INSERT - only include columns that exist
        admin_notification_id = int(datetime.now().timestamp() * 1000)
        
        # First, check what columns exist in your table
        # Based on your structure, these are the columns: id, title, message, type, relatedId, 
        # request_id, timestamp, read_status, admin_id, admin_area, admin_city, requested_by,
        # requested_status, application_city, created_at
        
        admin_notif_query = """
            INSERT INTO admin_notifications 
            (id, title, message, type, relatedId, request_id, timestamp, read_status,
             admin_id, admin_area, admin_city, requested_by, requested_status, application_city)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        admin_notif_params = (
            admin_notification_id,
            f"Request {requested_status} Rejected",
            f"Your request to {requested_status.lower()} {applicant_name}'s application ({application_number}) has been REJECTED by superadmin. The application remains in Pending status.\nReason: {reason}",
            "request_rejected",
            app_id,
            req_id,
            datetime.now().isoformat(),
            0,  # read_status = 0 (unread)
            admin_id,
            admin_area,
            admin_city,
            requested_by,
            requested_status,
            application_city
        )
        
        print(f"📝 Inserting admin notification with params: {admin_notif_params}")
        execute_query(admin_notif_query, admin_notif_params)
        print(f"✅ Admin notification created for {admin_id}")
        
        # Optional: Insert into general notifications (if table exists)
        try:
            general_notification_id = int(datetime.now().timestamp() * 1000) + 1
            general_notif_query = """
                INSERT INTO notifications 
                (id, title, message, type, relatedId, timestamp, read_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            execute_query(general_notif_query, (
                general_notification_id,
                f"Admin Request {requested_status} Rejected",
                f"Superadmin REJECTED {requested_by}'s request to {requested_status.lower()} {applicant_name}'s application ({application_number})",
                "superadmin_action",
                app_id,
                datetime.now().isoformat(),
                0
            ))
            print("✅ General notification created")
        except Exception as gen_err:
            print(f"⚠️ General notification insert failed (may be optional): {gen_err}")
        
        return jsonify({
            "message": "Request rejected, application reverted to Pending, email sent to applicant"
        })

    except Exception as e:
        print(f"❌ Error in reject_request: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    

@app.route("/api/test-insert-notification", methods=["GET"])
def test_insert_notification():
    try:
        import time
        notification_id = int(time.time() * 1000)
        
        query = """
            INSERT INTO admin_notifications 
            (id, title, message, type, read_status, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """
        result = execute_query(query, (notification_id, "Test", "Test message", "test", 0))
        
        return jsonify({
            "success": True,
            "notification_id": notification_id,
            "result": result
        })
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500    
    
# =============================== 
# View Customers (Approved applications) 
# ===============================
@app.route("/superadmin/view-customers")
def superadmin_view_customers_page():
    return render_template("superadmin-view-customers.html")


@app.route("/api/superadmin/approved-applications", methods=["GET"])
def get_approved_customers():
    try:
        limit = int(request.args.get("limit", 50))
        
        # Optional filters
        city_filter = request.args.get("city", "")
        search_term = request.args.get("search", "")
        
        # Build query for customers table
        query = """
            SELECT 
                application_number, contract_number, first_name, last_name, 
                middle_name, suffix, email, mobile, address, barangay, city, 
                province, zip, plan, status, installation_status, 
                approval_date, billing_date, created_at
            FROM customers 
            WHERE 1=1
        """
        params = []
        
        # Add city filter
        if city_filter and city_filter != "all":
            query += " AND city = %s"
            params.append(city_filter)
        
        # Add search filter
        if search_term:
            query += """ AND (first_name LIKE %s OR last_name LIKE %s 
                       OR email LIKE %s OR application_number LIKE %s 
                       OR contract_number LIKE %s)"""
            search_pattern = f"%{search_term}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])
        
        # Add order by and limit
        query += " ORDER BY approval_date DESC LIMIT %s"
        params.append(limit)
        
        # Execute query
        customers = execute_query(query, params, fetch=True) or []
        
        # Get plans for speed lookup
        plans_query = "SELECT name, speed FROM plans"
        plans = execute_query(plans_query, fetch=True) or []
        
        # Create plan speed mapping
        plan_speed_map = {}
        for plan in plans:
            plan_name = (plan.get('name') or '').strip().lower()
            if plan_name:
                plan_speed_map[plan_name] = plan.get('speed', '')
        
        customers_list = []
        for cust in customers:
            plan_name = (cust.get('plan') or '').strip().lower()
            plan_speed = plan_speed_map.get(plan_name, 'N/A')
            
            # Build full name
            full_name_parts = []
            if cust.get('first_name'):
                full_name_parts.append(cust['first_name'])
            if cust.get('middle_name'):
                full_name_parts.append(cust['middle_name'])
            if cust.get('last_name'):
                full_name_parts.append(cust['last_name'])
            if cust.get('suffix'):
                full_name_parts.append(cust['suffix'])
            full_name = ' '.join(full_name_parts).strip() or 'N/A'
            
            customers_list.append({
                "id": cust.get('application_number'),
                "application_number": cust.get('application_number', ''),
                "contract_number": cust.get('contract_number', 'N/A'),
                "first_name": cust.get('first_name', ''),
                "last_name": cust.get('last_name', ''),
                "full_name": full_name,
                "email": cust.get('email', ''),
                "mobile": cust.get('mobile', ''),
                "plan": cust.get('plan', ''),
                "speed": plan_speed,
                "status": cust.get('status', 'Approved'),
                "installation_status": cust.get('installation_status', 'Pending'),
                "approval_date": cust.get('approval_date', ''),
                "billing_date": cust.get('billing_date', ''),
                "city": cust.get('city', ''),
                "barangay": cust.get('barangay', ''),
                "address": cust.get('address', '')
            })
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) as total FROM customers WHERE 1=1"
        count_params = []
        
        if city_filter and city_filter != "all":
            count_query += " AND city = %s"
            count_params.append(city_filter)
        
        if search_term:
            count_query += """ AND (first_name LIKE %s OR last_name LIKE %s 
                       OR email LIKE %s OR application_number LIKE %s 
                       OR contract_number LIKE %s)"""
            count_params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])
        
        total_result = execute_query(count_query, count_params, fetch_one=True)
        total_count = total_result['total'] if total_result else 0
        
        return jsonify({
            "customers": customers_list,
            "total": total_count,
            "limit": limit
        })
        
    except Exception as e:
        print("Error fetching customers:", e)
        return jsonify({"error": str(e)}), 500
    


@app.route("/api/superadmin/installation-summary", methods=["GET"])
def get_superadmin_installation_summary():
    try:
        from datetime import datetime, timedelta

        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        area = request.args.get("area")

        # Convert input to datetime
        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_date = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1, seconds=-1)

        # Build query for customers
        query = """
            SELECT date_pending, date_ongoing, date_installed, city, installation_status
            FROM customers 
            WHERE status = 'Approved'
        """
        params = []
        
        # Add area filter if specified
        if area and area != "":
            query += " AND city = %s"
            params.append(area.upper())
        
        # Execute query
        customers = execute_query(query, params, fetch=True) or []

        installation_summary = {
            "Pending": 0,
            "Ongoing": 0,
            "Installed": 0
        }

        def parse_date(d):
            if not d:
                return None
            try:
                return datetime.strptime(d, "%Y-%m-%d %H:%M:%S")
            except:
                try:
                    return datetime.strptime(d, "%Y-%m-%d")
                except:
                    return None

        matched_customers = 0

        for cust in customers:
            # Parse all dates
            dates = {
                "Pending": parse_date(cust.get("date_pending")),
                "Ongoing": parse_date(cust.get("date_ongoing")),
                "Installed": parse_date(cust.get("date_installed")),
            }

            # Filter dates within range
            filtered_dates = {}
            for status, dt in dates.items():
                if dt:
                    date_in_range = True
                    if start_date and dt < start_date:
                        date_in_range = False
                    if end_date and dt > end_date:
                        date_in_range = False
                    
                    if date_in_range:
                        filtered_dates[status] = dt

            if not filtered_dates:
                continue

            # Get the latest date in range
            latest_status = max(filtered_dates, key=lambda k: filtered_dates[k])
            installation_summary[latest_status] += 1
            matched_customers += 1

        # Prepare response
        response = {
            "installation_summary": installation_summary,
            "area": area if area else "All Areas",
            "total_matched": matched_customers,
            "date_range": {
                "start": start_date.strftime("%Y-%m-%d") if start_date else None,
                "end": (end_date + timedelta(seconds=1)).strftime("%Y-%m-%d") if end_date else None
            }
        }

        return jsonify(response), 200

    except Exception as e:
        print("Error in installation summary:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Server error", "details": str(e)}), 500
    
    


# =============================== 
# View Single Customer Application (Superadmin) 
# ===============================
@app.route("/superadmin/view-customer-application/<customer_id>")
def superadmin_view_customer_application(customer_id):
    return render_template("superadmin-view-customer-application.html", customer_id=customer_id)


# =============================== 
# API Get Single Approved Customer - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/customer/<customer_id>")
def get_single_customer(customer_id):
    try:
        # Get customer data from customers table (approved applications only)
        customer_query = """
            SELECT * FROM customers 
            WHERE application_number = %s AND status = 'Approved'
        """
        customer_data = execute_query(customer_query, (customer_id,), fetch_one=True)
        
        if not customer_data:
            return jsonify({"error": "Customer not found or not approved"}), 404
        
        # Get additional data from applications table if needed
        app_query = """
            SELECT * FROM applications 
            WHERE application_number = %s
        """
        app_data = execute_query(app_query, (customer_id,), fetch_one=True)
        
        # Merge data (customer data has priority for customer-specific fields)
        if app_data:
            # Parse JSON fields from applications
            if app_data.get('tv_qty'):
                try:
                    app_data['tv_qty'] = json.loads(app_data['tv_qty'])
                except:
                    app_data['tv_qty'] = []
            
            if app_data.get('tv_brand'):
                try:
                    app_data['tv_brand'] = json.loads(app_data['tv_brand'])
                except:
                    app_data['tv_brand'] = []
            
            if app_data.get('tv_type'):
                try:
                    app_data['tv_type'] = json.loads(app_data['tv_type'])
                except:
                    app_data['tv_type'] = []
            
            # Merge data (customer data overrides)
            result = {**app_data, **customer_data}
        else:
            result = customer_data
        
        # Parse JSON fields in customer data if any
        if result.get('tv_qty') and isinstance(result.get('tv_qty'), str):
            try:
                result['tv_qty'] = json.loads(result['tv_qty'])
            except:
                result['tv_qty'] = []
        
        if result.get('tv_brand') and isinstance(result.get('tv_brand'), str):
            try:
                result['tv_brand'] = json.loads(result['tv_brand'])
            except:
                result['tv_brand'] = []
        
        if result.get('tv_type') and isinstance(result.get('tv_type'), str):
            try:
                result['tv_type'] = json.loads(result['tv_type'])
            except:
                result['tv_type'] = []
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting single customer: {e}")
        return jsonify({"error": str(e)}), 500


        
# =============================== 
# UPDATE INSTALLATION STATUS - CONVERTED TO MYSQL (MATCHING YOUR TABLE)
# ===============================        
@app.route("/api/superadmin/installation-status/<application_id>", methods=["PUT"])
def update_installation_status(application_id):
    try:
        from datetime import datetime
        import random

        data = request.json
        new_status = data.get("installation_status")

        if not new_status:
            return jsonify({"error": "Status required"}), 400

        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # ========== CHECK IF CUSTOMER EXISTS ==========
        customer_query = "SELECT * FROM customers WHERE application_number = %s"
        customer_data = execute_query(customer_query, (application_id,), fetch_one=True)
        
        if not customer_data:
            return jsonify({"error": "Customer not found"}), 404

        # ========== UPDATE CUSTOMERS TABLE ==========
        update_fields = ["installation_status = %s"]
        params = [new_status]
        
        if new_status == "Ongoing":
            update_fields.append("date_ongoing = %s")
            params.append(current_time)
        elif new_status == "Installed":
            update_fields.append("date_installed = %s")
            params.append(current_time)
        
        params.append(application_id)
        update_query = f"UPDATE customers SET {', '.join(update_fields)} WHERE application_number = %s"
        execute_query(update_query, params)
        print(f"✅ Customer {application_id} installation status updated to {new_status}")

        # ========== ALSO UPDATE APPLICATIONS TABLE ==========
        app_update_query = "UPDATE applications SET installation_status = %s WHERE application_number = %s"
        execute_query(app_update_query, (new_status, application_id))

        # ========== AUTO CREATE USER IF INSTALLED ==========
        user_created = False
        new_user_id = None
        
        if new_status == "Installed":
            # Check if user already exists for this customer
            check_user_sql = "SELECT user_id FROM users WHERE customer_id = %s OR application_number = %s"
            existing_user = execute_query(check_user_sql, (application_id, application_id), fetch_one=True)
            
            if existing_user:
                new_user_id = existing_user['user_id']
                print(f"User already exists: {new_user_id}")
            else:
                # Generate unique user ID (CV-XXXX format)
                while True:
                    new_user_id = f"CV-{random.randint(1000, 9999)}"
                    check_user_query = "SELECT user_id FROM users WHERE user_id = %s"
                    existing = execute_query(check_user_query, (new_user_id,), fetch_one=True)
                    if not existing:
                        break
                
                default_password = "123456"
                
                # Get data from customer record
                first_name = customer_data.get('first_name', '')
                middle_name = customer_data.get('middle_name', '')
                last_name = customer_data.get('last_name', '')
                suffix = customer_data.get('suffix', '')
                email = customer_data.get('email', '')
                contract_number = customer_data.get('contract_number', '')
                mobile = customer_data.get('mobile', '')
                address = customer_data.get('address', '')
                
                # Insert user into users table
                insert_user_query = """
                    INSERT INTO users 
                    (user_id, customer_id, application_number, email, username, password, 
                     created_at, role, connection_status, contract_number, status,
                     first_name, last_name, middle_name, suffix, contact_number, address)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                execute_query(insert_user_query, (
                    new_user_id, application_id, application_id, email, email, default_password,
                    current_time, "customer", "Connected", contract_number, "Active",
                    first_name, last_name, middle_name, suffix, mobile, address
                ))
                
                user_created = True
                print(f"✅ User {new_user_id} created for customer {application_id}")
                
                # Send email notification
                if email:
                    try:
                        send_installation_email(
                            email, 
                            new_user_id,
                            default_password, 
                            first_name, 
                            contract_number
                        )
                        print(f"✅ Email sent to {email}")
                    except Exception as email_error:
                        print(f"Email error: {email_error}")

        return jsonify({
            "message": "Installation status updated",
            "user_created": user_created,
            "user_id": new_user_id if user_created else None,
            "application_status": new_status
        }), 200

    except Exception as e:
        print(f"❌ Route error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def send_installation_email(to_email, user_id, password, first_name, contract_number=None):
    sender_email = "cablevision.cableinternet@gmail.com"
    sender_app_password = "svql qzea vmjt xndx"

    subject = "Cablevision Internet Service - Installation Confirmation & Login Credentials"

    # Contract section HTML (lalabas lang kung may contract_number)
    contract_section = ""
    if contract_number:
        contract_section = f"""
        <!-- Contract Information Card -->
        <div style="background: #f0f9ff; border-radius: 20px; padding: 18px; margin-bottom: 16px; border: 1px solid #bae6fd;">
            <div style="font-size: 12px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; text-align: center;">
                 📄 YOUR CONTRACT INFORMATION
            </div>
            <div style="background: #ffffff; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                    Contract Number
                </div>
                <div style="font-size: 20px; font-weight: 800; color: #0369a1; font-family: monospace; letter-spacing: 1px;">
                    {contract_number}
                </div>
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
                    <div style="font-size: 12px; color: #475569;">
                        You can view your full contract by logging into your account and clicking the 
                        <strong style="color: #0369a1;">"View Contract"</strong> button on your profile page.
                    </div>
                </div>
            </div>
        </div>
        """

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cablevision Installation Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #eef2ff;">
        
        <!-- MAIN CONTAINER -->
        <div style="max-width: 580px; margin: 0 auto; padding: 30px 20px;">
            
            <!-- CARD -->
            <div style="background: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.15);">
                
                <!-- HEADER SECTION -->
                <div style="background: linear-gradient(135deg, #001f3f 0%, #002b5c 100%); padding: 32px 28px; text-align: center; position: relative;">
                    <div style="position: absolute; top: 20px; right: 25px;">
                        <span style="background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 50px; font-size: 11px; font-weight: 600; color: #a5f3fc;">INSTALLATION COMPLETE</span>
                    </div>
                    <div style="font-size: 44px; margin-bottom: 8px;">📡</div>
                    <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Cablevision</h1>
                    <p style="margin: 6px 0 0 0; color: #93c5fd; font-size: 13px; font-weight: 400;">Internet Service Provider</p>
                </div>

                <!-- STATUS BADGE -->
                <div style="padding: 20px 28px 0 28px; text-align: center;">
                    <div style="display: inline-block; background: #ecfdf5; padding: 8px 24px; border-radius: 60px;">
                        <span style="font-size: 14px; font-weight: 600; color: #059669;">
                            ✓ SERVICE ACTIVATED
                        </span>
                    </div>
                </div>

                <!-- CONTENT SECTION -->
                <div style="padding: 20px 28px 32px 28px;">
                    
                    <!-- Greeting -->
                    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Welcome, {first_name}!</h2>
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.5;">
                        Your internet connection has been successfully activated and is now ready for use.
                    </p>

                    <!-- CONTRACT SECTION (lalabas lang kung may contract_number) -->
                    {contract_section}

                    <!-- Login Credentials Card -->
                    <div style="background: #f8fafc; border-radius: 20px; padding: 18px; margin-bottom: 16px;">
                        <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; text-align: center;">
                             🔐 LOGIN CREDENTIALS
                        </div>
                        <!-- User ID Section -->
                        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                            <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                User ID
                            </div>
                            <div style="font-size: 18px; font-weight: 700; color: #0f172a; font-family: monospace;">
                                {user_id}
                            </div>
                        </div>
                        
                        <!-- Temporary Password Section -->
                        <div>
                            <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                Temporary Password
                            </div>
                            <div style="font-size: 18px; font-weight: 700; color: #f59e0b; font-family: monospace;">
                                {password}
                            </div>
                        </div>
                    </div>

                    <!-- Password Change Reminder -->
                    <div style="margin: 20px 0; padding: 16px; background: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">⚠️</span>
                            <div>
                                <div style="font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 4px;">Password Change Required</div>
                                <div style="font-size: 12px; color: #92400e;">For security purposes, please change your password immediately after your first login.</div>
                            </div>
                        </div>
                    </div>

                    <!-- What You Can Do Section -->
                    <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border-radius: 12px;">
                        <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 10px;">
                             📋 What You Can Do After Login
                        </div>
                        <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
                            • View your account information and connection details<br>
                            • View and download your Service Contract<br>
                            • Check announcements and updates<br>
                            • Download your Application Form<br>
                            • Update your password
                        </div>
                    </div>

                    <!-- How to Login Section -->
                    <div style="margin: 20px 0; padding: 16px; background: #f0fdf4; border-radius: 12px;">
                        <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 10px;">
                             🔑 How to Access Your Account
                        </div>
                        <div style="font-size: 13px; color: #14532d; line-height: 1.6;">
                            <strong>Step 1:</strong> Visit our customer portal<br>
                            <strong>Step 2:</strong> Enter your User ID and Temporary Password<br>
                            <strong>Step 3:</strong> Create your new permanent password<br>
                            <strong>Step 4:</strong> Click "View Contract" to see your service agreement
                        </div>
                    </div>

                    <!-- Support Section -->
                    <div style="margin-top: 28px; padding-top: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 13px; color: #475569;">
                            Should you need any assistance, please contact our support team.
                        </p>
                        <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">
                            Thank you for choosing Cablevision!
                        </p>
                    </div>

                </div>

                <!-- FOOTER -->
                <div style="background: #f1f5f9; padding: 16px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; color: #64748b;">
                        © 2026 Cablevision Internet Service Provider. All rights reserved.
                    </div>
                    <div style="font-size: 10px; color: #94a3b8; margin-top: 6px;">
                        This is an automated message. Please do not reply to this email.
                    </div>
                </div>

            </div>
        </div>

    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(html_body, "html"))

    try:
        print("🔹 Sending installation email...")
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_app_password)
        server.send_message(msg)
        server.quit()
        print(f"✅ Installation email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Email sending failed: {e}")
        return False


    

import os
from werkzeug.utils import secure_filename
from datetime import timedelta

# ==================== ANNOUNCEMENTS CONFIGURATION ====================
UPLOAD_FOLDER_ANNOUNCEMENTS = os.path.join('static', 'uploads', 'announcements')
ALLOWED_EXTENSIONS_ANNOUNCEMENTS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Create upload folder if not exists
os.makedirs(UPLOAD_FOLDER_ANNOUNCEMENTS, exist_ok=True)

def allowed_announcement_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS_ANNOUNCEMENTS

def save_announcement_image(image_file):
    """Save announcement image and return file path"""
    if not image_file or not allowed_announcement_file(image_file.filename):
        return None
    
    filename = secure_filename(f"announcement_{int(datetime.now().timestamp())}_{image_file.filename}")
    image_path = os.path.join('uploads', 'announcements', filename)
    full_path = os.path.join('static', image_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    image_file.save(full_path)
    return image_path

def delete_announcement_image(image_path):
    """Delete announcement image file if exists"""
    if image_path:
        full_path = os.path.join('static', image_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            print(f"Deleted image: {full_path}")

# ===============================
# SUPERADMIN ANNOUNCEMENTS PAGE
# ===============================
@app.route("/superadmin/announcements")
def superadmin_announcements():
    return render_template("superadmin-announcements.html")

# ===============================
# CREATE ANNOUNCEMENT - CONVERTED TO MYSQL (with file upload)
# ===============================
@app.route("/api/superadmin/announcements", methods=["POST"])
def create_announcement():
    try:
        title = request.form.get("title", "")
        message = request.form.get("message", "")
        expiration_date = request.form.get("expirationDate")
        
        # Handle image upload
        image_file = request.files.get("image")
        image_path = None
        
        if image_file and allowed_announcement_file(image_file.filename):
            image_path = save_announcement_image(image_file)
        
        if not title and not message and not image_path:
            return jsonify({"error": "Title, message, or image required"}), 400
        
        now = datetime.now()
        
        # Insert into MySQL
        insert_query = """
            INSERT INTO announcements (title, message, image_path, date, timestamp, expirationDate, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        announcement_id = execute_query(insert_query, (
            title,
            message,
            image_path,
            now.strftime("%B %d, %Y"),
            now.timestamp(),
            expiration_date
        ))
        
        return jsonify({"message": "Announcement posted", "id": announcement_id})
        
    except Exception as e:
        print(f"Error creating announcement: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# GET ANNOUNCEMENTS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/announcements", methods=["GET"])
def get_announcements():
    try:
        query = """
            SELECT id, title, message, image_path, date, timestamp, expirationDate, created_at
            FROM announcements 
            ORDER BY timestamp DESC
        """
        announcements = execute_query(query, fetch=True) or []
        
        result = []
        for ann in announcements:
            result.append({
                "id": ann['id'],
                "title": ann.get('title', ''),
                "message": ann.get('message', ''),
                "imagePath": ann.get('image_path', ''),  # Path to image file
                "date": ann.get('date', ''),
                "timestamp": ann.get('timestamp', 0),
                "expirationDate": ann.get('expirationDate', '')
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting announcements: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# UPDATE ANNOUNCEMENT - CONVERTED TO MYSQL (with file upload)
# ===============================
@app.route("/api/superadmin/announcements/<int:announcement_id>", methods=["PUT"])
def update_announcement(announcement_id):
    try:
        title = request.form.get("title", "")
        message = request.form.get("message", "")
        expiration_date = request.form.get("expirationDate")
        
        # Check if announcement exists
        check_query = "SELECT id, image_path FROM announcements WHERE id = %s"
        existing = execute_query(check_query, (announcement_id,), fetch_one=True)
        
        if not existing:
            return jsonify({"error": "Announcement not found"}), 404
        
        # Handle image upload (optional)
        image_file = request.files.get("image")
        image_path = existing.get('image_path')
        
        if image_file and allowed_announcement_file(image_file.filename):
            # Delete old image if exists
            if image_path:
                delete_announcement_image(image_path)
            # Save new image
            image_path = save_announcement_image(image_file)
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        if title:
            update_fields.append("title = %s")
            params.append(title)
        if message:
            update_fields.append("message = %s")
            params.append(message)
        if image_path:
            update_fields.append("image_path = %s")
            params.append(image_path)
        if expiration_date:
            update_fields.append("expirationDate = %s")
            params.append(expiration_date)
        
        if not update_fields:
            return jsonify({"message": "No updates provided"}), 200
        
        params.append(announcement_id)
        update_query = f"UPDATE announcements SET {', '.join(update_fields)} WHERE id = %s"
        execute_query(update_query, params)
        
        return jsonify({"message": "Announcement updated"})
        
    except Exception as e:
        print(f"Error updating announcement: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# DELETE ANNOUNCEMENT - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/announcements/<int:announcement_id>", methods=["DELETE"])
def delete_announcement(announcement_id):
    try:
        # Get image path first
        check_query = "SELECT id, image_path FROM announcements WHERE id = %s"
        announcement = execute_query(check_query, (announcement_id,), fetch_one=True)
        
        if not announcement:
            return jsonify({"error": "Announcement not found"}), 404
        
        # Delete image file if exists
        image_path = announcement.get('image_path')
        if image_path:
            delete_announcement_image(image_path)
        
        # Delete from MySQL
        delete_query = "DELETE FROM announcements WHERE id = %s"
        execute_query(delete_query, (announcement_id,))
        
        return jsonify({"message": "Announcement deleted"})
        
    except Exception as e:
        print(f"Error deleting announcement: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# DELETE EXPIRED ANNOUNCEMENTS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/superadmin/announcements/expired", methods=["DELETE"])
def delete_expired_announcements():
    try:
        import pytz
        from datetime import datetime as dt
        
        current_time_utc = dt.utcnow().isoformat() + "Z"
        print(f"[EXPIRY CHECK] Current UTC: {current_time_utc}")
        
        # Get expired announcements
        query = """
            SELECT id, image_path FROM announcements 
            WHERE expirationDate IS NOT NULL AND expirationDate < %s
        """
        expired_announcements = execute_query(query, (current_time_utc,), fetch=True) or []
        
        deleted_count = 0
        for ann in expired_announcements:
            # Delete image file
            if ann.get('image_path'):
                delete_announcement_image(ann.get('image_path'))
            
            # Delete from database
            delete_query = "DELETE FROM announcements WHERE id = %s"
            execute_query(delete_query, (ann['id'],))
            deleted_count += 1
            print(f"[DELETED] Announcement {ann['id']} (expired)")
        
        # Update announcements without expiration date
        update_query = """
            UPDATE announcements 
            SET expirationDate = %s 
            WHERE expirationDate IS NULL
        """
        new_exp_date = (dt.utcnow() + timedelta(days=7)).isoformat() + "Z"
        execute_query(update_query, (new_exp_date,))
        print(f"[UPDATED] Added expiration date to announcements without one")
        
        return jsonify({
            "deletedCount": deleted_count,
            "message": f"Deleted {deleted_count} expired announcements",
            "currentTime": current_time_utc
        })
        
    except Exception as e:
        print(f"Error deleting expired announcements: {e}")
        return jsonify({"error": str(e)}), 500

    # =============================== ADMIN DASHBOARD FUNCTIONALITY ===============================

@app.route("/admin")
def admin_dashboard():
    """Render the admin dashboard with dynamic welcome name"""
    
    # Kunin ang username/admin_id mula sa session o query param
    username = request.args.get("username") or session.get("admin_username") or session.get("adminUsername") or "admin"
    
    # Kunin ang admin data mula sa MySQL
    query = "SELECT * FROM admins WHERE username = %s OR email = %s OR admin_id = %s"
    admin_data = execute_query(query, (username, username, username), fetch_one=True)
    
    # Gamitin ang username kung meron, otherwise default
    name = admin_data.get('username') if admin_data else username or "Admin"
    
    return render_template("admin-dashboard.html", name=name)

# ===============================
# SERVE ADMIN PROFILE PAGE
# ===============================
@app.route("/admin/profile")
def admin_profile_page():
    return render_template("admin-profile.html")


# ===============================
# GET ADMIN PROFILE (XAMPP/MYSQL) - FIXED
# ===============================
@app.route("/api/admin/profile", methods=["GET"])
def get_admin_profile():
    try:
        identifier = request.args.get("username")
        
        print(f"🔍 GET ADMIN PROFILE - identifier: {identifier}")
        
        if not identifier:
            return jsonify({"error": "Username is required"}), 400

        # Use actual column names from your table
        query = """
            SELECT username, admin_id, email, mobile, area, status, profile_photo
            FROM admins 
            WHERE username = %s OR admin_id = %s OR email = %s
        """
        admin_data = execute_query(query, (identifier, identifier, identifier), fetch_one=True)

        if not admin_data:
            print(f"❌ Admin not found: {identifier}")
            return jsonify({"error": f"Admin '{identifier}' not found"}), 404

        admin_id = admin_data.get('admin_id') or admin_data.get('username')
        area = admin_data.get('area') or "Not assigned"
        
        # Use username as display name since there's no name column
        display_name = admin_data.get('username') or admin_id
        
        profile = {
            "username": admin_data.get('username'),
            "id": admin_id,
            "name": display_name,  # Use username as name since no name column exists
            "email": admin_data.get('email', ''),
            "contact": admin_data.get('mobile', ''),
            "area": area,
            "city": area,
            "status": admin_data.get('status', 'Active')
        }
        
        print(f"✅ Profile found: {profile}")
        
        return jsonify(profile), 200

    except Exception as e:
        print(f"Get admin profile error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch admin profile", "details": str(e)}), 500
    
    
# ===============================
# DELETE ADMIN PROFILE PHOTO (XAMPP/MYSQL)
# ===============================
@app.route("/api/admin/delete-profile-photo", methods=["POST"])
def delete_profile_photo():
    try:
        data = request.json
        username = data.get("username")
        
        if not username:
            return jsonify({"error": "Username required"}), 400

        # Check if admin exists
        check_query = "SELECT username FROM admins WHERE username = %s OR admin_id = %s"
        admin_exists = execute_query(check_query, (username, username), fetch_one=True)
        
        if not admin_exists:
            return jsonify({"error": "Admin not found"}), 404

        # Update profile_photo to default
        update_query = "UPDATE admins SET profile_photo = %s WHERE username = %s OR admin_id = %s"
        execute_query(update_query, ("/static/profile.jpg", username, username))
        
        return jsonify({"message": "Profile photo removed successfully"}), 200
        
    except Exception as e:
        print(f"Delete profile photo error: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# UPDATE ADMIN PROFILE (XAMPP/MYSQL)
# ===============================
@app.route("/api/update-admin-profile", methods=["POST"])
def update_admin_profile():
    try:
        data = request.get_json()
        username = data.get("username")
        email = data.get("email")
        contact = data.get("contact")
        name = data.get("name")  # This will be ignored since no name column
        password = data.get("password")

        if not username:
            return jsonify({"error": "Username required"}), 400

        # Build update query with only existing columns
        update_fields = []
        params = []
        
        # Note: There is NO 'name' column, so skip name update
        if contact:
            update_fields.append("mobile = %s")
            params.append(contact)
        if email:
            update_fields.append("email = %s")
            params.append(email)
        if password and len(password) >= 8:
            update_fields.append("password = %s")
            params.append(password)
        
        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400
        
        params.append(username)
        params.append(username)
        
        update_query = f"UPDATE admins SET {', '.join(update_fields)} WHERE username = %s OR admin_id = %s"
        execute_query(update_query, params)
        
        print(f"✅ Admin {username} profile updated")
        
        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        }), 200

    except Exception as e:
        print(f"Update admin profile error: {e}")
        return jsonify({"error": str(e)}), 500

# ==================== PROMO MANAGEMENT ====================
@app.route("/api/admin/promos", methods=["GET"])
def get_promos():
    try:
        ref = db.reference("promos")
        promos = ref.get() or {}
        # Format as list
        promo_list = [{"id": k, "title": v.get("title"), "desc": v.get("desc")} for k, v in promos.items()]
        return jsonify(promo_list)
    except Exception as e:
        print("Get promos error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/promos", methods=["POST"])
def create_promo():
    try:
        data = request.json
        title = data.get("title")
        desc = data.get("desc")
        if not title or not desc:
            return jsonify({"error": "Title and description are required"}), 400

        ref = db.reference("promos")
        new_ref = ref.push()
        new_ref.set({
            "title": title,
            "desc": desc
        })
        return jsonify({"message": "Promo created successfully", "id": new_ref.key})

    except Exception as e:
        print("Create promo error:", e)
        return jsonify({"error": str(e)}), 500
    

    
# Serve Admin Promo Page
@app.route("/admin/promo")
def admin_promos_page():
    return render_template("admin-promo.html")  # your new promo HTML

# DELETE promo by id
@app.route("/api/admin/promos/<promo_id>", methods=["DELETE"])
def delete_promo(promo_id):
    try:
        ref = db.reference("promos").child(promo_id)
        if not ref.get():
            return jsonify({"error": "Promo not found"}), 404
        ref.delete()
        return jsonify({"message": "Promo deleted successfully"}), 200
    except Exception as e:
        print("Delete promo error:", e)
        return jsonify({"error": str(e)}), 500    


# ===============================
# ADMIN STATISTICS
# ===============================
@app.route("/api/admin/statistics", methods=["GET"])
def admin_statistics():
    try:
        username = request.args.get("username") or session.get("admin_username") or session.get("adminUsername")
        if not username:
            return jsonify({"error": "Username required"}), 400

        # ========== GET ADMIN INFO FROM MYSQL ==========
        admin_query = "SELECT area FROM admins WHERE username = %s OR admin_id = %s"
        admin_data = execute_query(admin_query, (username, username), fetch_one=True)

        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404

        admin_area = str(admin_data.get("area", "")).strip().lower()

        # ========== GET APPLICATIONS FROM MYSQL ==========
        apps_query = """
            SELECT city, plan FROM applications 
            WHERE status != 'Rejected'
        """
        all_apps = execute_query(apps_query, fetch=True) or []

        total_applicants = 0
        popular_plans = {}

        for app in all_apps:
            app_city = str(app.get("city", "")).strip().lower()

            # Check if application belongs to admin's area
            if admin_area in app_city or app_city in admin_area:
                total_applicants += 1

                plan = app.get("plan", "Unknown")
                popular_plans[plan] = popular_plans.get(plan, 0) + 1

        return jsonify({
            "total_applicants": total_applicants,
            "popular_plans": popular_plans
        })

    except Exception as e:
        print(f"Admin statistics error: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# Admin Internet Applications Page
# ===============================
@app.route("/admin/internet-applications")
def admin_internet_applications():
    return render_template("admin-internet-applications.html")

# ===============================
# GET ADMIN INTERNET APPLICATIONS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/admin/internet-applications", methods=["GET"])
def get_admin_internet_applications():
    try:
        username = request.args.get("username") or session.get("admin_username") or session.get("adminUsername")
        if not username:
            return jsonify({"error": "Username required"}), 400

        # ========== GET ADMIN INFO FROM MYSQL ==========
        admin_query = "SELECT area FROM admins WHERE username = %s OR admin_id = %s"
        admin_data = execute_query(admin_query, (username, username), fetch_one=True)

        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404

        admin_area = str(admin_data.get("area", "")).strip().lower()

        # ========== GET APPLICATIONS FROM MYSQL ==========
        apps_query = """
            SELECT application_number, first_name, last_name, email, 
                   date_submitted, barangay, city, birthdate, plan, 
                   status, rejection_reason
            FROM applications
        """
        all_apps = execute_query(apps_query, fetch=True) or []

        filtered_apps = []
        for app in all_apps:
            app_city = str(app.get("city", "")).strip().lower()
            
            # Check if application belongs to admin's area
            if admin_area in app_city or app_city in admin_area:
                filtered_apps.append({
                    "id": app.get("application_number"),
                    "application_number": app.get("application_number", ""),
                    "first_name": app.get("first_name", ""),
                    "last_name": app.get("last_name", ""),
                    "email": app.get("email", ""),
                    "date_submitted": app.get("date_submitted", ""),
                    "barangay": app.get("barangay", ""),
                    "city": app.get("city", ""),
                    "birthdate": app.get("birthdate", ""),
                    "plan": app.get("plan", ""),
                    "status": app.get("status", "Pending"),
                    "rejection_reason": app.get("rejection_reason", "")
                })

        return jsonify(filtered_apps), 200
        
    except Exception as e:
        print(f"Error in get_admin_internet_applications: {e}")
        return jsonify({"error": str(e)}), 500
    

# ===============================
# ADMIN REQUEST (NOT DIRECT APPROVE) - CONVERTED TO MYSQL
# ===============================
@app.route("/api/admin/application/<app_id>/request", methods=["POST"])
def admin_request_application(app_id):
    try:
        data = request.get_json()
        status = data.get("status")
        reason = data.get("reason")
        username = request.args.get("username") or session.get("admin_username") or session.get("adminUsername")

        if status not in ["Approved", "Rejected"]:
            return jsonify({"error": "Invalid status"}), 400

        if not username:
            return jsonify({"error": "Admin username required"}), 400

        # ========== CHECK IF APPLICATION EXISTS IN MYSQL ==========
        app_query = "SELECT * FROM applications WHERE application_number = %s"
        app_data = execute_query(app_query, (app_id,), fetch_one=True)

        if not app_data:
            return jsonify({"error": "Application not found"}), 404

        # ========== CHECK FOR EXISTING PENDING REQUEST ==========
        pending_query = """
            SELECT request_id FROM approval_requests 
            WHERE app_id = %s AND status = 'Pending'
            LIMIT 1
        """
        existing_request = execute_query(pending_query, (app_id,), fetch_one=True)
        
        if existing_request:
            return jsonify({"error": "Request already sent"}), 400

        # ========== GET ADMIN INFO FROM MYSQL ==========
        admin_query = "SELECT admin_id, area, city FROM admins WHERE username = %s OR admin_id = %s"
        admin_info = execute_query(admin_query, (username, username), fetch_one=True)
        
        admin_id = None
        admin_area = None
        admin_city = None
        
        if admin_info:
            admin_id = admin_info.get('admin_id')
            admin_area = admin_info.get('area')
            admin_city = admin_info.get('city') or admin_info.get('area')
        
        # Fallback: use application's city
        if not admin_area and app_data.get('city'):
            admin_city = app_data.get('city')
            admin_area = app_data.get('city')
            admin_id = username
        
        print(f"[REQUEST] Admin {username} - ID: {admin_id}, Area: {admin_area}, City: {admin_city} requested {status} for app {app_id}")
        if reason:
            print(f"[REQUEST] Reason: {reason}")

        # ========== GENERATE UNIQUE REQUEST ID ==========
        import random
        import string
        request_id = ''.join(random.choices(string.ascii_letters + string.digits, k=20))
        
        # ========== SAVE REQUEST TO APPROVAL_REQUESTS TABLE ==========
        insert_request_query = """
            INSERT INTO approval_requests 
            (request_id, app_id, requested_by, requested_status, status, date_requested,
             admin_id, admin_area, admin_city, reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        execute_query(insert_request_query, (
            request_id,
            app_id,
            username,
            status,
            "Pending",
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            admin_id,
            admin_area,
            admin_city,
            reason
        ))
        print(f"[REQUEST] Request created with ID: {request_id}")

        # ========== UPDATE APPLICATION STATUS TO "Request Sent" ==========
        update_app_query = "UPDATE applications SET status = 'Request Sent' WHERE application_number = %s"
        execute_query(update_app_query, (app_id,))

        # ========== CREATE NOTIFICATION FOR SUPERADMIN ==========
        notification_id = int(datetime.now().timestamp() * 1000)
        applicant_name = f"{app_data.get('first_name', '')} {app_data.get('last_name', '')}".strip()
        application_number = app_data.get('application_number', 'N/A')
        
        message = f"{username} ({admin_id}) has requested to {status.lower()} {applicant_name}'s application ({application_number})"
        if status == "Rejected" and reason:
            message += f"\nReason: {reason}"
        
        # Insert into notifications table for SUPERADMIN
        insert_notif_query = """
            INSERT INTO notifications 
            (id, title, message, type, relatedId, timestamp, read_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        execute_query(insert_notif_query, (
            notification_id,
            f"Admin {status} Request",
            message,
            "admin_request",
            app_id,
            datetime.now().isoformat(),
            0  # unread
        ))
        print(f"[REQUEST] Notification created for superadmin with ID: {notification_id}")

        return jsonify({"message": "Request sent to superadmin.", "request_id": request_id})

    except Exception as e:
        print(f"Admin request error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
# ===============================
# GET ADMIN NOTIFICATIONS (XAMPP/MYSQL)
# ===============================
@app.route("/api/admin/notifications", methods=["GET"])
def get_admin_notifications():
    try:
        admin_id = request.args.get("admin_id") or request.args.get("username")
        
        print(f"🔍 GET ADMIN NOTIFICATIONS - admin_id: {admin_id}")
        
        if not admin_id:
            return jsonify({"error": "Admin ID required"}), 400
        
        import mysql.connector
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="cablevision_db"
        )
        cursor = conn.cursor(dictionary=True)
        
        # Get ALL notifications (both read and unread)
        query = """
            SELECT id, title, message, type, relatedId, request_id, timestamp,
                read_status, admin_id, requested_by, contract_number, billing_date
            FROM admin_notifications 
            WHERE admin_id = %s
            ORDER BY id DESC
            LIMIT 50
        """
        cursor.execute(query, (admin_id,))
        notifications = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        print(f"📊 Found {len(notifications)} notifications for {admin_id}")
        
        result = []
        for n in notifications:
            result.append({
                "id": n.get("id"),
                "title": n.get("title", "Notification"),
                "message": n.get("message", ""),
                "type": n.get("type", "info"),
                "relatedId": n.get("relatedId"),
                "request_id": n.get("request_id"),
                "timestamp": str(n.get("timestamp")),
                "read": n.get("read_status") == 1,
                "contract_number": n.get("contract_number"),
                "billing_date": n.get("billing_date")
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error in get_admin_notifications: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 500


# ===============================
# MARK ADMIN NOTIFICATION AS READ (XAMPP/MYSQL)
# ===============================
@app.route("/api/admin/notifications/<int:notification_id>/read", methods=["PATCH"])
def mark_admin_notification_read(notification_id):
    try:
        admin_id = request.args.get("admin_id") or request.args.get("username")
        
        if not admin_id:
            data = request.get_json() or {}
            admin_id = data.get("admin_id") or data.get("username")
        
        if not admin_id:
            return jsonify({"error": "Admin ID or username required"}), 400
        
        # Update read_status to 1
        query = "UPDATE admin_notifications SET read_status = 1 WHERE id = %s AND read_status = 0"
        rows_affected = execute_query(query, (notification_id,))
        
        if rows_affected > 0:
            print(f"✅ Admin {admin_id} marked notification {notification_id} as read")
        
        return jsonify({"message": "Notification marked as read"})
    
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# MARK ALL ADMIN NOTIFICATIONS AS READ (XAMPP/MYSQL)
# ===============================
@app.route("/api/admin/notifications/read-all", methods=["PUT"])
def mark_all_admin_notifications_read():
    try:
        admin_id = request.args.get("admin_id") or request.args.get("username")
        
        if not admin_id:
            data = request.get_json() or {}
            admin_id = data.get("admin_id") or data.get("username")
        
        if not admin_id:
            return jsonify({"error": "Admin ID or username required"}), 400
        
        # Get admin's city/area
        admin_city = request.args.get("city", "")
        admin_area = request.args.get("area", "")
        
        if not admin_city and not admin_area:
            admin_query = """
                SELECT area, city FROM admins 
                WHERE admin_id = %s OR id = %s
            """
            admin_data = execute_query(admin_query, (admin_id, admin_id), fetch_one=True)
            if admin_data:
                admin_city = admin_data.get('city') or ''
                admin_area = admin_data.get('area') or ''
        
        # Update all unread notifications for this admin
        query = """
            UPDATE admin_notifications 
            SET read_status = 1 
            WHERE read_status = 0 
            AND (
                admin_id = %s 
                OR requested_by = %s 
                OR (admin_city = %s AND admin_city != '')
                OR (application_city = %s AND application_city != '')
                OR (admin_area = %s AND admin_area != '')
            )
        """
        rows_affected = execute_query(query, (admin_id, admin_id, admin_city, admin_city, admin_area))
        
        print(f"✅ Admin {admin_id} marked {rows_affected} notifications as read")
        return jsonify({"message": f"Marked {rows_affected} notifications as read", "count": rows_affected})
    
    except Exception as e:
        print(f"Error marking all notifications as read: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# GET UNREAD ADMIN NOTIFICATION COUNT (XAMPP/MYSQL)
# ===============================
@app.route("/api/admin/notifications/unread/count", methods=["GET"])
def get_unread_admin_notification_count():
    try:
        admin_id = request.args.get("admin_id") or request.args.get("username")
        
        if not admin_id:
            return jsonify({"error": "Admin ID or username required"}), 400
        
        # Get admin's city/area
        admin_city = request.args.get("city", "")
        admin_area = request.args.get("area", "")
        
        if not admin_city and not admin_area:
            admin_query = """
                SELECT area, city FROM admins 
                WHERE admin_id = %s OR id = %s
            """
            admin_data = execute_query(admin_query, (admin_id, admin_id), fetch_one=True)
            if admin_data:
                admin_city = admin_data.get('city') or ''
                admin_area = admin_data.get('area') or ''
        
        # Count unread notifications
        query = """
            SELECT COUNT(*) as unread_count
            FROM admin_notifications 
            WHERE read_status = 0 
            AND (
                admin_id = %s 
                OR requested_by = %s 
                OR (admin_city = %s AND admin_city != '')
                OR (application_city = %s AND application_city != '')
                OR (admin_area = %s AND admin_area != '')
            )
        """
        result = execute_query(query, (admin_id, admin_id, admin_city, admin_city, admin_area), fetch_one=True)
        
        unread_count = result.get("unread_count", 0) if result else 0
        
        return jsonify({"unread_count": unread_count})
    
    except Exception as e:
        print(f"Error getting unread count: {e}")
        return jsonify({"unread_count": 0}), 500

# ===============================
# Admin View Single Application Page
# ===============================
@app.route("/admin/view-application/<app_id>")
def admin_view_application(app_id):
    return render_template("admin-view-application.html", app_id=app_id)

# ===============================
# API Get Single Application - CONVERTED TO MYSQL
# ===============================
@app.route("/api/admin/application/<app_id>", methods=["GET"])
def admin_get_single_application(app_id):
    try:
        # Get application data from MySQL
        query = """
            SELECT application_number, first_name, last_name, middle_name, suffix,
                   email, mobile, secondary_mobile, phone, birthdate, place_of_birth,
                   sex, civil_status, citizenship, occupation, home_ownership,
                   address, billing_address, house_number, landmark,
                   barangay, city, province, zip, employer, business_address,
                   business_phone, spouse_name, spouse_occupation, spouse_employer,
                   spouse_phone, plan, plan_price, plan_speed, service_type,
                   installation_address, installation_phone, installation_fee,
                   date_submitted, time_submitted, timestamp, status, rejection_reason,
                   signature, id_front, id_back, proof_billing, profile_photo,
                   tv_qty, tv_brand, tv_type, contract_number, billing_date,
                   approval_date, latitude, longitude
            FROM applications 
            WHERE application_number = %s
        """
        data = execute_query(query, (app_id,), fetch_one=True)
        
        if not data:
            return jsonify({"error": "Application not found"}), 404
        
        # Parse JSON fields (tv_qty, tv_brand, tv_type are stored as JSON strings)
        if data.get('tv_qty'):
            try:
                data['tv_qty'] = json.loads(data['tv_qty'])
            except:
                data['tv_qty'] = []
        
        if data.get('tv_brand'):
            try:
                data['tv_brand'] = json.loads(data['tv_brand'])
            except:
                data['tv_brand'] = []
        
        if data.get('tv_type'):
            try:
                data['tv_type'] = json.loads(data['tv_type'])
            except:
                data['tv_type'] = []
        
        # Add id field for frontend compatibility
        data['id'] = data.get('application_number')
        
        return jsonify(data)
        
    except Exception as e:
        print(f"Error getting single application: {e}")
        return jsonify({"error": str(e)}), 500


# ===============================
# ADMIN DOWNLOAD CONTRACT PDF - CONVERTED TO MYSQL
# ===============================
@app.route("/admin/download/contract/<app_id>/<contract_number>")
def admin_download_contract_pdf(app_id, contract_number):
    """Generate and download contract PDF for admin view"""
    try:
        # Reuse the superadmin download function (already converted to MySQL)
        return download_contract_pdf(app_id, contract_number)
    except Exception as e:
        print(f"Error generating contract PDF: {e}")
        import traceback
        traceback.print_exc()
        return f"Error generating PDF: {str(e)}", 500


# ===============================
# ADMIN DOWNLOAD APPLICATION PDF - CONVERTED TO MYSQL
# ===============================
@app.route('/admin/download/pdf/<app_id>')
def admin_download_pdf(app_id):
    try:
        # Get application data from MySQL
        query = "SELECT application_number FROM applications WHERE application_number = %s"
        data = execute_query(query, (app_id,), fetch_one=True)

        if not data:
            return "Application not found", 404

        # Get application_number
        application_number = data.get("application_number")

        if not application_number:
            return "Application number missing", 400

        # Use existing PDF generator (already converted to MySQL)
        return download_pdf(application_number)

    except Exception as e:
        print(f"Admin PDF download error: {e}")
        return str(e), 500
    

# ===============================
# Admin View Customers Page
# ===============================
@app.route("/admin/view-customers")
def admin_view_customers_page():
    return render_template("admin-view-customers.html")
    

# ===============================
# GET ADMIN APPROVED APPLICATIONS - CONVERTED TO MYSQL
# ===============================
@app.route("/api/admin/approved-applications", methods=["GET"])
def get_admin_approved_applications():
    try:
        username = request.args.get("username") or session.get("admin_username") or session.get("adminUsername")
        if not username:
            return jsonify({"error": "Username required"}), 400

        # ========== GET ADMIN INFO FROM MYSQL ==========
        admin_query = "SELECT area FROM admins WHERE username = %s OR admin_id = %s"
        admin_data = execute_query(admin_query, (username, username), fetch_one=True)

        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404

        admin_area = str(admin_data.get("area", "")).strip().lower()

        # ========== GET CUSTOMERS FROM MYSQL ==========
        customers_query = """
            SELECT application_number, contract_number, first_name, last_name, email,
                   plan, status, installation_status, city
            FROM customers 
            WHERE status = 'Approved'
        """
        all_customers = execute_query(customers_query, fetch=True) or []

        # ========== GET PLANS FROM MYSQL ==========
        plans_query = "SELECT name, speed FROM plans"
        all_plans = execute_query(plans_query, fetch=True) or []

        # Create plan speed mapping
        plan_speed_map = {}
        for plan in all_plans:
            plan_name = (plan.get('name') or '').strip().lower()
            if plan_name:
                plan_speed_map[plan_name] = plan.get('speed', 'N/A')

        approved_apps = []

        for cust in all_customers:
            cust_city = str(cust.get("city", "")).strip().lower()

            # Check if customer belongs to admin's area
            if admin_area in cust_city or cust_city in admin_area:
                plan_name = (cust.get("plan") or "").strip().lower()
                plan_speed = plan_speed_map.get(plan_name, "N/A")

                approved_apps.append({
                    "id": cust.get("application_number"),
                    "application_number": cust.get("application_number", ""),
                    "contract_number": cust.get("contract_number", "N/A"),
                    "first_name": cust.get("first_name", ""),
                    "last_name": cust.get("last_name", ""),
                    "full_name": f"{cust.get('first_name', '')} {cust.get('last_name', '')}".strip(),
                    "email": cust.get("email", ""),
                    "plan": cust.get("plan", "N/A"),
                    "speed": plan_speed,
                    "status": cust.get("status", "Approved"),
                    "installation_status": cust.get("installation_status", "Pending")
                })

        return jsonify(approved_apps), 200
        
    except Exception as e:
        print(f"Error in get_admin_approved_applications: {e}")
        return jsonify({"error": str(e)}), 500

# ===============================
# Admin View Single Customer Application Page
# ===============================
@app.route("/admin/view-customer-application/<app_id>")
def admin_view_customer_application(app_id):
    return render_template("admin-view-customer-application.html", app_id=app_id)


# ===============================
# API Get Single Customer Application (only approved applications)
# ===============================
@app.route("/api/admin/customer-application/<app_id>")
def admin_get_single_customer_application(app_id):
    try:
        # Query from applications table in MySQL
        query = """
            SELECT id, application_number, first_name, middle_name, last_name, suffix,
                   email, mobile, secondary_mobile, phone, birthdate, place_of_birth,
                   mother_maiden_name, sex, civil_status, citizenship, occupation,
                   home_ownership, address, barangay, city, province, zip,
                   employer, business_address, business_phone, spouse_name,
                   spouse_occupation, spouse_employer, spouse_phone, parents_name,
                   others, plan, plan_speed, plan_price, service_type,
                   installation_address, installation_phone, installation_fee,
                   tv_qty, tv_brand, tv_type, signature, id_front, id_back,
                   proof_billing, profile_photo, latitude, longitude,
                   status, contract_number, billing_date, approval_date,
                   installation_status, rejection_reason, date_submitted,
                   time_submitted, created_at
            FROM applications 
            WHERE application_number = %s OR id = %s
        """
        data = execute_query(query, (app_id, app_id), fetch_one=True)
        
        if not data:
            return jsonify({"error": "Customer application not found"}), 404

        # Only allow approved applications
        if data.get("status") != "Approved":
            return jsonify({"error": "Customer application is not approved"}), 403

        # Convert datetime objects to string for JSON serialization
        if data.get('birthdate'):
            data['birthdate'] = str(data['birthdate'])
        if data.get('approval_date'):
            data['approval_date'] = str(data['approval_date'])
        if data.get('date_submitted'):
            data['date_submitted'] = str(data['date_submitted'])
        if data.get('created_at'):
            data['created_at'] = str(data['created_at'])

        # Parse JSON fields (tv_qty, tv_brand, tv_type are stored as JSON strings)
        import json
        if data.get('tv_qty'):
            try:
                data['tv_qty'] = json.loads(data['tv_qty']) if isinstance(data['tv_qty'], str) else data['tv_qty']
            except:
                data['tv_qty'] = []
        else:
            data['tv_qty'] = []
            
        if data.get('tv_brand'):
            try:
                data['tv_brand'] = json.loads(data['tv_brand']) if isinstance(data['tv_brand'], str) else data['tv_brand']
            except:
                data['tv_brand'] = []
        else:
            data['tv_brand'] = []
            
        if data.get('tv_type'):
            try:
                data['tv_type'] = json.loads(data['tv_type']) if isinstance(data['tv_type'], str) else data['tv_type']
            except:
                data['tv_type'] = []
        else:
            data['tv_type'] = []

        return jsonify(data)
        
    except Exception as e:
        print(f"Error getting customer application: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ===============================
# Admin Installation Summary - CONVERTED TO MYSQL
# ===============================
@app.route("/api/admin/installation-summary", methods=["GET"])
def get_admin_installation_summary():
    try:
        from datetime import datetime, timedelta

        username = request.args.get("username") or session.get("admin_username") or session.get("adminUsername")
        if not username:
            return jsonify({"error": "Username required"}), 400

        # DATE FILTERS
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")

        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_date = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1, seconds=-1)

        # ========== GET ADMIN INFO FROM MYSQL ==========
        admin_query = "SELECT area FROM admins WHERE username = %s OR admin_id = %s"
        admin_data = execute_query(admin_query, (username, username), fetch_one=True)

        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404

        admin_area = str(admin_data.get("area", "")).strip().lower()

        # ========== GET CUSTOMERS FROM MYSQL ==========
        customers_query = """
            SELECT city, date_pending, date_ongoing, date_installed 
            FROM customers 
            WHERE status = 'Approved'
        """
        all_customers = execute_query(customers_query, fetch=True) or []

        installation_summary = {
            "Pending": 0,
            "Ongoing": 0,
            "Installed": 0
        }

        def parse_date(d):
            if not d:
                return None
            try:
                return datetime.strptime(d, "%Y-%m-%d %H:%M:%S")
            except:
                try:
                    return datetime.strptime(d, "%Y-%m-%d")
                except:
                    return None

        for cust in all_customers:
            cust_city = str(cust.get("city", "")).strip().lower()

            # AREA FILTER
            if not (admin_area in cust_city or cust_city in admin_area):
                continue

            # DATE FIELDS
            dates = {
                "Pending": parse_date(cust.get("date_pending")),
                "Ongoing": parse_date(cust.get("date_ongoing")),
                "Installed": parse_date(cust.get("date_installed")),
            }

            # FILTER BY DATE RANGE
            filtered_dates = {
                status: dt for status, dt in dates.items()
                if dt and
                (not start_date or dt >= start_date) and
                (not end_date or dt <= end_date)
            }

            if not filtered_dates:
                continue

            # GET LATEST STATUS
            latest_status = max(filtered_dates, key=lambda k: filtered_dates[k])
            installation_summary[latest_status] += 1

        return jsonify({"installation_summary": installation_summary}), 200

    except Exception as e:
        print("Error in installation summary:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500
    

@app.route("/api/admin/info", methods=["GET"])
def get_admin_info():
    try:
        username = request.args.get("username") or session.get("adminUsername")
        
        if not username:
            return jsonify({"error": "Username required"}), 400

        # Query from admins table in MySQL
        query = """
            SELECT admin_id, full_name, email, mobile, area, city, 
                   profile_photo, status, created_at 
            FROM admins 
            WHERE admin_id = %s OR username = %s OR id = %s
        """
        admin_data = execute_query(query, (username, username, username), fetch_one=True)

        if not admin_data:
            return jsonify({"error": "Admin not found"}), 404

        # Convert datetime to string if needed
        if admin_data.get('created_at'):
            admin_data['created_at'] = str(admin_data['created_at'])

        return jsonify({
            "username": admin_data.get("admin_id") or admin_data.get("username", username),
            "full_name": admin_data.get("full_name", ""),
            "email": admin_data.get("email", ""),
            "mobile": admin_data.get("mobile", ""),
            "area": admin_data.get("area", "Unknown"),
            "city": admin_data.get("city", ""),
            "profile_photo": admin_data.get("profile_photo", ""),
            "status": admin_data.get("status", "active")
        })

    except Exception as e:
        print("Error getting admin info:", e)
        return jsonify({"error": "Server error"}), 500  



@app.route("/api/admin/installation-status/<app_id>", methods=["PUT"])
def admin_update_installation_status(app_id):
    try:
        data = request.json
        new_status = data.get("installation_status")

        if not new_status:
            return jsonify({"error": "Status required"}), 400

        ref = db.reference(f"customers/{app_id}")
        customer_data = ref.get()

        if not customer_data:
            return jsonify({"error": "Customer not found"}), 404

        update_data = {
            "installation_status": new_status
        }

        # 🔥 ADD DATE TRACKING
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if new_status == "Ongoing":
            update_data["date_ongoing"] = current_time

        elif new_status == "Installed":
            update_data["date_installed"] = current_time

        ref.update(update_data)

        return jsonify({"success": True}), 200

    except Exception as e:
        print("Installation update error:", e)
        return jsonify({"error": str(e)}), 500


# ==================== ADVERTISEMENT MANAGEMENT ====================
import os
from werkzeug.utils import secure_filename
from datetime import datetime

# ==================== CHANNEL LOGOS CONFIGURATION ====================
UPLOAD_FOLDER_LOGO = os.path.join('static', 'uploads', 'channel-logos')
ALLOWED_EXTENSIONS_LOGO = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

# Create upload folder if not exists
os.makedirs(UPLOAD_FOLDER_LOGO, exist_ok=True)

def allowed_logo_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS_LOGO

def save_logo_image(image_file):
    """Save channel logo image and return file path"""
    if not image_file or not allowed_logo_file(image_file.filename):
        return None
    
    filename = secure_filename(f"logo_{int(datetime.now().timestamp())}_{image_file.filename}")
    image_path = os.path.join('uploads', 'channel-logos', filename)
    full_path = os.path.join('static', image_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    image_file.save(full_path)
    return image_path

def delete_logo_image(image_path):
    """Delete channel logo image file if exists"""
    if image_path:
        full_path = os.path.join('static', image_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            print(f"Deleted logo image: {full_path}")

# ==================== ADVERTISEMENT MANAGEMENT PAGE ====================
@app.route("/superadmin/advertisement")
def superadmin_advertisement():
    """Render the advertisement management page"""
    return render_template("superadmin-advertisement.html")

# ==================== GET ALL CHANNEL LOGOS - CONVERTED TO MYSQL ====================
@app.route("/api/superadmin/channel-logos", methods=["GET"])
def get_channel_logos():
    """Get all channel logos (simplified - logo lang talaga)"""
    try:
        query = """
            SELECT id, image_path, date, timestamp, created_at
            FROM channel_logos 
            ORDER BY timestamp DESC
        """
        logos = execute_query(query, fetch=True) or []
        
        logo_list = []
        for logo in logos:
            logo_list.append({
                "id": logo['id'],
                "imagePath": logo.get('image_path', ''),  # Path to image file
                "date": logo.get('date', ''),
                "timestamp": logo.get('timestamp', 0)
            })
        
        return jsonify(logo_list)
        
    except Exception as e:
        print(f"Error getting channel logos: {e}")
        return jsonify([])

# ==================== CREATE CHANNEL LOGO - CONVERTED TO MYSQL (with file upload) ====================
@app.route("/api/superadmin/channel-logos", methods=["POST"])
def create_channel_logo():
    """Create a new channel logo (file upload)"""
    try:
        # Handle file upload
        image_file = request.files.get("image")
        
        if not image_file or not allowed_logo_file(image_file.filename):
            return jsonify({"error": "Valid image file is required (png, jpg, jpeg, gif, webp, svg)"}), 400
        
        # Save image
        image_path = save_logo_image(image_file)
        
        if not image_path:
            return jsonify({"error": "Failed to save image"}), 500
        
        # Generate timestamp
        now = datetime.now()
        
        # Insert into MySQL
        insert_query = """
            INSERT INTO channel_logos (image_path, date, timestamp, created_at)
            VALUES (%s, %s, %s, NOW())
        """
        logo_id = execute_query(insert_query, (
            image_path,
            now.strftime("%B %d, %Y"),
            now.timestamp()
        ))
        
        return jsonify({
            "message": "Channel logo uploaded successfully", 
            "id": logo_id,
            "imagePath": image_path
        })
        
    except Exception as e:
        print(f"Error creating channel logo: {e}")
        return jsonify({"error": str(e)}), 500

# ==================== DELETE CHANNEL LOGO - CONVERTED TO MYSQL ====================
@app.route("/api/superadmin/channel-logos/<int:logo_id>", methods=["DELETE"])
def delete_channel_logo(logo_id):
    """Delete a channel logo"""
    try:
        # Get image path first
        check_query = "SELECT id, image_path FROM channel_logos WHERE id = %s"
        logo = execute_query(check_query, (logo_id,), fetch_one=True)
        
        if not logo:
            return jsonify({"error": "Channel logo not found"}), 404
        
        # Delete image file if exists
        image_path = logo.get('image_path')
        if image_path:
            delete_logo_image(image_path)
        
        # Delete from MySQL
        delete_query = "DELETE FROM channel_logos WHERE id = %s"
        execute_query(delete_query, (logo_id,))
        
        return jsonify({"message": "Channel logo deleted successfully"})
        
    except Exception as e:
        print(f"Error deleting channel logo: {e}")
        return jsonify({"error": str(e)}), 500

# ==================== UPDATE CHANNEL LOGO - NEW ENDPOINT ====================
@app.route("/api/superadmin/channel-logos/<int:logo_id>", methods=["PUT"])
def update_channel_logo(logo_id):
    """Update a channel logo (replace image)"""
    try:
        # Check if logo exists
        check_query = "SELECT id, image_path FROM channel_logos WHERE id = %s"
        existing = execute_query(check_query, (logo_id,), fetch_one=True)
        
        if not existing:
            return jsonify({"error": "Channel logo not found"}), 404
        
        # Handle file upload (optional)
        image_file = request.files.get("image")
        image_path = existing.get('image_path')
        
        if image_file and allowed_logo_file(image_file.filename):
            # Delete old image
            if image_path:
                delete_logo_image(image_path)
            # Save new image
            image_path = save_logo_image(image_file)
        
        if not image_path:
            return jsonify({"error": "Image is required"}), 400
        
        # Update in MySQL
        update_query = """
            UPDATE channel_logos 
            SET image_path = %s
            WHERE id = %s
        """
        execute_query(update_query, (image_path, logo_id))
        
        return jsonify({
            "message": "Channel logo updated successfully",
            "imagePath": image_path
        })
        
    except Exception as e:
        print(f"Error updating channel logo: {e}")
        return jsonify({"error": str(e)}), 500

# ==================== INITIALIZE CHANNEL LOGOS TABLE (MySQL) ====================
def init_channel_logos_table():
    """Initialize the channel_logos table in MySQL if it doesn't exist"""
    try:
        # Check if table exists by trying to select from it
        check_query = "SELECT COUNT(*) as count FROM channel_logos"
        execute_query(check_query, fetch_one=True)
        print("✅ channel_logos table already exists")
    except Exception as e:
        # Table doesn't exist, create it
        if "doesn't exist" in str(e):
            create_table_query = """
                CREATE TABLE IF NOT EXISTS channel_logos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    image_path VARCHAR(255) NOT NULL,
                    date VARCHAR(50),
                    timestamp BIGINT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_timestamp (timestamp)
                )
            """
            execute_query(create_table_query)
            print("✅ Created channel_logos table in MySQL")
        else:
            print(f"Error initializing channel_logos table: {e}")

# Call the initialization function when the app starts
init_channel_logos_table()


# ===============================
# Run Flask App
# ===============================
if __name__ == "__main__":
    app.run(debug=True)