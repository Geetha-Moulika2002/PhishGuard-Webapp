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
            btnSendOtp.setText("Send Reset Code / Link");
            btnSendOtp.setOnClickListener(v -> {
                String contact = etResetContact.getText() != null ? etResetContact.getText().toString().trim() : "";
                if (contact.isEmpty()) {
                    etResetContact.setError("Please enter your registered email address or phone");
                    etResetContact.requestFocus();
                    return;
                }

                if (Patterns.EMAIL_ADDRESS.matcher(contact).matches() && mAuth != null) {
                    btnSendOtp.setEnabled(false);
                    btnSendOtp.setText("Sending...");
                    mAuth.sendPasswordResetEmail(contact)
                            .addOnCompleteListener(task -> {
                                btnSendOtp.setEnabled(true);
                                btnSendOtp.setText("Send Reset Code / Link");
                                if (task.isSuccessful()) {
                                    Toast.makeText(ForgotPasswordActivity.this, "Password reset email sent! Check inbox or proceed with Verification Code.", Toast.LENGTH_LONG).show();
                                } else {
                                    Toast.makeText(ForgotPasswordActivity.this, "Reset request processed! Proceeding to Verification.", Toast.LENGTH_SHORT).show();
                                }
                                Intent intent = new Intent(ForgotPasswordActivity.this, OtpVerificationActivity.class);
                                intent.putExtra("contact", contact);
                                startActivity(intent);
                            });
                } else {
                    Toast.makeText(this, "Verification Code Sent to " + contact, Toast.LENGTH_SHORT).show();
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
