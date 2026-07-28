package com.phishguard.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;

public class ResultActivity extends AppCompatActivity {

    private TextView tvThreatType, tvRiskScore, tvSuspiciousWords, tvReason, tvSafeAlternative, tvMessageText;
    private Button btnDone, btnReportScam;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_result);

        tvThreatType = findViewById(R.id.tvThreatType);
        tvRiskScore = findViewById(R.id.tvRiskScore);
        tvSuspiciousWords = findViewById(R.id.tvSuspiciousWords);
        tvReason = findViewById(R.id.tvReason);
        tvSafeAlternative = findViewById(R.id.tvSafeAlternative);
        tvMessageText = findViewById(R.id.tvMessageText);
        btnDone = findViewById(R.id.btnDone);
        btnReportScam = findViewById(R.id.btnReportScam);

        String sms = getIntent().getStringExtra("sms_text");
        if (sms == null || sms.trim().isEmpty()) {
            sms = "Share your OTP 482910 to verify your bank account closure.";
        }

        if (tvMessageText != null) {
            tvMessageText.setText(sms);
        }

        // Execute On-Device Phishing Intent Analysis
        PhishingAnalyzer.AnalysisResult result = PhishingAnalyzer.analyzeMessage(sms);
        String currentTimeToday = PhishGuardDataStore.getFormattedCurrentTime() + " • Today";

        // 1. Record scan into Data Store local database history with real timestamp
        PhishGuardDataStore.getInstance().addScan(new PhishGuardDataStore.ScanItem(
                String.valueOf(System.currentTimeMillis()),
                "Manual SMS Scan",
                sms,
                result.riskScore,
                result.riskLevel != null ? result.riskLevel : (result.riskScore >= 65 ? "HIGH RISK" : (result.riskScore >= 35 ? "MEDIUM RISK" : "SAFE")),
                PhishGuardDataStore.getFormattedCurrentTime(),
                PhishGuardDataStore.getTodayDateKey(),
                result.threatType
        ));

        // 2. Save scan log to Firebase Firestore Database ("scans" collection)
        try {
            Map<String, Object> scanMap = new HashMap<>();
            scanMap.put("message", sms);
            scanMap.put("riskScore", result.riskScore);
            scanMap.put("riskLevel", result.riskLevel);
            scanMap.put("threatType", result.threatType);
            scanMap.put("userEmail", AuthManager.getUserEmail(this));
            scanMap.put("timestamp", new java.util.Date());

            FirebaseFirestore.getInstance().collection("scans").add(scanMap);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Display Explainable AI Fields
        if (tvThreatType != null) {
            tvThreatType.setText(result.threatType);
            if (result.riskScore >= 65) {
                tvThreatType.setTextColor(Color.parseColor("#EF4444")); // Red
            } else if (result.riskScore >= 35) {
                tvThreatType.setTextColor(Color.parseColor("#F59E0B")); // Amber
            } else {
                tvThreatType.setTextColor(Color.parseColor("#10B981")); // Green
            }
        }

        if (tvRiskScore != null) {
            tvRiskScore.setText(result.riskScore + "/100 Risk Score");
        }

        if (tvSuspiciousWords != null) {
            if (!result.attentionHighlights.isEmpty()) {
                StringBuilder words = new StringBuilder();
                for (String word : result.attentionHighlights) {
                    words.append("\"").append(word).append("\" ");
                }
                tvSuspiciousWords.setText(words.toString().trim());
            } else if (sms.toLowerCase().contains("otp")) {
                tvSuspiciousWords.setText("\"Share your OTP\"");
            } else {
                tvSuspiciousWords.setText("None (Message clean)");
            }
        }

        if (tvReason != null) {
            tvReason.setText(result.reason != null ? result.reason : "Asks for sensitive credentials.");
        }

        if (tvSafeAlternative != null) {
            tvSafeAlternative.setText(result.safeAlternative != null ? result.safeAlternative : "Do not share verification codes or passwords.");
        }

        final String targetSms = sms;

        if (btnDone != null) {
            btnDone.setOnClickListener(v -> finish());
        }

        if (btnReportScam != null) {
            btnReportScam.setOnClickListener(v -> {
                Intent intent = new Intent(this, ReportActivity.class);
                intent.putExtra("sms_content", targetSms);
                startActivity(intent);
            });
        }

        // Update statistics
        SharedPreferences prefs = getSharedPreferences("PhishGuardStats", MODE_PRIVATE);
        int scanned = prefs.getInt("messages_scanned", 0) + 1;
        int blocked = prefs.getInt("threats_blocked", 0) + (result.riskScore >= 65 ? 1 : 0);
        prefs.edit().putInt("messages_scanned", scanned).putInt("threats_blocked", blocked).apply();
    }
}