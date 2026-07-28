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

    private EditText etSmsText, etIssueDescription;
    private Button btnSubmitReport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_report);

        etSmsText = findViewById(R.id.etSmsText);
        etIssueDescription = findViewById(R.id.etIssueDescription);
        btnSubmitReport = findViewById(R.id.btnSubmitReport);

        String initialSms = getIntent().getStringExtra("sms_content");
        if (initialSms != null && etSmsText != null) {
            etSmsText.setText(initialSms);
        }

        if (btnSubmitReport != null) {
            btnSubmitReport.setOnClickListener(v -> {
                String smsContent = etSmsText != null ? etSmsText.getText().toString().trim() : "";
                String issueDesc = etIssueDescription != null ? etIssueDescription.getText().toString().trim() : "";

                if (smsContent.isEmpty() && issueDesc.isEmpty()) {
                    Toast.makeText(this, "Please enter SMS content or describe the scam issue", Toast.LENGTH_SHORT).show();
                    return;
                }

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

                // 2. Extract potential sender header or phone number from SMS text
                String extractedSender = extractSenderFromText(smsContent);
                if (extractedSender != null) {
                    // Auto-block the reported scam sender
                    PhishGuardDataStore.getInstance().addBlockedSender(new PhishGuardDataStore.BlockedSender(
                            extractedSender, "Auto-blocked via Scam Report", "Today", PhishGuardDataStore.getTodayDateKey()
                    ));

                    // Save Auto-Blocked Sender to Firebase Firestore Database ("blocked_senders")
                    try {
                        Map<String, Object> blockMap = new HashMap<>();
                        blockMap.put("phoneOrHeader", extractedSender);
                        blockMap.put("reason", "Auto-blocked via Scam Report");
                        blockMap.put("userEmail", userEmail);
                        blockMap.put("timestamp", new java.util.Date());
                        FirebaseFirestore.getInstance().collection("blocked_senders").add(blockMap);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                // 3. Save Scam Report to Firebase Firestore Database ("scam_reports")
                try {
                    Map<String, Object> reportMap = new HashMap<>();
                    reportMap.put("smsText", smsContent);
                    reportMap.put("issueDescription", finalDesc);
                    reportMap.put("userEmail", userEmail);
                    reportMap.put("timestamp", new java.util.Date());
                    reportMap.put("autoBlockedSender", extractedSender != null ? extractedSender : "None");
                    reportMap.put("status", "SUBMITTED");

                    FirebaseFirestore.getInstance().collection("scam_reports")
                            .add(reportMap)
                            .addOnSuccessListener(docRef -> Toast.makeText(this, "Report saved to Firebase Database!", Toast.LENGTH_SHORT).show())
                            .addOnFailureListener(e -> e.printStackTrace());
                } catch (Exception e) {
                    e.printStackTrace();
                }

                Toast.makeText(this, "Scam Reported & Sender Auto-Blocked in Database!", Toast.LENGTH_LONG).show();
                finish();
            });
        }
    }

    private String extractSenderFromText(String text) {
        if (text == null || text.isEmpty()) return null;

        // Match phone numbers or uppercase headers (e.g. +1-800-555-0199 or AX-BANKALERT or 9876543210)
        Pattern pattern = Pattern.compile("([A-Z]{2}-[A-Z0-9]{4,10}|\\+?\\d{10,13})");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "Reported Scam Sender";
    }
}
