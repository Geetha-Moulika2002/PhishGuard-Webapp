package com.phishguard.app;

import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class AlertActivity extends AppCompatActivity {

    private TextView tvSenderHeader, tvRiskScore, tvAlertMessageBody;
    private Button btnDismissAlert;
    private Ringtone ringtone;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_alert);

        tvSenderHeader = findViewById(R.id.tvSenderHeader);
        tvRiskScore = findViewById(R.id.tvRiskScore);
        tvAlertMessageBody = findViewById(R.id.tvAlertMessageBody);
        btnDismissAlert = findViewById(R.id.btnDismissAlert);

        String sender = getIntent().getStringExtra("sender");
        String message = getIntent().getStringExtra("message");
        int score = getIntent().getIntExtra("risk_score", 98);
        boolean isBlocked = getIntent().getBooleanExtra("is_blocked_alert", true);

        if (tvSenderHeader != null && sender != null) {
            tvSenderHeader.setText("Sender: " + sender);
        }
        if (tvAlertMessageBody != null && message != null) {
            tvAlertMessageBody.setText(message);
        }
        if (tvRiskScore != null) {
            if (isBlocked) {
                tvRiskScore.setText("Status: 🛡️ Notification Silenced & Message Quarantined");
            } else {
                tvRiskScore.setText("Status: 🚨 Phishing Threat Detected (Risk: " + score + "%)");
            }
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