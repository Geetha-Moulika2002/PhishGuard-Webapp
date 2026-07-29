package com.phishguard.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;

public class NotificationListener extends NotificationListenerService {

    private static final int MAX_PREVIEW_LENGTH = 300;
    private static final String CHANNEL_ID = "PHISHGUARD_ALERTS";

    @Override
    public void onCreate() {
        super.onCreate();
        createAlertChannel();
        Log.d("PHISHGUARD", "Notification Listener Service Created");
    }

    private void createAlertChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "PhishGuard Phishing Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts for intercepted phishing SMS messages");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getPackageName() == null) return;

        String packageName = sbn.getPackageName();
        if (getPackageName().equals(packageName)) return;

        // Filter out system UI, charging, battery, WhatsApp, Instagram, Telegram, and OS settings notifications
        if (packageName.equals("android") || 
            packageName.equals("com.android.systemui") || 
            packageName.equals("com.android.providers.downloads") || 
            packageName.equals("com.android.settings") ||
            packageName.contains("whatsapp") ||
            packageName.contains("instagram") ||
            packageName.contains("facebook.orca") ||
            packageName.contains("telegram") ||
            packageName.contains("battery") ||
            packageName.contains("power")) {
            return;
        }

        Notification notif = sbn.getNotification();
        if (notif == null) return;

        // Must be an SMS / Telephony messaging application or SMS category 'msg'
        String category = notif.category;
        boolean isSmsApp = packageName.contains("messaging") || 
                           packageName.contains("mms") || 
                           packageName.contains("sms") || 
                           packageName.contains("telephony") || 
                           packageName.contains("truecaller") || 
                           packageName.contains("rcs") ||
                           "msg".equalsIgnoreCase(category) ||
                           Notification.CATEGORY_MESSAGE.equals(category);

        if (!isSmsApp) return;

        Bundle extras = notif.extras;
        if (extras == null) return;

        CharSequence titleSeq = extras.getCharSequence("android.title");
        CharSequence textSeq = extras.getCharSequence("android.text");
        CharSequence bigTextSeq = extras.getCharSequence("android.bigText");

        String rawSender = titleSeq != null ? titleSeq.toString() : "SMS Sender";
        String messageBody = "";

        if (bigTextSeq != null && !bigTextSeq.toString().trim().isEmpty()) {
            messageBody = bigTextSeq.toString();
        } else if (textSeq != null && !textSeq.toString().trim().isEmpty()) {
            messageBody = textSeq.toString();
        } else {
            Parcelable[] messages = (Parcelable[]) extras.get("android.messages");
            if (messages != null && messages.length > 0) {
                for (Parcelable p : messages) {
                    if (p instanceof Bundle) {
                        Bundle b = (Bundle) p;
                        CharSequence msgText = b.getCharSequence("text");
                        if (msgText != null && !msgText.toString().trim().isEmpty()) {
                            messageBody = msgText.toString();
                        }
                    }
                }
            }
        }

        if (messageBody == null || messageBody.trim().isEmpty()) return;

        // Filter out system privacy placeholder notifications
        String lowerBody = messageBody.toLowerCase().trim();
        if (lowerBody.contains("sensitive notification") || 
            lowerBody.equals("content hidden") ||
            (lowerBody.equals("view messages") && rawSender.equalsIgnoreCase("Messages"))) {
            return;
        }

        String maskedSender = PhishGuardDataStore.maskPhoneNumber(rawSender);

        // Check if sender is blocked
        if (PhishGuardDataStore.getInstance().isSenderBlocked(rawSender) || PhishGuardDataStore.getInstance().isSenderBlocked(maskedSender)) {
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

        Log.d("PHISHGUARD", "Notification Intercepted SMS: [" + maskedSender + "] " + messageBody);

        // On-Device Explainable AI Risk Analysis
        PhishingAnalyzer.AnalysisResult result = PhishingAnalyzer.analyzeMessage(messageBody);

        String scanId = String.valueOf(System.currentTimeMillis());
        String formattedTime = PhishGuardDataStore.getFormattedCurrentTime();
        String dateKey = PhishGuardDataStore.getTodayDateKey();

        // 1. Save locally in DataStore for Mobile App UI
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

        // 2. Cloud Database Safe Snippet Sync
        String userEmail = AuthManager.getUserEmail(this);
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
                scanDoc.put("createdAt", System.currentTimeMillis());

                FirebaseFirestore.getInstance().collection("scans").document(scanId).set(scanDoc);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // 3. High Risk Alert Trigger
        if (result.riskScore >= 60 || "HIGH RISK".equalsIgnoreCase(result.riskLevel)) {
            PhishGuardDataStore.getInstance().addNotification(new PhishGuardDataStore.NotificationItem(
                    "⚠️ High Risk Phishing Alert",
                    "Intercepted Phishing SMS from " + maskedSender + " (" + result.threatType + " - Risk: " + result.riskScore + "/100)",
                    formattedTime,
                    dateKey,
                    "threat"
            ));

            Intent intent = new Intent(this, AlertActivity.class);
            intent.putExtra("risk_score", result.riskScore);
            intent.putExtra("sms_text", messageBody);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, (int) System.currentTimeMillis(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setContentTitle("🚨 PhishGuard Phishing Alert!")
                    .setContentText("High Risk SMS Detected from " + maskedSender + " (" + result.riskScore + "/100)")
                    .setSubText(result.threatType)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(messageBody))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify((int) (System.currentTimeMillis() % 100000), builder.build());
            }
        }
    }
}