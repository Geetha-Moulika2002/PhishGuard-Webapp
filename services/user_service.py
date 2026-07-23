import re
import bcrypt

from firebase_config import db
from firebase_admin import firestore


# -------------------------------
# PASSWORD VALIDATION
# -------------------------------

def validate_password(password):

    if len(password) < 8:
        return False, "Password must be at least 8 characters."

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain one uppercase letter."

    if not re.search(r"[a-z]", password):
        return False, "Password must contain one lowercase letter."

    if not re.search(r"\d", password):
        return False, "Password must contain one number."

    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        return False, "Password must contain one special character."

    return True, ""


# -------------------------------
# CREATE ACCOUNT
# -------------------------------

def create_user(name, email, password):

    email = email.strip().lower()

    users = db.collection("users")

    existing = users.where("email", "==", email).limit(1).stream()

    if list(existing):
        return False, "Email is already registered. Please login or use a different email."

    valid, message = validate_password(password)

    if not valid:
        return False, message

    password_hash = bcrypt.hashpw(
        password.encode(),
        bcrypt.gensalt()
    ).decode()

    users.add({

        "name": name,

        "email": email,

        "password": password_hash,

        "created_at": firestore.SERVER_TIMESTAMP,

        "account_status": "ACTIVE"

    })

    return True, "Account Created Successfully."


# -------------------------------
# LOGIN
# -------------------------------

def authenticate_user(email, password):

    email = email.strip().lower()

    if not email or not password:
        return False, "Please enter both email and password.", None

    users = db.collection("users")

    docs = users.where("email", "==", email).limit(1).stream()

    docs = list(docs)

    if len(docs) == 0:
        return False, "Account does not exist.", None

    user = docs[0].to_dict()

    if user.get("account_status") != "ACTIVE":
        return False, "Account has been disabled.", None

    stored_hash = user["password"].encode()

    if bcrypt.checkpw(password.encode(), stored_hash):

        return True, "Login Successful", user

    return False, "Incorrect password.", None


# -------------------------------
# USER PROFILE
# -------------------------------

def _format_member_since(created_at):
    if created_at is None:
        return "Recently joined"

    try:
        if hasattr(created_at, "strftime"):
            return created_at.strftime("%B %d, %Y")
        return str(created_at)
    except Exception:
        return "Recently joined"


def _initials_from_name(name):
    parts = (name or "User").strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return (parts[0][:2] if parts[0] else "U").upper()


def get_user_profile(email):
    email = (email or "").strip().lower()
    if not email:
        return None

    users = db.collection("users")
    docs = list(users.where("email", "==", email).limit(1).stream())

    if not docs:
        return {
            "name": "User",
            "email": email,
            "account_status": "ACTIVE",
            "member_since": "Recently joined",
            "initials": "U",
        }

    data = docs[0].to_dict()
    name = data.get("name", "User")

    return {
        "name": name,
        "email": data.get("email", email),
        "account_status": data.get("account_status", "ACTIVE"),
        "member_since": _format_member_since(data.get("created_at")),
        "initials": _initials_from_name(name),
    }