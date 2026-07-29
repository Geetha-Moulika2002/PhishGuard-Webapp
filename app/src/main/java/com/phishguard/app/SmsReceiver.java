package com.phishguard.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;

public class SmsReceiver extends BroadcastReceiver {

    private static final String CHANNEL_ID = "PHISHGUARD_ALERTS";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.e("PHISHGUARD_SMS", "=================================================");
        Log.e("PHISHGUARD_SMS", ">>> SMS_RECEIVED BROADCAST INTERCEPTED BY PHISHGUARD <<<");
        Log.e("PHISHGUARD_SMS", "=================================================");

        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(action) && !"android.intent.action.DATA_SMS_RECEIVED".equals(action)) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        try {
            Object[] pdus = (Object[]) bundle.get("pdus");
            if (pdus == null || pdus.length == 0) return;

            String format = bundle.getString("format");
            StringBuilder fullMessage = new StringBuilder();
            String rawSender = "SMS Sender";

            for (Object pdu : pdus) {
                SmsMessage smsMessage;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                }
                if (smsMessage != null) {
                    if (smsMessage.getOriginatingAddress() != null) {
                        rawSender = smsMessage.getOriginatingAddress();
                    }
                    fullMessage.append(smsMessage.getMessageBody());
                }
            }

            String messageBody = fullMessage.toString().trim();
            if (messageBody.isEmpty()) return;

            String maskedSender = PhishGuardDataStore.maskPhoneNumber(rawSender);
            Log.e("PHISHGUARD_SMS", "Masked Sender: " + maskedSender);
            Log.e("PHISHGUARD_SMS", "Content Snippet: " + PhishGuardDataStore.getSafeCloudPreview(messageBody));

            // 1. Check if Sender is Blocked
            if (PhishGuardDataStore.getInstance().isSenderBlocked(rawSender) || PhishGuardDataStore.getInstance().isSenderBlocked(maskedSender)) {
                Log.e("PHISHGUARD_SMS", "Blocked sender message suppressed: " + rawSender);
                
                try {
                    Intent alertIntent = new Intent(context, AlertActivity.class);
                    alertIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    alertIntent.putExtra("is_blocked_alert", true);
                    alertIntent.putExtra("sender", rawSender);
                    alertIntent.putExtra("message", messageBody);
                    context.startActivity(alertIntent);
                } catch (Exception e) {
                    e.printStackTrace();
                }

                abortBroadcast();
                return;
            }

            // 2. On-Device Explainable AI Intent Analysis (100% Local On-Device Processing)
            PhishingAnalyzer.AnalysisResult result = PhishingAnalyzer.analyzeMessage(messageBody);
            Log.e("PHISHGUARD_SMS", "AI Score: " + result.riskScore + " | Level: " + result.riskLevel);

            String scanId = String.valueOf(System.currentTimeMillis());
            String formattedTime = PhishGuardDataStore.getFormattedCurrentTime();
            String dateKey = PhishGuardDataStore.getTodayDateKey();

            // 3. Save locally in DataStore for Mobile App UI (Full local message)
            PhishGuardDataStore.getInstance().addScan(new PhishGuardDataStore.ScanItem(
                    scanId,
                    maskedSender,
                    messageBody,
                    result.riskScore,
                    result.riskLevel,
                    formattedTime,
                    dateKey,
                    result.threatType
            ));

            // 4. Cloud Database Privacy Hardening (Firebase Firestore): PII Masked & Truncated Safe Snippet Only
            String userEmail = AuthManager.getUserEmail(context);
            if (userEmail != null && !userEmail.isEmpty()) {
                try {
                    Map<String, Object> scanDoc = new HashMap<>();
                    scanDoc.put("userEmail", userEmail);
                    scanDoc.put("sender", maskedSender); // Masked PII
                    scanDoc.put("message", PhishGuardDataStore.getSafeCloudPreview(messageBody)); // Short safe snippet
                    scanDoc.put("riskScore", result.riskScore);
                    scanDoc.put("riskLevel", result.riskLevel);
                    scanDoc.put("threatType", result.threatType);
                    scanDoc.put("timestamp", formattedTime);
                    scanDoc.put("dateKey", dateKey);
                    scanDoc.put("createdAt", System.currentTimeMillis());

                    FirebaseFirestore.getInstance().collection("scans").document(scanId).set(scanDoc);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            // 5. Trigger System Alert & In-App Notification if High Risk Phishing (Score >= 60 or High Risk)
            if (result.riskScore >= 60 || "HIGH RISK".equalsIgnoreCase(result.riskLevel)) {
                PhishGuardDataStore.getInstance().addNotification(new PhishGuardDataStore.NotificationItem(
                        "🚨 Phishing SMS Alert",
                        "High Risk SMS from " + maskedSender + " (" + result.threatType + " - Risk Score: " + result.riskScore + "/100)",
                        formattedTime,
                        dateKey,
                        "threat"
                ));

                createNotificationChannel(context);

                Intent alertIntent = new Intent(context, AlertActivity.class);
                alertIntent.putExtra("risk_score", result.riskScore);
                alertIntent.putExtra("sms_text", messageBody);
                alertIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

                PendingIntent pendingIntent = PendingIntent.getActivity(
                        context, (int) System.currentTimeMillis(), alertIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_dialog_alert)
                        .setContentTitle("🚨 PhishGuard Threat Alert!")
                        .setContentText("High Risk SMS Intercepted from " + maskedSender + " (" + result.riskScore + "/100)")
                        .setSubText(result.threatType)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(messageBody))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true);

                NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    manager.notify((int) (System.currentTimeMillis() % 100000), builder.build());
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "PhishGuard Phishing Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts for intercepted phishing SMS messages");
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
