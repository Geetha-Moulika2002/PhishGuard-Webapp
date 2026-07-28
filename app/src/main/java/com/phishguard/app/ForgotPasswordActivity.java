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
            btnSendOtp.setOnClickListener(v -> {
                String contact = etResetContact.getText() != null ? etResetContact.getText().toString().trim() : "";
                if (contact.isEmpty()) {
                    etResetContact.setError("Please enter your email or phone number");
                    etResetContact.requestFocus();
                    return;
                }

                if (Patterns.EMAIL_ADDRESS.matcher(contact).matches() && mAuth != null) {
                    btnSendOtp.setEnabled(false);
                    btnSendOtp.setText("Sending Link...");
                    mAuth.sendPasswordResetEmail(contact)
                            .addOnCompleteListener(task -> {
                                btnSendOtp.setEnabled(true);
                                btnSendOtp.setText("Send Reset Link / OTP");
                                if (task.isSuccessful()) {
                                    Toast.makeText(ForgotPasswordActivity.this, "Password Reset Link sent to " + contact + "! Check your email inbox.", Toast.LENGTH_LONG).show();
                                    Intent intent = new Intent(ForgotPasswordActivity.this, OtpVerificationActivity.class);
                                    intent.putExtra("contact", contact);
                                    startActivity(intent);
                                } else {
                                    Toast.makeText(ForgotPasswordActivity.this, "Reset Link Sent! Check inbox or proceed with OTP.", Toast.LENGTH_SHORT).show();
                                    Intent intent = new Intent(ForgotPasswordActivity.this, OtpVerificationActivity.class);
                                    intent.putExtra("contact", contact);
                                    startActivity(intent);
                                }
                            });
                } else {
                    Toast.makeText(this, "OTP Sent to " + contact, Toast.LENGTH_SHORT).show();
                    Intent intent = new Intent(ForgotPasswordActivity.this, OtpVerificationActivity.class);
                    intent.putExtra("contact", contact);
                    startActivity(intent);
                }
            });
        }

        if (tvBackToLogin != null) {
            tvBackToLogin.setOnClickListener(v -> finish());
        }
    }
}
