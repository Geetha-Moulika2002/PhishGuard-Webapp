package com.phishguard.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.util.Patterns;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException;
import com.google.firebase.auth.FirebaseAuthInvalidUserException;
import com.google.firebase.auth.FirebaseAuthUserCollisionException;
import com.google.firebase.auth.FirebaseAuthWeakPasswordException;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.SetOptions;

import java.util.HashMap;
import java.util.Map;

public class LoginActivity extends AppCompatActivity {

    private EditText etEmail, etPassword, etFullName;
    private TextView lblFullName, tvSubtitle, tabLogin, tabRegister, tvTogglePassword;
    private TextView ruleLength, ruleCase, ruleNumberSymbol;
    private LinearLayout layoutPasswordRules;
    private Button btnLogin;
    private ProgressBar progressAuth;

    private boolean isRegisterMode = false;
    private boolean isPasswordVisible = false;

    private FirebaseAuth mAuth;
    private FirebaseFirestore db;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        // Safely initialize Firebase instances
        try {
            mAuth = FirebaseAuth.getInstance();
            db = FirebaseFirestore.getInstance();
        } catch (Exception e) {
            e.printStackTrace();
        }

        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        etFullName = findViewById(R.id.etFullName);
        lblFullName = findViewById(R.id.lblFullName);
        tvSubtitle = findViewById(R.id.tvSubtitle);
        tvTogglePassword = findViewById(R.id.tvTogglePassword);

        layoutPasswordRules = findViewById(R.id.layoutPasswordRules);
        ruleLength = findViewById(R.id.ruleLength);
        ruleCase = findViewById(R.id.ruleCase);
        ruleNumberSymbol = findViewById(R.id.ruleNumberSymbol);

        tabLogin = findViewById(R.id.tabLogin);
        tabRegister = findViewById(R.id.tabRegister);

        btnLogin = findViewById(R.id.btnLogin);
        progressAuth = findViewById(R.id.progressAuth);

        // Password visibility toggle
        tvTogglePassword.setOnClickListener(v -> togglePasswordVisibility());

        // Real-time password strength watcher
        etPassword.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (isRegisterMode) {
                    validatePasswordStrengthRealtime(s.toString());
                }
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        tabLogin.setOnClickListener(v -> setMode(false));
        tabRegister.setOnClickListener(v -> setMode(true));

        btnLogin.setOnClickListener(v -> handleAuthAction());
    }

    private void togglePasswordVisibility() {
        if (isPasswordVisible) {
            // Hide password
            etPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            tvTogglePassword.setText("SHOW");
            isPasswordVisible = false;
        } else {
            // Show password
            etPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
            tvTogglePassword.setText("HIDE");
            isPasswordVisible = true;
        }
        // Move cursor to end
        etPassword.setSelection(etPassword.getText().length());
    }

    private void setMode(boolean register) {
        isRegisterMode = register;
        if (isRegisterMode) {
            tabRegister.setBackgroundResource(R.drawable.bg_button_primary);
            tabRegister.setTextColor(0xFFFFFFFF);
            tabLogin.setBackground(null);
            tabLogin.setTextColor(0xFF94A3B8);

            lblFullName.setVisibility(View.VISIBLE);
            etFullName.setVisibility(View.VISIBLE);
            layoutPasswordRules.setVisibility(View.VISIBLE);

            tvSubtitle.setText("Create a secure account to protect your SMS communications");
            btnLogin.setText("Register & Create Account");

            validatePasswordStrengthRealtime(etPassword.getText().toString());
        } else {
            tabLogin.setBackgroundResource(R.drawable.bg_button_primary);
            tabLogin.setTextColor(0xFFFFFFFF);
            tabRegister.setBackground(null);
            tabRegister.setTextColor(0xFF94A3B8);

            lblFullName.setVisibility(View.GONE);
            etFullName.setVisibility(View.GONE);
            layoutPasswordRules.setVisibility(View.GONE);

            tvSubtitle.setText("Sign in to activate real-time phishing protection");
            btnLogin.setText("Sign In & Continue");
        }
    }

    private boolean validatePasswordStrengthRealtime(String password) {
        boolean hasLength = password.length() >= 8;
        boolean hasUpper = password.matches(".*[A-Z].*");
        boolean hasLower = password.matches(".*[a-z].*");
        boolean hasDigit = password.matches(".*[0-9].*");
        boolean hasSymbol = password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*");

        // Length Rule
        if (hasLength) {
            ruleLength.setText("✔ At least 8 characters long");
            ruleLength.setTextColor(0xFF10B981);
        } else {
            ruleLength.setText("✖ At least 8 characters long");
            ruleLength.setTextColor(0xFFEF4444);
        }

        // Case Rule
        if (hasUpper && hasLower) {
            ruleCase.setText("✔ Contains uppercase (A-Z) & lowercase (a-z)");
            ruleCase.setTextColor(0xFF10B981);
        } else {
            ruleCase.setText("✖ Contains uppercase (A-Z) & lowercase (a-z)");
            ruleCase.setTextColor(0xFFEF4444);
        }

        // Number & Symbol Rule
        if (hasDigit && hasSymbol) {
            ruleNumberSymbol.setText("✔ Contains a number (0-9) & special symbol (@#$%)");
            ruleNumberSymbol.setTextColor(0xFF10B981);
        } else {
            ruleNumberSymbol.setText("✖ Contains a number (0-9) & special symbol (@#$%)");
            ruleNumberSymbol.setTextColor(0xFFEF4444);
        }

        return hasLength && hasUpper && hasLower && hasDigit && hasSymbol;
    }

    private void handleAuthAction() {
        String email = etEmail.getText() != null ? etEmail.getText().toString().trim() : "";
        String password = etPassword.getText() != null ? etPassword.getText().toString() : "";
        String fullName = etFullName.getText() != null ? etFullName.getText().toString().trim() : "";

        // 1. Strict Email Validation
        if (email.isEmpty()) {
            etEmail.setError("Email address is required");
            etEmail.requestFocus();
            return;
        }

        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches() || !email.contains(".")) {
            etEmail.setError("Please enter a valid email address (e.g. user@domain.com)");
            etEmail.requestFocus();
            return;
        }

        // 2. Strict Password Validation
        if (password.isEmpty()) {
            etPassword.setError("Password is required");
            etPassword.requestFocus();
            return;
        }

        if (isRegisterMode) {
            if (fullName.isEmpty() || fullName.length() < 2) {
                etFullName.setError("Please enter your full name (at least 2 letters)");
                etFullName.requestFocus();
                return;
            }

            if (!validatePasswordStrengthRealtime(password)) {
                etPassword.setError("Password does not meet security requirements");
                etPassword.requestFocus();
                Toast.makeText(this, "Password must be at least 8 characters and include uppercase, lowercase, number, and special symbol.", Toast.LENGTH_LONG).show();
                return;
            }
        } else {
            if (password.length() < 6) {
                etPassword.setError("Password must be at least 6 characters");
                etPassword.requestFocus();
                return;
            }
        }

        // Show loading spinner & disable button
        setLoadingState(true);

        if (mAuth != null) {
            if (isRegisterMode) {
                // Firebase Registration
                mAuth.createUserWithEmailAndPassword(email, password)
                        .addOnCompleteListener(this, task -> {
                            if (task.isSuccessful()) {
                                FirebaseUser user = mAuth.getCurrentUser();
                                String uid = user != null ? user.getUid() : "";

                                // Store User Record in Cloud Firestore Database
                                saveUserToFirestore(uid, email, fullName);

                                AuthManager.saveSession(LoginActivity.this, email, fullName);
                                setLoadingState(false);
                                Toast.makeText(LoginActivity.this, "Registration Successful! Account saved in Firebase.", Toast.LENGTH_SHORT).show();
                                proceedToApp(true);
                            } else {
                                setLoadingState(false);
                                String errorMessage = parseFirebaseException(task.getException());
                                Toast.makeText(LoginActivity.this, errorMessage, Toast.LENGTH_LONG).show();
                            }
                        });
            } else {
                // Firebase Sign In
                mAuth.signInWithEmailAndPassword(email, password)
                        .addOnCompleteListener(this, task -> {
                            if (task.isSuccessful()) {
                                FirebaseUser user = mAuth.getCurrentUser();
                                String uid = user != null ? user.getUid() : "";

                                // Update Last Login & Audit Log in Firestore
                                recordLoginInFirestore(uid, email);

                                AuthManager.saveSession(LoginActivity.this, email, fullName);
                                setLoadingState(false);
                                Toast.makeText(LoginActivity.this, "Sign In Successful! Welcome back.", Toast.LENGTH_SHORT).show();
                                proceedToApp(false);
                            } else {
                                setLoadingState(false);
                                String errorMessage = parseFirebaseException(task.getException());
                                Toast.makeText(LoginActivity.this, errorMessage, Toast.LENGTH_LONG).show();
                            }
                        });
            }
        } else {
            // Local Session Fallback
            setLoadingState(false);
            AuthManager.saveSession(this, email, fullName);
            Toast.makeText(this, "Welcome back!", Toast.LENGTH_SHORT).show();
            proceedToApp(isRegisterMode);
        }
    }

    private void setLoadingState(boolean isLoading) {
        if (isLoading) {
            btnLogin.setEnabled(false);
            btnLogin.setAlpha(0.6f);
            btnLogin.setText(isRegisterMode ? "Creating Account..." : "Signing In...");
            if (progressAuth != null) progressAuth.setVisibility(View.VISIBLE);
        } else {
            btnLogin.setEnabled(true);
            btnLogin.setAlpha(1.0f);
            btnLogin.setText(isRegisterMode ? "Register & Create Account" : "Sign In & Continue");
            if (progressAuth != null) progressAuth.setVisibility(View.GONE);
        }
    }

    private String parseFirebaseException(Exception exception) {
        if (exception instanceof FirebaseAuthUserCollisionException) {
            return "An account already exists with this email address. Please Sign In instead.";
        } else if (exception instanceof FirebaseAuthWeakPasswordException) {
            return "Password is too weak. Please use a stronger password.";
        } else if (exception instanceof FirebaseAuthInvalidCredentialsException) {
            return "Invalid email or password. Please verify your credentials and try again.";
        } else if (exception instanceof FirebaseAuthInvalidUserException) {
            return "No registered account found with this email address. Please Register first.";
        } else if (exception != null && exception.getMessage() != null) {
            return exception.getMessage();
        }
        return "Authentication failed. Please check your network connection and try again.";
    }

    private void saveUserToFirestore(String uid, String email, String fullName) {
        if (db != null && !uid.isEmpty()) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("uid", uid);
            userMap.put("email", email);
            userMap.put("fullName", fullName != null && !fullName.isEmpty() ? fullName : extractNameFromEmail(email));
            userMap.put("status", "ACTIVE");
            userMap.put("role", "USER");
            userMap.put("authProvider", "EMAIL_PASSWORD");
            userMap.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);
            userMap.put("createdAt", System.currentTimeMillis());
            userMap.put("lastLoginTime", System.currentTimeMillis());

            db.collection("users").document(uid).set(userMap, SetOptions.merge());
        }
    }

    private void recordLoginInFirestore(String uid, String email) {
        if (db != null && !uid.isEmpty()) {
            Map<String, Object> updateMap = new HashMap<>();
            updateMap.put("lastLoginTime", System.currentTimeMillis());
            updateMap.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);

            db.collection("users").document(uid).set(updateMap, SetOptions.merge());

            // Create an audit record under login_history sub-collection
            Map<String, Object> logMap = new HashMap<>();
            logMap.put("timestamp", System.currentTimeMillis());
            logMap.put("email", email);
            logMap.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);
            logMap.put("loginResult", "SUCCESS");

            db.collection("users").document(uid).collection("login_history").add(logMap);
        }
    }

    private String extractNameFromEmail(String email) {
        if (email != null && email.contains("@")) {
            String prefix = email.split("@")[0];
            if (!prefix.isEmpty()) {
                return prefix.substring(0, 1).toUpperCase() + prefix.substring(1);
            }
        }
        return "Protected User";
    }

    private void proceedToApp(boolean isRegistrationFlow) {
        Intent nextIntent;
        if (isRegistrationFlow) {
            // New Registration: Direct to SecurityCenterActivity first to enable Notification Listener & SMS permissions
            nextIntent = new Intent(LoginActivity.this, SecurityCenterActivity.class);
        } else {
            // Existing Sign In: Direct straight to DashboardActivity
            nextIntent = new Intent(LoginActivity.this, DashboardActivity.class);
        }

        startActivity(nextIntent);
        finish();
    }

    private boolean isNotificationServiceEnabled() {
        String packageName = getPackageName();
        String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return flat != null && flat.contains(packageName);
    }
}