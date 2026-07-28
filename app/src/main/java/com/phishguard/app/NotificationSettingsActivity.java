package com.phishguard.app;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Switch;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class NotificationSettingsActivity extends AppCompatActivity {

    private Switch switchThreatAlerts, switchWeeklyReports, switchPermissionReminders, switchUpdateAlerts;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notification_settings);

        switchThreatAlerts = findViewById(R.id.switchThreatAlerts);
        switchWeeklyReports = findViewById(R.id.switchWeeklyReports);
        switchPermissionReminders = findViewById(R.id.switchPermissionReminders);
        switchUpdateAlerts = findViewById(R.id.switchUpdateAlerts);

        loadNotifPrefs();

        if (switchThreatAlerts != null) {
            switchThreatAlerts.setOnCheckedChangeListener((btn, isChecked) -> {
                saveNotifPref("notif_threats", isChecked);
                Toast.makeText(this, "High Risk Threat Alerts " + (isChecked ? "ON" : "OFF"), Toast.LENGTH_SHORT).show();
            });
        }

        if (switchWeeklyReports != null) {
            switchWeeklyReports.setOnCheckedChangeListener((btn, isChecked) -> {
                saveNotifPref("notif_weekly", isChecked);
                Toast.makeText(this, "Weekly Summary Reports " + (isChecked ? "ON" : "OFF"), Toast.LENGTH_SHORT).show();
            });
        }

        if (switchPermissionReminders != null) {
            switchPermissionReminders.setOnCheckedChangeListener((btn, isChecked) -> {
                saveNotifPref("notif_permissions", isChecked);
                Toast.makeText(this, "Permission Health Reminders " + (isChecked ? "ON" : "OFF"), Toast.LENGTH_SHORT).show();
            });
        }

        if (switchUpdateAlerts != null) {
            switchUpdateAlerts.setOnCheckedChangeListener((btn, isChecked) -> {
                saveNotifPref("notif_updates", isChecked);
                Toast.makeText(this, "Threat Intelligence Updates " + (isChecked ? "ON" : "OFF"), Toast.LENGTH_SHORT).show();
            });
        }
    }

    private void loadNotifPrefs() {
        SharedPreferences prefs = getSharedPreferences("PhishGuardNotifPrefs", MODE_PRIVATE);
        if (switchThreatAlerts != null) switchThreatAlerts.setChecked(prefs.getBoolean("notif_threats", true));
        if (switchWeeklyReports != null) switchWeeklyReports.setChecked(prefs.getBoolean("notif_weekly", true));
        if (switchPermissionReminders != null) switchPermissionReminders.setChecked(prefs.getBoolean("notif_permissions", true));
        if (switchUpdateAlerts != null) switchUpdateAlerts.setChecked(prefs.getBoolean("notif_updates", true));
    }

    private void saveNotifPref(String key, boolean val) {
        SharedPreferences prefs = getSharedPreferences("PhishGuardNotifPrefs", MODE_PRIVATE);
        prefs.edit().putBoolean(key, val).apply();
    }
}
