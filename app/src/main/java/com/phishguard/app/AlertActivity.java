package com.phishguard.app;

import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class AlertActivity extends AppCompatActivity {

    private TextView tvSenderHeader, tvRiskScore, tvUserWarningText;
    private Button btnDismissAlert;
    private static Ringtone activeRingtone;
    private ToneGenerator toneGenerator;

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

        // Play Loud Security Warning Siren via Ringtone + ToneGenerator Hardware Synthesizer
        if (PhishGuardDataStore.getInstance().isAudioAlarmEnabled()) {
            // Method A: Hardware ToneGenerator emergency siren (100% Fail-Proof)
            try {
                toneGenerator = new ToneGenerator(AudioManager.STREAM_ALARM, 100);
                toneGenerator.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 1500);
                Log.e("PHISHGUARD_ALERT", "🔊 ToneGenerator Emergency Siren Started!");
            } catch (Exception e) {
                Log.e("PHISHGUARD_ALERT", "ToneGenerator error: " + e.getMessage());
            }

            // Method B: System Ringtone Alarm
            try {
                if (activeRingtone != null && activeRingtone.isPlaying()) {
                    activeRingtone.stop();
                }

                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (soundUri == null) {
                    soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }

                activeRingtone = RingtoneManager.getRingtone(getApplicationContext(), soundUri);
                if (activeRingtone != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        activeRingtone.setLooping(true);
                    }
                    activeRingtone.play();
                    Log.e("PHISHGUARD_ALERT", "🔊 Ringtone Alarm Started Playing!");
                }
            } catch (Exception e) {
                Log.e("PHISHGUARD_ALERT", "Ringtone error: " + e.getMessage());
            }
        }

        if (btnDismissAlert != null) {
            btnDismissAlert.setOnClickListener(v -> stopRingtoneAndFinish());
        }
    }

    private void stopRingtoneAndFinish() {
        if (toneGenerator != null) {
            try {
                toneGenerator.stopTone();
                toneGenerator.release();
            } catch (Exception e) {
                e.printStackTrace();
            }
            toneGenerator = null;
        }

        if (activeRingtone != null) {
            try {
                if (activeRingtone.isPlaying()) {
                    activeRingtone.stop();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            activeRingtone = null;
        }
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopRingtoneAndFinish();
    }
}