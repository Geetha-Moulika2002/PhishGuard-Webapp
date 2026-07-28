package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class OnboardingActivity extends AppCompatActivity {

    private Button btnNext;
    private TextView txtSkip, txtTitle, txtDescription;
    private View dot1, dot2, dot3;
    private int currentSlide = 0;

    private final String[] titles = {
            "Welcome to PhishGuard",
            "Why Choose PhishGuard",
            "Permissions Introduction"
    };

    private final String[] descriptions = {
            "Your intelligent personal shield against modern fraudulent SMS traps, malicious links, and scam communications.",
            "PhishGuard protects users from fraudulent SMS, phishing attempts and malicious QR codes using intelligent on-device analysis.",
            "Enable Notification and SMS access to activate instant real-time threat detection without sacrificing your privacy."
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_onboarding);

        btnNext = findViewById(R.id.btnNext);
        txtSkip = findViewById(R.id.txtSkip);
        txtTitle = findViewById(R.id.txtTitle);
        txtDescription = findViewById(R.id.txtDescription);

        updateSlide();

        btnNext.setOnClickListener(v -> {
            if (currentSlide < 2) {
                currentSlide++;
                updateSlide();
            } else {
                proceedToLogin();
            }
        });

        txtSkip.setOnClickListener(v -> proceedToLogin());
    }

    private void updateSlide() {
        txtTitle.setText(titles[currentSlide]);
        txtDescription.setText(descriptions[currentSlide]);
        if (currentSlide == 2) {
            btnNext.setText("Get Started");
        } else {
            btnNext.setText("Continue");
        }
    }

    private void proceedToLogin() {
        AuthManager.setFirstLaunchCompleted(this);
        Intent intent = new Intent(OnboardingActivity.this, LoginActivity.class);
        startActivity(intent);
        finish();
    }
}