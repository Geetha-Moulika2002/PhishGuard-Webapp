package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class OtpVerificationActivity extends AppCompatActivity {

    private EditText etOtp;
    private Button btnVerifyOtp;
    private TextView tvResendOtp;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_otp_verification);

        etOtp = findViewById(R.id.etOtp);
        btnVerifyOtp = findViewById(R.id.btnVerifyOtp);
        tvResendOtp = findViewById(R.id.tvResendOtp);

        btnVerifyOtp.setOnClickListener(v -> {
            String otp = etOtp.getText().toString().trim();
            if (otp.length() < 4) {
                Toast.makeText(this, "Please enter valid 6-digit OTP code", Toast.LENGTH_SHORT).show();
                return;
            }

            Toast.makeText(this, "OTP Verified Successfully!", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(OtpVerificationActivity.this, CreatePasswordActivity.class);
            startActivity(intent);
            finish();
        });

        tvResendOtp.setOnClickListener(v -> Toast.makeText(this, "New OTP code sent!", Toast.LENGTH_SHORT).show());
    }
}
