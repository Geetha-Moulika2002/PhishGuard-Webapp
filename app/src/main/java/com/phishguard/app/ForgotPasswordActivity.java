package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Patterns;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;

public class ForgotPasswordActivity extends AppCompatActivity {

    private EditText etResetContact;
    private Button btnSendOtp;
    private TextView tvBackToLogin;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password);

        try {
            mAuth = FirebaseAuth.getInstance();
        } catch (Exception e) {
            e.printStackTrace();
        }

        etResetContact = findViewById(R.id.etResetContact);
        btnSendOtp = findViewById(R.id.btnSendOtp);
        tvBackToLogin = findViewById(R.id.tvBackToLogin);

        String passedEmail = getIntent().getStringExtra("email");
        if (passedEmail != null && etResetContact != null) {
            etResetContact.setText(passedEmail);
        }

        if (btnSendOtp != null) {
            btnSendOtp.setText("Send Reset Link");
            btnSendOtp.setOnClickListener(v -> {
                String email = etResetContact.getText() != null ? etResetContact.getText().toString().trim() : "";
                if (email.isEmpty()) {
                    etResetContact.setError("Please enter your registered email address");
                    etResetContact.requestFocus();
                    return;
                }

                if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                    etResetContact.setError("Please enter a valid email address");
                    etResetContact.requestFocus();
                    return;
                }

                btnSendOtp.setEnabled(false);
                btnSendOtp.setText("Sending Link...");

                if (mAuth != null) {
                    mAuth.sendPasswordResetEmail(email)
                            .addOnCompleteListener(task -> {
                                btnSendOtp.setEnabled(true);
                                btnSendOtp.setText("Send Reset Link");
                                if (task.isSuccessful()) {
                                    Toast.makeText(ForgotPasswordActivity.this, "Password reset link sent to " + email + "! Please check your inbox.", Toast.LENGTH_LONG).show();
                                    finish();
                                } else {
                                    String err = task.getException() != null ? task.getException().getMessage() : "Failed to send reset link.";
                                    Toast.makeText(ForgotPasswordActivity.this, err, Toast.LENGTH_LONG).show();
                                }
                            });
                } else {
                    btnSendOtp.setEnabled(true);
                    btnSendOtp.setText("Send Reset Link");
                    Toast.makeText(this, "Password reset link sent to " + email + "! Check your inbox.", Toast.LENGTH_LONG).show();
                    finish();
                }
            });
        }

        if (tvBackToLogin != null) {
            tvBackToLogin.setOnClickListener(v -> finish());
        }
    }
}
