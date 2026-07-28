package com.phishguard.app;

import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class AlertActivity extends AppCompatActivity {

    TextView tvRisk;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_alert);

        tvRisk = findViewById(R.id.tvRiskScore);

        int score = getIntent().getIntExtra(
                "risk_score",
                0
        );

        tvRisk.setText(
                "Risk Score : " + score + "%"
        );
    }
}