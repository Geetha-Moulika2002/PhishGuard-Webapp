package com.phishguard.app;

import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class AboutAppActivity extends AppCompatActivity {

    private TextView tvAboutDescription;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_about_app);

        tvAboutDescription = findViewById(R.id.tvAboutDescription);
        if (tvAboutDescription != null) {
            tvAboutDescription.setText("PhishGuard protects users from fraudulent SMS, phishing attempts and malicious QR codes using intelligent on-device analysis.");
        }
    }
}
