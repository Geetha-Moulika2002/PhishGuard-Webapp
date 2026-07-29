package com.phishguard.app;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ReportActivity extends AppCompatActivity {

    private EditText etScamSender, etSmsText, etIssueDescription;
    private Button btnSubmitReport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_report);

        etScamSender = findViewById(R.id.etScamSender);
        etSmsText = findViewById(R.id.etSmsText);
        etIssueDescription = findViewById(R.id.etIssueDescription);
        btnSubmitReport = findViewById(R.id.btnSubmitReport);

        String initialSms = getIntent().getStringExtra("sms_content");
        if (initialSms != null && etSmsText != null) {
            etSmsText.setText(initialSms);
        }

        if (btnSubmitReport != null) {
            btnSubmitReport.setOnClickListener(v -> {
                String senderHeader = etScamSender != null ? etScamSender.getText().toString().trim() : "";
                String smsContent = etSmsText != null ? etSmsText.getText().toString().trim() : "";
                String issueDesc = etIssueDescription != null ? etIssueDescription.getText().toString().trim() : "";

                if (senderHeader.isEmpty() && smsContent.isEmpty() && issueDesc.isEmpty()) {
                    Toast.makeText(this, "Please enter scammer phone/header or SMS content", Toast.LENGTH_SHORT).show();
                    return;
                }

                String targetSender = !senderHeader.isEmpty() ? senderHeader : extractSenderFromText(smsContent);
                if (targetSender == null) targetSender = "Reported Scam Sender";

                String finalDesc = issueDesc.isEmpty() ? "Suspicious scam communication reported by user" : issueDesc;
                String userEmail = AuthManager.getUserEmail(this);
                String currentTimeToday = PhishGuardDataStore.getFormattedCurrentTime() + " • Today";

                // 1. Save Scam Report to Local DataStore Database
                PhishGuardDataStore.getInstance().addScamReport(new PhishGuardDataStore.ScamReport(
                        smsContent,
                        finalDesc,
                        "None",
                        currentTimeToday,
                        PhishGuardDataStore.getTodayDateKey()
                ));

                // 2. Auto-block the reported scam sender header in Local DataStore
                PhishGuardDataStore.getInstance().addBlockedSender(new PhishGuardDataStore.BlockedSender(
                        targetSender, "Auto-blocked via Scam Report", "Today", PhishGuardDataStore.getTodayDateKey()
                ));

                // 3. Save Auto-Blocked Sender to Firebase Firestore Database ("blocked_senders")
                try {
                    Map<String, Object> blockMap = new HashMap<>();
                    blockMap.put("phoneOrHeader", targetSender);
                    blockMap.put("reason", "Auto-blocked via Scam Report");
                    blockMap.put("userEmail", userEmail);
                    blockMap.put("timestamp", new java.util.Date());
                    FirebaseFirestore.getInstance().collection("blocked_senders").add(blockMap);
                } catch (Exception e) {
                    e.printStackTrace();
                }

                // 4. Save Scam Report to Firebase Firestore Database ("scam_reports")
                try {
                    Map<String, Object> reportMap = new HashMap<>();
                    reportMap.put("senderHeader", targetSender);
                    reportMap.put("smsText", smsContent);
                    reportMap.put("issueDescription", finalDesc);
                    reportMap.put("userEmail", userEmail);
                    reportMap.put("timestamp", new java.util.Date());
                    reportMap.put("autoBlockedSender", targetSender);
                    reportMap.put("status", "SUBMITTED");

                    FirebaseFirestore.getInstance().collection("scam_reports").add(reportMap);
                } catch (Exception e) {
                    e.printStackTrace();
                }

                Toast.makeText(this, "Scam Reported & Sender [" + targetSender + "] Auto-Blocked in Database!", Toast.LENGTH_LONG).show();
                finish();
            });
        }
    }

    private String extractSenderFromText(String text) {
        if (text == null || text.isEmpty()) return null;
        Pattern pattern = Pattern.compile("([A-Z]{2}-[A-Z0-9]{4,10}|\\+?\\d{10,13})");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}
