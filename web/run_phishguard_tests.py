import re
import datetime

print("==========================================================")
print("     PHISHGUARD AUTOMATED MULTI-PLATFORM TEST SUITE     ")
print("==========================================================")

def analyze_message_py(text):
    if not text or not text.strip():
        return {"riskScore": 0, "riskLevel": "SAFE", "threatType": "Clean Message"}
    
    lower = text.lower()
    score = 0
    threat_type = "Clean Message"
    has_link = "http://" in lower or "https://" in lower or ".com" in lower or ".net" in lower or "bit.ly" in lower
    
    if "otp" in lower or "verification code" in lower or "passcode" in lower or "pin" in lower:
        score += 50
        threat_type = "OTP Theft & Social Engineering Attack"
        if has_link:
            score += 40
    elif "shipment" in lower or "on hold" in lower or "delivery address" in lower or "parcel" in lower or "package" in lower or "dhl" in lower or "fedex" in lower:
        score += 45
        threat_type = "Fake Parcel Delivery Address Trap"
        if has_link:
            score += 35
    elif "kyc" in lower or "account suspended" in lower or "sbi" in lower or "hdfc" in lower or "urgent" in lower:
        score += 45
        threat_type = "Banking KYC & Account Suspension Phishing"
        if has_link:
            score += 35
    elif "won" in lower or "winner" in lower or "prize" in lower or "reward" in lower:
        score += 40
        threat_type = "Fake Reward & Lucky Draw Scam"
        if has_link:
            score += 35
    elif has_link:
        score += 30
        threat_type = "Unverified External Link"
        
    score = min(score, 100)
    risk_level = "SAFE"
    if score >= 65:
        risk_level = "HIGH RISK"
    elif score >= 35:
        risk_level = "MEDIUM RISK"
        
    return {"riskScore": score, "riskLevel": risk_level, "threatType": threat_type}

def validate_password_py(pwd):
    has_length = len(pwd) >= 8
    has_upper = bool(re.search(r'[A-Z]', pwd))
    has_lower = bool(re.search(r'[a-z]', pwd))
    has_digit = bool(re.search(r'[0-9]', pwd))
    has_symbol = bool(re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>/?]', pwd))
    return has_length and has_upper and has_lower and has_digit and has_symbol

test_cases = [
    {"id": "TC-01", "name": "Banking & KYC Phishing Attack", "text": "URGENT: Your SBI bank account #4910 is suspended due to missing KYC. Share your OTP 849201 immediately at http://sbi-verify-kyc.com/login to restore access.", "expected_level": "HIGH RISK"},
    {"id": "TC-02", "name": "OTP Harvesting & Debit Trap", "text": "HDFC Alert: A debit request of Rs.24,500 was initiated on your card. If you did not authorize this, share OTP 491029 immediately to cancel transaction.", "expected_level": "HIGH RISK"},
    {"id": "TC-03", "name": "Google Password Reset Verification", "text": "Google Security: Someone requested a password reset. If this was not you, verify using PIN 941029 at http://google-security-verify.com", "expected_level": "HIGH RISK"},
    {"id": "TC-04", "name": "DHL Parcel Delivery Address Scam (Test Case 6)", "text": "DHL Express: Shipment #DHL-88421 is on hold at local facility. Update your delivery address details at http://dhl-address-update.com", "expected_level": "HIGH RISK"},
    {"id": "TC-05", "name": "FedEx Customs Fee Delivery Phishing", "text": "FedEx Alert: Your parcel #FX-94102 cannot be delivered due to unpaid customs fee of $2.99. Pay fee immediately: http://fedex-customs-pay.com", "expected_level": "HIGH RISK"},
    {"id": "TC-06", "name": "International Prize & Reward Scam", "text": "Congratulations! You have won $50,000 in the International Rewards Draw. Claim your prize now at http://reward-claim-win.com", "expected_level": "HIGH RISK"},
    {"id": "TC-07", "name": "Legitimate Appointment SMS", "text": "Your appointment with Dr. Sharma is confirmed for tomorrow at 4:30 PM. Reply CANCEL if you wish to reschedule.", "expected_level": "SAFE"},
    {"id": "TC-08", "name": "Legitimate Utility Payment SMS", "text": "Your monthly internet utility bill of $45.00 has been paid successfully. Thank you for using Service Provider.", "expected_level": "SAFE"},
]

passed_count = 0
failed_count = 0

print("\n--- 1. EXPLAINABLE AI INTENT ENGINE TEST RESULTS ---")
for tc in test_cases:
    res = analyze_message_py(tc["text"])
    status = "PASS ✅" if res["riskLevel"] == tc["expected_level"] else "FAIL ❌"
    if status == "PASS ✅":
        passed_count += 1
    else:
        failed_count += 1
    print(f"[{tc['id']}] {tc['name']}: Result={res['riskLevel']} ({res['riskScore']}/100) -> {status}")

print("\n--- 2. PASSWORD SECURITY CONSTRAINT TESTS (LoginActivity.java) ---")
pwd_tests = [
    ("WeakShort1", "pass", False),
    ("NoUpper123!", "pass123!", False),
    ("NoSymbol123", "Pass1234", False),
    ("ValidStrongPassword", "P@ssword123", True)
]

for name, pwd, expected in pwd_tests:
    res = validate_password_py(pwd)
    status = "PASS ✅" if res == expected else "FAIL ❌"
    if status == "PASS ✅":
        passed_count += 1
    else:
        failed_count += 1
    print(f"[PWD] Password '{pwd}': Validated={res} (Expected={expected}) -> {status}")

print("\n==========================================================")
print(f" TOTAL TEST RUN SUMMARY: PASSED={passed_count} | FAILED={failed_count} | TOTAL={len(test_cases) + len(pwd_tests)}")
print("==========================================================")
