package com.phishguard.app;

import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class AlertActivity extends AppCompatActivity {

    private TextView tvSenderHeader, tvRiskScore, tvUserWarningText;
    private Button btnDismissAlert;
    private Ringtone ringtone;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Force dramatic full-screen window takeover on screen locked or active
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        setContentView(R.layout.activity_alert);

        tvSenderHeader = findViewById(R.id.tvSenderHeader);
        tvRiskScore = findViewById(R.id.tvRiskScore);
        tvUserWarningText = findViewById(R.id.tvUserWarningText);
        btnDismissAlert = findViewById(R.id.btnDismissAlert);

        String sender = getIntent().getStringExtra("sender");
        if (sender == null || sender.trim().isEmpty()) sender = "Blocked Sender";

        boolean isBlocked = getIntent().getBooleanExtra("is_blocked_alert", true);

        if (tvSenderHeader != null) {
            tvSenderHeader.setText("Sender: " + sender);
        }
        if (tvRiskScore != null) {
            if (isBlocked) {
                tvRiskScore.setText("Status: 🛡️ Blocked Sender (Quarantined)");
            } else {
                tvRiskScore.setText("Status: 🚨 Phishing Threat Detected");
            }
        }
        if (tvUserWarningText != null) {
            tvUserWarningText.setText("🚫 DO NOT CLICK ON MESSAGES FROM " + sender.toUpperCase() + "!\n\n⚠️ THIS SENDER IS HARMFUL.");
        }

        // Play PhishGuard Custom Audio Siren Alert on Interception
        if (PhishGuardDataStore.getInstance().isAudioAlarmEnabled()) {
            try {
                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                if (alarmUri == null) {
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                }
                ringtone = RingtoneManager.getRingtone(getApplicationContext(), alarmUri);
                if (ringtone != null) {
                    ringtone.play();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        if (btnDismissAlert != null) {
            btnDismissAlert.setOnClickListener(v -> {
                if (ringtone != null && ringtone.isPlaying()) {
                    ringtone.stop();
                }
                finish();
            });
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }
    }
}