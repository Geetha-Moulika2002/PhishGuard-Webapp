from firebase_config import db
from firebase_admin import firestore
from datetime import datetime, timedelta

# ==========================================
# FIRESTORE STATS MANAGEMENT
# ==========================================

def get_user_stats(email):
    """
    Fetch stats for a specific user from Firestore.
    Collection: 'stats', Document ID: email
    Returns dict: {"total_scans": int, "threats_detected": int, "safe_messages": int}
    """
    default_stats = {
        "total_scans": 0,
        "threats_detected": 0,
        "safe_messages": 0
    }

    if not email:
        return default_stats

    email = email.strip().lower()
    doc_ref = db.collection("stats").document(email)

    try:
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            return {
                "total_scans": data.get("total_scans", 0),
                "threats_detected": data.get("threats_detected", 0),
                "safe_messages": data.get("safe_messages", 0)
            }
        else:
            # Create default document for new user
            doc_ref.set(default_stats)
            return default_stats
    except Exception as e:
        print(f"Error fetching Firestore stats for {email}: {e}")
        return default_stats


def update_user_stats(email, is_threat):
    """
    Atomically update total_scans and threats_detected / safe_messages in Firestore stats document.
    """
    if not email:
        return

    email = email.strip().lower()
    doc_ref = db.collection("stats").document(email)

    inc_threat = 1 if is_threat else 0
    inc_safe = 0 if is_threat else 1

    try:
        doc_ref.set({
            "total_scans": firestore.Increment(1),
            "threats_detected": firestore.Increment(inc_threat),
            "safe_messages": firestore.Increment(inc_safe)
        }, merge=True)
    except Exception as e:
        print(f"Error updating Firestore stats for {email}: {e}")


# ==========================================
# FIRESTORE SCANS & THREATS MANAGEMENT
# ==========================================

def record_scan(email, message, risk_score, risk_level, prediction, indicator_count, indicators=None):
    """
    Store any scan (Safe or Threat) in the 'threats' collection in Firestore.
    """
    if not email:
        return

    email = email.strip().lower()
    threats_ref = db.collection("threats")
    now = datetime.now()

    scan_data = {
        "email": email,
        "message": message[:50] + ("..." if len(message) > 50 else ""),
        "full_message": message,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "prediction": prediction,  # "Safe" or "Threat"
        "indicator_count": indicator_count,
        "indicators": indicators or [],
        "date": now.strftime("%d %b %H:%M"),
        "iso_date": now.strftime("%Y-%m-%d"),
        "created_at": firestore.SERVER_TIMESTAMP
    }

    try:
        threats_ref.add(scan_data)
    except Exception as e:
        print(f"Error recording scan to Firestore for {email}: {e}")


def get_user_threats(email):
    """
    Retrieve all scan and threat logs for a specific user from Firestore.
    """
    if not email:
        return []

    email = email.strip().lower()
    threats_ref = db.collection("threats")

    try:
        docs = threats_ref.where("email", "==", email).stream()
        threats_list = []
        today_str = datetime.now().strftime("%Y-%m-%d")
        seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        for doc in docs:
            t = doc.to_dict()
            # Ensure prediction field exists for backward compatibility
            if "prediction" not in t:
                t["prediction"] = "Threat" if t.get("risk_level") == "High" or t.get("risk_score", 0) >= 50 else "Safe"
            if "full_message" not in t:
                t["full_message"] = t.get("message", "")

            iso_d = t.get("iso_date", "")
            t["is_today"] = (iso_d == today_str)
            t["is_7days"] = (iso_d >= seven_days_ago) if iso_d else True

            threats_list.append(t)

        # Sort threats by created_at or date descending
        threats_list.sort(key=lambda x: x.get("date", ""), reverse=True)
        return threats_list
    except Exception as e:
        print(f"Error fetching user scans from Firestore for {email}: {e}")
        return []


def get_user_activity_summary(email):
    """
    Lightweight activity snapshot for profile/settings views.
    """
    stats = get_user_stats(email)
    threats = get_user_threats(email)

    last_scan = "No scans yet"
    last_scan_prediction = None

    if threats:
        latest = threats[0]
        last_scan = latest.get("date", "Recently")
        last_scan_prediction = latest.get("prediction")

    total = stats.get("total_scans", 0)
    threats_detected = stats.get("threats_detected", 0)
    threat_rate = round((threats_detected / total) * 100, 1) if total > 0 else 0.0

    return {
        "stats": stats,
        "last_scan": last_scan,
        "last_scan_prediction": last_scan_prediction,
        "threat_rate": threat_rate,
        "recent_scan_count": len([t for t in threats if t.get("is_7days")]),
    }
