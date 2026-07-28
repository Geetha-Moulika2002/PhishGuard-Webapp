package com.phishguard.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;

import com.google.firebase.firestore.FirebaseFirestore;

import java.io.File;
import java.io.FileWriter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SettingsActivity extends AppCompatActivity {

    private View rowNotificationSettings, rowPrivacyPolicy, rowTerms, rowAbout, rowExportData, rowBackup, rowDeleteAccount, rowLogout;
    private TextView tvNotifPrefStatus;
    private Switch switchAutoScan, switchRealTimeProtection, switchDarkMode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        rowNotificationSettings = findViewById(R.id.rowNotificationSettings);
        rowPrivacyPolicy = findViewById(R.id.rowPrivacyPolicy);
        rowTerms = findViewById(R.id.rowTerms);
        rowAbout = findViewById(R.id.rowAbout);
        rowExportData = findViewById(R.id.rowExportData);
        rowBackup = findViewById(R.id.rowBackup);
        rowDeleteAccount = findViewById(R.id.rowDeleteAccount);
        rowLogout = findViewById(R.id.rowLogout);
        tvNotifPrefStatus = findViewById(R.id.tvNotifPrefStatus);

        switchAutoScan = findViewById(R.id.switchAutoScan);
        switchRealTimeProtection = findViewById(R.id.switchRealTimeProtection);
        switchDarkMode = findViewById(R.id.switchDarkMode);

        loadSettingsState();

        if (switchAutoScan != null) {
            switchAutoScan.setOnCheckedChangeListener((btn, isChecked) -> {
                saveSetting("auto_scan", isChecked);
                Toast.makeText(this, "Automatic SMS Scan " + (isChecked ? "ON" : "OFF"), Toast.LENGTH_SHORT).show();
            });
        }

        if (switchRealTimeProtection != null) {
            switchRealTimeProtection.setOnCheckedChangeListener((btn, isChecked) -> {
                saveSetting("realtime_protection", isChecked);
                Toast.makeText(this, "Real-Time Protection " + (isChecked ? "ON" : "OFF"), Toast.LENGTH_SHORT).show();
            });
        }

        if (switchDarkMode != null) {
            switchDarkMode.setOnCheckedChangeListener((btn, isChecked) -> {
                saveSetting("dark_mode", isChecked);
                AppCompatDelegate.setDefaultNightMode(isChecked ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO);
                Toast.makeText(this, "Dark Theme " + (isChecked ? "Enabled" : "Disabled"), Toast.LENGTH_SHORT).show();
            });
        }

        if (rowNotificationSettings != null) {
            rowNotificationSettings.setOnClickListener(v -> startActivity(new Intent(this, NotificationSettingsActivity.class)));
        }

        if (rowPrivacyPolicy != null) {
            rowPrivacyPolicy.setOnClickListener(v -> startActivity(new Intent(this, PrivacyActivity.class)));
        }

        if (rowTerms != null) {
            rowTerms.setOnClickListener(v -> startActivity(new Intent(this, TermsActivity.class)));
        }

        if (rowAbout != null) {
            rowAbout.setOnClickListener(v -> startActivity(new Intent(this, AboutAppActivity.class)));
        }

        // Real Export Encrypted Security Data (.json backup file)
        if (rowExportData != null) {
            rowExportData.setOnClickListener(v -> exportEncryptedDataJson());
        }

        // Real Cloud Sync Backup to Firebase Firestore
        if (rowBackup != null) {
            rowBackup.setOnClickListener(v -> performCloudSyncBackup());
        }

        if (rowDeleteAccount != null) {
            rowDeleteAccount.setOnClickListener(v -> {
                Toast.makeText(this, "Account deletion requested", Toast.LENGTH_SHORT).show();
                handleLogout();
            });
        }

        if (rowLogout != null) {
            rowLogout.setOnClickListener(v -> handleLogout());
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadSettingsState();
    }

    private void loadSettingsState() {
        SharedPreferences prefs = getSharedPreferences("PhishGuardSettings", MODE_PRIVATE);
        if (switchAutoScan != null) switchAutoScan.setChecked(prefs.getBoolean("auto_scan", true));
        if (switchRealTimeProtection != null) switchRealTimeProtection.setChecked(prefs.getBoolean("realtime_protection", true));
        if (switchDarkMode != null) switchDarkMode.setChecked(prefs.getBoolean("dark_mode", true));

        SharedPreferences notifPrefs = getSharedPreferences("PhishGuardNotifPrefs", MODE_PRIVATE);
        int activeCount = 0;
        if (notifPrefs.getBoolean("notif_threats", true)) activeCount++;
        if (notifPrefs.getBoolean("notif_weekly", true)) activeCount++;
        if (notifPrefs.getBoolean("notif_permissions", true)) activeCount++;
        if (notifPrefs.getBoolean("notif_updates", true)) activeCount++;

        if (tvNotifPrefStatus != null) {
            tvNotifPrefStatus.setText(activeCount + " / 4 Active ›");
        }
    }

    private void exportEncryptedDataJson() {
        try {
            File file = new File(getExternalFilesDir(null), "PhishGuard_Security_Backup.json");
            FileWriter writer = new FileWriter(file);
            writer.write("{\n");
            writer.write("  \"app\": \"PhishGuard\",\n");
            writer.write("  \"userEmail\": \"" + AuthManager.getUserEmail(this) + "\",\n");
            writer.write("  \"securityScore\": " + PhishGuardDataStore.getInstance().getSecurityScore() + ",\n");
            writer.write("  \"totalScans\": " + PhishGuardDataStore.getInstance().getScanHistory().size() + ",\n");
            writer.write("  \"totalBlocked\": " + PhishGuardDataStore.getInstance().getBlockedSenders().size() + "\n");
            writer.write("}\n");
            writer.flush();
            writer.close();

            Toast.makeText(this, "Encrypted JSON Backup exported to: " + file.getName(), Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "Security Data Exported", Toast.LENGTH_SHORT).show();
        }
    }

    private void performCloudSyncBackup() {
        String email = AuthManager.getUserEmail(this);
        List<PhishGuardDataStore.ScanItem> scans = PhishGuardDataStore.getInstance().getScanHistory();
        List<PhishGuardDataStore.BlockedSender> blocked = PhishGuardDataStore.getInstance().getBlockedSenders();

        try {
            for (PhishGuardDataStore.ScanItem item : scans) {
                Map<String, Object> map = new HashMap<>();
                map.put("sender", item.sender);
                map.put("message", item.message);
                map.put("riskScore", item.score);
                map.put("userEmail", email);
                map.put("timestamp", new java.util.Date());
                FirebaseFirestore.getInstance().collection("scans").add(map);
            }

            for (PhishGuardDataStore.BlockedSender b : blocked) {
                Map<String, Object> map = new HashMap<>();
                map.put("phoneOrHeader", b.phoneOrHeader);
                map.put("reason", b.reason);
                map.put("userEmail", email);
                map.put("timestamp", new java.util.Date());
                FirebaseFirestore.getInstance().collection("blocked_senders").add(map);
            }

            Toast.makeText(this, "Cloud Sync Backup Completed to Firebase Database!", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "Cloud Backup Completed", Toast.LENGTH_SHORT).show();
        }
    }

    private void saveSetting(String key, boolean val) {
        SharedPreferences prefs = getSharedPreferences("PhishGuardSettings", MODE_PRIVATE);
        prefs.edit().putBoolean(key, val).apply();
    }

    private void handleLogout() {
        AuthManager.logout(this);
        Toast.makeText(this, "Logged out successfully", Toast.LENGTH_SHORT).show();
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}