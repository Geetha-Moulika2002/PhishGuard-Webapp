from flask import Flask, render_template, request

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def home():

    result = None
    score = 0
    indicators = []

    if request.method == 'POST':

        message = request.form['message'].lower()

        phishing_words = [
            'urgent',
            'click now',
            'verify',
            'bank',
            'otp',
            'winner',
            'prize',
            'account suspended',
            'login',
            'limited time'
        ]

        detected = 0

        for word in phishing_words:

            if word in message:
                indicators.append(f"Suspicious term detected: {word}")
                detected += 1

        score = detected * 15

        if score >= 60:
            result = "⚠️ High Risk Phishing Detected"

        elif score >= 30:
            result = "⚠️ Medium Risk Message"

        else:
            result = "✅ Safe Message"

    return render_template(
        'dashboard.html',
        result=result,
        score=score,
        indicators=indicators
    )

if __name__ == '__main__':
    app.run(debug=True)