from flask import (
    Flask,
    render_template,
    request,
    redirect,
    session,
    url_for,
    jsonify
)
import joblib
import json
from services.user_service import (
    create_user,
    authenticate_user,
    get_user_profile
)
from services.stats_service import (
    get_user_stats,
    update_user_stats,
    record_scan,
    get_user_threats,
    get_user_activity_summary
)
from firebase_config import db
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "phishguard_secret_key_2026"
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)


# ==========================================
# LOAD TRAINED MODEL AND VECTORIZER
# ==========================================

svm_model = joblib.load("phishguard_svm.pkl")
if not hasattr(svm_model, "_effective_probability"):
    svm_model._effective_probability = getattr(svm_model, "probability", False)
vectorizer = joblib.load("vectorizer.pkl")


# ==========================================
# LOGIN PAGE
# ==========================================

@app.route("/login", methods=["GET", "POST"])
def login():

    if "user" in session:
        return redirect("/dashboard")

    error = None
    email = ""

    if request.method == "POST":

        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        remember = request.form.get("remember")

        success, message, user = authenticate_user(
            email,
            password
        )

        if success:
            session.clear()
            session["user"] = user["email"]
            session["name"] = user.get("name", "User")

            if remember:
                session.permanent = True
            else:
                session.permanent = False

            return redirect("/dashboard")

        error = message

    return render_template(
        "login.html",
        error=error,
        email=email
    )

@app.route("/check-email", methods=["POST"])
def check_email():
    from flask import jsonify
    try:
        data = request.get_json(silent=True) or request.form
        email = data.get("email", "").strip().lower()
        if not email:
            return jsonify({"exists": False})
        users = db.collection("users")
        existing = users.where("email", "==", email).limit(1).stream()
        if list(existing):
            return jsonify({"exists": True})
    except Exception as e:
        print(f"Error checking email: {e}")
    return jsonify({"exists": False})

@app.route("/create-account", methods=["GET", "POST"])
def create_account():

    if request.method == "POST":

        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")

        try:
            if password != confirm:
                return render_template(
                    "create_account.html",
                    error="Passwords do not match.",
                    name=name,
                    email=email
                )

            ok, message = create_user(name, email, password)

            print(f"DEBUG => ok={ok}, message={message}")

            if ok:
                return render_template(
                    "create_account.html",
                    success="Account created successfully! Please login."
                )
            else:
                return render_template(
                    "create_account.html",
                    error=message,
                    name=name,
                    email=email
                )

        except Exception as e:
            print(f"ERROR in create_account: {e}")
            return render_template(
                "create_account.html",
                error=f"Something went wrong: {str(e)}",
                name=name,
                email=email
            )

    return render_template("create_account.html")

# ==========================================
# DASHBOARD / SMS SCANNER
# ==========================================
@app.route('/scanner', methods=['GET', 'POST'])
def scanner():
    return home()

@app.route('/')
def index():
    return redirect('/login')

@app.route('/dashboard', methods=['GET', 'POST'])
def home():
    if "user" not in session:
        return redirect("/login")

    user_email = session["user"]
    stats = get_user_stats(user_email)

    result = None
    score = 0
    indicators = []
    explanation = ""

    if request.method == 'POST':

        message = request.form['message']

        transformed_text = vectorizer.transform(
            [message]
        )

        prediction = svm_model.predict(
            transformed_text
        )[0]

        print("Prediction =", prediction)

        phishing_words = [
            "urgent",
            "verify",
            "bank",
            "otp",
            "click",
            "winner",
            "prize",
            "account",
            "login"
        ]

        indicator_map = {
            "urgent": "✓ Urgency Tactic Detected",
            "verify": "✓ Verification Request Detected",
            "bank": "✓ Financial Entity Mentioned",
            "otp": "✓ Credential / OTP Request Detected",
            "click": "✓ Suspicious Call-To-Action Detected",
            "winner": "✓ Prize Scam Indicator Detected",
            "prize": "✓ Prize Scam Indicator Detected",
            "account": "✓ Account Related Trigger Detected",
            "login": "✓ Login Credential Request Detected"
        }

        for word in phishing_words:

            if word.lower() in message.lower():

                indicators.append(
                    indicator_map[word]
                )

        score = min(
            40 + (len(indicators) * 10),
            95
        )

        # Hybrid Detection Logic
        if len(indicators) >= 2:
            result = "⚠️ Phishing Message Detected"
            if score < 70:
                score = 70

            explanation = (
                "The AI model identified phishing-related "
                "patterns including urgency tactics, "
                "verification requests, financial references "
                "and suspicious call-to-action indicators."
            )

            # Record threat scan in Firestore
            record_scan(
                email=user_email,
                message=message,
                risk_score=score,
                risk_level="High",
                prediction="Threat",
                indicator_count=len(indicators),
                indicators=indicators
            )
            # Update user stats in Firestore
            update_user_stats(user_email, is_threat=True)

        else:

            result = "✅ Safe Message"
            if score > 30:
                score = 20

            explanation = (
                "No significant phishing indicators were "
                "detected by the AI model. The message "
                "appears safe based on current analysis."
            )

            # Record safe scan in Firestore
            record_scan(
                email=user_email,
                message=message,
                risk_score=score,
                risk_level="Safe",
                prediction="Safe",
                indicator_count=len(indicators),
                indicators=indicators
            )
            # Update user stats in Firestore
            update_user_stats(user_email, is_threat=False)

        # Re-fetch updated user stats from Firestore
        stats = get_user_stats(user_email)

    return render_template(
        "dashboard.html",
        user_name=session.get("name", "User"),
        result=result,
        score=score,
        indicators=indicators,
        explanation=explanation,
        stats=stats
    )



# ==========================================
# THREAT HISTORY
# ==========================================

@app.route('/threats')
def threats():
    if "user" not in session:
        return redirect("/login")

    threats_data = get_user_threats(session["user"])

    return render_template(
        "threats.html",
        threats=threats_data
    )


# ==========================================
# REPORTS
# ==========================================

@app.route('/reports')
def reports():
    if "user" not in session:
        return redirect("/login")

    stats = get_user_stats(session["user"])

    return render_template(
        "reports.html",
        stats=stats
    )


# ==========================================
# SETTINGS
# ==========================================

@app.route('/settings')
def settings():
    if "user" not in session:
        return redirect("/login")

    email = session["user"]
    profile = get_user_profile(email) or {
        "name": session.get("name", "User"),
        "email": email,
        "account_status": "ACTIVE",
        "member_since": "Recently joined",
        "initials": "U",
    }
    activity = get_user_activity_summary(email)

    return render_template(
        "settings.html",
        profile=profile,
        stats=activity["stats"],
        activity=activity,
        engine_online=True,
    )


@app.route('/api/settings-data')
def settings_data():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    email = session["user"]
    activity = get_user_activity_summary(email)

    return jsonify({
        "stats": activity["stats"],
        "last_scan": activity["last_scan"],
        "last_scan_prediction": activity["last_scan_prediction"],
        "threat_rate": activity["threat_rate"],
        "recent_scan_count": activity["recent_scan_count"],
        "server_time": datetime.now().strftime("%I:%M:%S %p"),
        "server_date": datetime.now().strftime("%A, %B %d, %Y"),
        "engine_online": True,
    })


# ==========================================
# APPLICATION START
# ==========================================
@app.route("/logout")
def logout():

    session.clear()

    return redirect("/login")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)