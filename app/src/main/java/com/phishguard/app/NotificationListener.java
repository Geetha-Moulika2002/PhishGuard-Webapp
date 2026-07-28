package com.phishguard.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;

public class NotificationListener extends NotificationListenerService {

    private static final int MAX_PREVIEW_LENGTH = 200;

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "PHISHGUARD_ALERTS",
                    "PhishGuard Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
        Log.d("PHISHGUARD", "Notification Listener Service Active");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getPackageName() == null) return;

        String packageName = sbn.getPackageName();
        boolean isSmsApp = packageName.contains("messaging") || packageName.contains("mms") || packageName.contains("sms");
        if (!isSmsApp) return;

        CharSequence titleSeq = sbn.getNotification().extras.getCharSequence("android.title");
        CharSequence textSeq = sbn.getNotification().extras.getCharSequence("android.text");
        String sender = titleSeq != null ? titleSeq.toString() : "Unknown Sender";
        String messageBody = textSeq != null ? textSeq.toString() : "";

        if (messageBody == null || messageBody.trim().isEmpty()) return;

        // Filter out hidden notification placeholder
        if (messageBody.toLowerCase().contains("content hidden") || messageBody.toLowerCase().contains("sensitive notification")) {
            return;
        }

        // -----------------------------------------------------------------
        // BLOCKED SENDER CHECK & SUPPRESSION MECHANISM
        // -----------------------------------------------------------------
        if (PhishGuardDataStore.getInstance().isSenderBlocked(sender)) {
            Log.d("PHISHGUARD", "Blocked sender message intercepted: " + sender);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    cancelNotification(sbn.getKey());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            return;
        }

        if (messageBody.length() > MAX_PREVIEW_LENGTH) {
            messageBody = messageBody.substring(0, MAX_PREVIEW_LENGTH);
        }

        // Real On-Device Intent Risk Calculation
        PhishingAnalyzer.AnalysisResult result = PhishingAnalyzer.analyzeMessage(messageBody);

        String scanId = String.valueOf(System.currentTimeMillis());
        String formattedTime = PhishGuardDataStore.getFormattedCurrentTime();
        String dateKey = PhishGuardDataStore.getTodayDateKey();

        PhishGuardDataStore.getInstance().addScan(new PhishGuardDataStore.ScanItem(
                scanId,
                sender,
                messageBody,
                result.riskScore,
                result.riskLevel,
                formattedTime,
                dateKey,
                result.threatType
        ));

        // Sync to Firebase Firestore for Real-Time Cross-Platform Parity
        String userEmail = AuthManager.getUserEmail(this);
        if (userEmail != null && !userEmail.isEmpty()) {
            try {
                Map<String, Object> scanDoc = new HashMap<>();
                scanDoc.put("userEmail", userEmail);
                scanDoc.put("sender", sender);
                scanDoc.put("message", messageBody);
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

        if (result.riskScore >= 60 || "HIGH RISK".equalsIgnoreCase(result.riskLevel)) {
            PhishGuardDataStore.getInstance().addNotification(new PhishGuardDataStore.NotificationItem(
                    "Threat Detected",
                    "Blocked high risk SMS from " + sender,
                    formattedTime,
                    dateKey,
                    "threat"
            ));

            Intent intent = new Intent(this, AlertActivity.class);
            intent.putExtra("risk_score", result.riskScore);
            intent.putExtra("sms_text", messageBody);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "PHISHGUARD_ALERTS")
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setContentTitle("⚠️ PhishGuard Alert")
                    .setContentText("High Risk SMS Detected")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true);

            NotificationManagerCompat manager = NotificationManagerCompat.from(this);
            if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                manager.notify(101, builder.build());
            }
        }
    }
}