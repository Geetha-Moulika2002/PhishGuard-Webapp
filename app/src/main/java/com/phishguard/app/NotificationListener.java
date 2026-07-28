package com.phishguard.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class NotificationListener extends NotificationListenerService {

    private static final int MAX_PREVIEW_LENGTH = 120;

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

        PhishGuardDataStore.getInstance().addScan(new PhishGuardDataStore.ScanItem(
                String.valueOf(System.currentTimeMillis()),
                sender,
                messageBody,
                result.riskScore,
                result.riskLevel,
                PhishGuardDataStore.getFormattedCurrentTime(),
                PhishGuardDataStore.getTodayDateKey(),
                result.threatType
        ));

        if (result.riskScore >= 70) {
            PhishGuardDataStore.getInstance().addNotification(new PhishGuardDataStore.NotificationItem(
                    "Threat Detected",
                    "Blocked high risk SMS from " + sender,
                    PhishGuardDataStore.getFormattedCurrentTime(),
                    PhishGuardDataStore.getTodayDateKey(),
                    "threat"
            ));

            Intent intent = new Intent(this, AlertActivity.class);
            intent.putExtra("risk_score", result.riskScore);
            intent.putExtra("sms_text", messageBody);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "PHISHGUARD_ALERTS")
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setContentTitle("⚠️ PhishGuard Threat Alert")
                    .setContentText("High Risk SMS Intercepted: " + result.threatType)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true);

            NotificationManagerCompat manager = NotificationManagerCompat.from(this);
            if (androidx.core.app.ActivityCompat.checkSelfPermission(
                    this, android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                manager.notify((int) System.currentTimeMillis(), builder.build());
            }
        }
    }
}