package com.phishguard.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class NotificationListener extends NotificationListenerService {

    private static final String CHANNEL_ID = "PHISHGUARD_ALERTS";
    private static final int MAX_PREVIEW_LENGTH = 160;

    @Override
    public void onCreate() {
        super.onCreate();
        createAlertChannel();
        Log.e("PHISHGUARD_NOTIF", "=================================================");
        Log.e("PHISHGUARD_NOTIF", ">>> PHISHGUARD NOTIFICATION LISTENER SERVICE STARTED <<<");
        Log.e("PHISHGUARD_NOTIF", "=================================================");
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

        // Ensure PhishGuardDataStore is initialized
        PhishGuardDataStore.getInstance().init(this);

        String packageName = sbn.getPackageName();
        if (getPackageName().equals(packageName)) return;

        // Log every incoming notification for Logcat inspection
        Log.e("PHISHGUARD_NOTIF", "--> Notification Received from Package: " + packageName);

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

        Log.e("PHISHGUARD_NOTIF", "Evaluating SMS Notification: Sender=[" + rawSender + "] | Body=[" + messageBody + "]");

        // Filter out system privacy placeholder notifications
        String lowerBody = messageBody.toLowerCase().trim();
        if (lowerBody.contains("sensitive notification") || 
            lowerBody.equals("content hidden") ||
            (lowerBody.equals("view messages") && rawSender.equalsIgnoreCase("Messages"))) {
            return;
        }

        String maskedSender = PhishGuardDataStore.maskPhoneNumber(rawSender);

        // Check if sender is blocked in initialized DataStore
        boolean isBlocked = PhishGuardDataStore.getInstance().isSenderBlocked(rawSender) || 
                            PhishGuardDataStore.getInstance().isSenderBlocked(maskedSender) ||
                            PhishGuardDataStore.getInstance().isSenderBlocked(titleSeq != null ? titleSeq.toString() : "");

        if (isBlocked) {
            Log.e("PHISHGUARD_NOTIF", "🚨 MATCH FOUND! SENDER [" + rawSender + "] IS BLOCKED! LAUNCHING RED FULLSCREEN OVERLAY & ERASING NOTIFICATION!");

            // 1. Launch Truecaller-style Red Security Alert Screen via FullScreenIntent
            launchRedAlertOverlay(this, rawSender, messageBody, true, 98);

            // 2. Temporarily suppress notification sound & banner for blocked sender
            try {
                requestInterruptionFilter(INTERRUPTION_FILTER_NONE);
            } catch (Exception e) {
                e.printStackTrace();
            }

            // 3. Multi-pass delayed cancellation to ensure complete erasure from drawer
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    cancelNotification(sbn.getKey());
                    cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                } catch (Exception e) {
                    e.printStackTrace();
                }

                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        cancelNotification(sbn.getKey());
                        cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                    } catch (Exception e) {}
                }, 150);

                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        cancelNotification(sbn.getKey());
                        cancelNotification(sbn.getPackageName(), sbn.getTag(), sbn.getId());
                    } catch (Exception e) {}
                }, 450);
            }

            // Restore normal notification filter after 1.5 seconds
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    requestInterruptionFilter(INTERRUPTION_FILTER_ALL);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }, 1500);

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

        // Save locally in DataStore for Mobile App UI
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

                notificationManager.notify((int) System.currentTimeMillis() + 1, builder.build());
            }

            // Direct fallback launch
            context.startActivity(fullScreenIntent);

        } catch (Exception e) {
            Log.e("PHISHGUARD_NOTIF", "FullScreenIntent error: " + e.getMessage());
        }
    }
}