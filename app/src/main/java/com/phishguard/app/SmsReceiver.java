package com.phishguard.app;

import android.app.Notification;
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

        if (context == null || intent == null || intent.getAction() == null) return;

        // Ensure PhishGuardDataStore is initialized
        PhishGuardDataStore.getInstance().init(context);

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
            Log.e("PHISHGUARD_SMS", "Raw Sender: " + rawSender + " | Masked Sender: " + maskedSender);
            Log.e("PHISHGUARD_SMS", "Content Snippet: " + PhishGuardDataStore.getSafeCloudPreview(messageBody));

            // 1. Check if Sender is Blocked in DataStore
            if (PhishGuardDataStore.getInstance().isSenderBlocked(rawSender) || PhishGuardDataStore.getInstance().isSenderBlocked(maskedSender)) {
                Log.e("PHISHGUARD_SMS", "🚨 BLOCKED SENDER MATCHED: " + rawSender + " -> LAUNCHING FULLSCREEN RED OVERLAY VIA PENDING INTENT!");
                
                // Android 10+ FullScreenIntent to bypass ActivityTaskManager background restriction
                launchRedAlertOverlay(context, rawSender, messageBody, true, 98);

                abortBroadcast();
                return;
            }

            // 2. On-Device Explainable AI Intent Analysis
            PhishingAnalyzer.AnalysisResult result = PhishingAnalyzer.analyzeMessage(messageBody);
            Log.e("PHISHGUARD_SMS", "AI Score: " + result.riskScore + " | Level: " + result.riskLevel);

            String scanId = String.valueOf(System.currentTimeMillis());
            String formattedTime = PhishGuardDataStore.getFormattedCurrentTime();
            String dateKey = PhishGuardDataStore.getTodayDateKey();

            // 3. Save locally in DataStore for Mobile App UI
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

            // 4. If High Risk Phishing, pop up Red Alert Overlay Screen via FullScreenIntent
            if (result.riskScore >= 70) {
                launchRedAlertOverlay(context, rawSender, messageBody, false, result.riskScore);
            }

            // 5. Cloud Database Privacy Hardening (Firebase Firestore)
            String userEmail = AuthManager.getUserEmail(context);
            if (userEmail != null && !userEmail.isEmpty()) {
                try {
                    Map<String, Object> scanDoc = new HashMap<>();
                    scanDoc.put("userEmail", userEmail);
                    scanDoc.put("sender", maskedSender);
                    scanDoc.put("message", PhishGuardDataStore.getSafeCloudPreview(messageBody));
                    scanDoc.put("riskScore", result.riskScore);
                    scanDoc.put("riskLevel", result.riskLevel);
                    scanDoc.put("threatType", result.threatType);
                    scanDoc.put("timestamp", formattedTime);
                    scanDoc.put("dateKey", dateKey);

                    FirebaseFirestore.getInstance().collection("scans").add(scanDoc);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

        } catch (Exception e) {
            Log.e("PHISHGUARD_SMS", "Error processing SMS: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void launchRedAlertOverlay(Context context, String sender, String message, boolean isBlocked, int score) {
        try {
            Intent fullScreenIntent = new Intent(context, AlertActivity.class);
            fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            fullScreenIntent.putExtra("is_blocked_alert", isBlocked);
            fullScreenIntent.putExtra("risk_score", score);
            fullScreenIntent.putExtra("sender", sender);
            fullScreenIntent.putExtra("message", message);

            int flag = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flag |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                    context,
                    (int) System.currentTimeMillis(),
                    fullScreenIntent,
                    flag
            );

            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationChannel channel = new NotificationChannel(
                            CHANNEL_ID,
                            "PhishGuard Phishing Alerts",
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                    notificationManager.createNotificationChannel(channel);
                }

                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle("🚨 PHISHGUARD SECURITY ALERT")
                        .setContentText("Blocked Sender Intercepted: " + sender)
                        .setPriority(NotificationCompat.PRIORITY_MAX)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setFullScreenIntent(fullScreenPendingIntent, true)
                        .setAutoCancel(true);

                notificationManager.notify((int) System.currentTimeMillis(), builder.build());
            }

            // Direct fallback launch
            context.startActivity(fullScreenIntent);

        } catch (Exception e) {
            Log.e("PHISHGUARD_SMS", "FullScreenIntent error: " + e.getMessage());
        }
    }
}
