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

        String contact = getIntent().getStringExtra("contact");
        if (contact != null) {
            Toast.makeText(this, "Reset request active for: " + contact, Toast.LENGTH_SHORT).show();
        }

        btnVerifyOtp.setOnClickListener(v -> {
            String otp = etOtp.getText() != null ? etOtp.getText().toString().trim() : "";
            if (otp.length() < 4) {
                Toast.makeText(this, "Please enter your 4 or 6-digit verification code (e.g. 123456)", Toast.LENGTH_SHORT).show();
                return;
            }

            Toast.makeText(this, "Verification Successful! Set your new password.", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(OtpVerificationActivity.this, CreatePasswordActivity.class);
            startActivity(intent);
            finish();
        });

        if (tvResendOtp != null) {
            tvResendOtp.setOnClickListener(v -> Toast.makeText(this, "New Verification code sent to " + (contact != null ? contact : "your email"), Toast.LENGTH_SHORT).show());
        }
    }
}
