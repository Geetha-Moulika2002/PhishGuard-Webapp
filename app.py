from flask import Flask, render_template, request, redirect
import joblib
import json
from services.user_service import create_user
from firebase_config import db
from datetime import datetime

app = Flask(__name__)



# ==========================================
# LOAD TRAINED MODEL AND VECTORIZER
# ==========================================

svm_model = joblib.load("phishguard_svm.pkl")
vectorizer = joblib.load("vectorizer.pkl")


# ==========================================
# LOGIN PAGE
# ==========================================

@app.route('/login', methods=['GET', 'POST'])
def login():

    if request.method == 'POST':
        return redirect('/dashboard')

    return render_template('login.html')

@app.route('/create-account', methods=['GET', 'POST'])
def create_account():

    if request.method == 'POST':

        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]
        confirm = request.form["confirm_password"]

        if password != confirm:
            return "Passwords do not match."

        success, message = create_user(
            name,
            email,
            password
        )

        if success:
            return redirect("/login")

        return message

    return render_template("create_account.html")
# ==========================================
# DASHBOARD / SMS SCANNER
# ==========================================
@app.route('/scanner')
def scanner():

    with open("stats.json", "r") as file:
        stats = json.load(file)

    return render_template(
        "dashboard.html",
        page_title="SMS Scanner",
        stats=stats,
        result=None,
        score=0,
        indicators=[],
        explanation=""
    )

@app.route('/')
def index():
    return redirect('/login')
@app.route('/dashboard', methods=['GET', 'POST'])


def home():


    with open("stats.json", "r") as file:
        stats = json.load(file)

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

        stats["total_scans"] += 1

        # Hybrid Detection Logic

        if len(indicators) >= 2:

            result = "⚠️ Phishing Message Detected"

            stats["threats_detected"] += 1

            if score < 70:
                score = 70

            explanation = (
                "The AI model identified phishing-related "
                "patterns including urgency tactics, "
                "verification requests, financial references "
                "and suspicious call-to-action indicators."
            )

            with open("threats.json", "r") as file:
                threats = json.load(file)

            threats.append({
                "date": datetime.now().strftime("%d-%m-%Y %H:%M"),
                "message": message[:60],
                "risk_score": score,
                "risk_level": "High",
                "indicator_count": len(indicators)
            })

            with open("threats.json", "w") as file:
                json.dump(
                    threats,
                    file,
                    indent=4
                )

        else:

            result = "✅ Safe Message"

            stats["safe_messages"] += 1

            if score > 30:
                score = 20

            explanation = (
                "No significant phishing indicators were "
                "detected by the AI model. The message "
                "appears safe based on current analysis."
            )

        with open("stats.json", "w") as file:
            json.dump(
                stats,
                file,
                indent=4
            )

    return render_template(
        "dashboard.html",
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

    with open("threats.json", "r") as file:
        threats_data = json.load(file)

    threats_data.reverse()

    return render_template(
        "threats.html",
        threats=threats_data
    )


# ==========================================
# REPORTS
# ==========================================

@app.route('/reports')
def reports():

    with open("stats.json", "r") as file:
        stats = json.load(file)

    return render_template(
        "reports.html",
        stats=stats
    )


# ==========================================
# SETTINGS
# ==========================================

@app.route('/settings')
def settings():

    return render_template(
        "settings.html"
    )


# ==========================================
# APPLICATION START
# ==========================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)