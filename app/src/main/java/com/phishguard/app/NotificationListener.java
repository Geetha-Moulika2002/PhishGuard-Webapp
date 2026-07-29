package com.phishguard.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class NotificationListener extends NotificationListenerService {

    private static final String CHANNEL_ID = "PHISHGUARD_ALERTS";
    private static final int MAX_PREVIEW_LENGTH = 160;

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

        // Check if sender is blocked in PhishGuard Blocked List
        if (PhishGuardDataStore.getInstance().isSenderBlocked(rawSender) || 
            PhishGuardDataStore.getInstance().isSenderBlocked(maskedSender) ||
            PhishGuardDataStore.getInstance().isSenderBlocked(titleSeq != null ? titleSeq.toString() : "")) {
            
            Log.e("PHISHGUARD_NOTIF", ">>> CANCELLING & ERASING NOTIFICATION FOR BLOCKED SENDER: " + rawSender + " <<<");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    cancelNotification(sbn.getKey());
                } catch (Exception e) {
                    e.printStackTrace();
                }
                try {
                    cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
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
    }
}