package com.phishguard.app;

import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class SecurityScoreActivity extends AppCompatActivity {

    private TextView tvScoreDisplay;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_security_score);

        tvScoreDisplay = findViewById(R.id.tvScoreDisplay);
        if (tvScoreDisplay != null) {
            tvScoreDisplay.setText(PhishGuardDataStore.getInstance().getSecurityScore() + "/100");
        }
    }
}
