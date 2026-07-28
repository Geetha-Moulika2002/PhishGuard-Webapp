package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class ForgotPasswordActivity extends AppCompatActivity {

    private EditText etResetContact;
    private Button btnSendOtp;
    private TextView tvBackToLogin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password);

        etResetContact = findViewById(R.id.etResetContact);
        btnSendOtp = findViewById(R.id.btnSendOtp);
        tvBackToLogin = findViewById(R.id.tvBackToLogin);

        btnSendOtp.setOnClickListener(v -> {
            String contact = etResetContact.getText().toString().trim();
            if (contact.isEmpty()) {
                Toast.makeText(this, "Please enter your email or phone number", Toast.LENGTH_SHORT).show();
                return;
            }

            Toast.makeText(this, "OTP Sent to " + contact, Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(ForgotPasswordActivity.this, OtpVerificationActivity.class);
            intent.putExtra("contact", contact);
            startActivity(intent);
        });

        tvBackToLogin.setOnClickListener(v -> finish());
    }
}
