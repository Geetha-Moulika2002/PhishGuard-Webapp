package com.phishguard.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.Set;

public class SecurityCenterActivity extends AppCompatActivity {

    private Switch switchNotificationAccess, switchSmsPermission, switchBatteryOptimization;
    private TextView tvShieldStatusHeader, btnBack;
    private View rowNotificationAccess, rowSmsPermission, rowBatteryOptimization;
    private Button btnContinueDashboard;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_security_center);

        switchNotificationAccess = findViewById(R.id.switchNotificationAccess);
        switchSmsPermission = findViewById(R.id.switchSmsPermission);
        switchBatteryOptimization = findViewById(R.id.switchBatteryOptimization);
        tvShieldStatusHeader = findViewById(R.id.tvShieldStatusHeader);
        btnBack = findViewById(R.id.btnBack);

        rowNotificationAccess = findViewById(R.id.rowNotificationAccess);
        rowSmsPermission = findViewById(R.id.rowSmsPermission);
        rowBatteryOptimization = findViewById(R.id.rowBatteryOptimization);
        btnContinueDashboard = findViewById(R.id.btnContinueDashboard);

        if (btnBack != null) {
            btnBack.setOnClickListener(v -> navigateToDashboard());
        }

        if (btnContinueDashboard != null) {
            btnContinueDashboard.setOnClickListener(v -> navigateToDashboard());
        }

        // Click row opens REAL phone settings intent!
        if (rowNotificationAccess != null) {
            rowNotificationAccess.setOnClickListener(v -> {
                try {
                    startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));
                } catch (Exception e) {
                    Toast.makeText(this, "Opening Notification Settings", Toast.LENGTH_SHORT).show();
                }
            });
        }

        if (rowSmsPermission != null) {
            rowSmsPermission.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(this, "Opening App Permission Settings", Toast.LENGTH_SHORT).show();
                }
            });
        }

        if (rowBatteryOptimization != null) {
            rowBatteryOptimization.setOnClickListener(v -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(this, "Opening Battery Settings", Toast.LENGTH_SHORT).show();
                }
            });
        }

        checkRealPermissions();
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkRealPermissions();
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
        navigateToDashboard();
    }

    private void navigateToDashboard() {
        Intent intent = new Intent(SecurityCenterActivity.this, DashboardActivity.class);
        startActivity(intent);
        finish();
    }

    private void checkRealPermissions() {
        // 1. Real Notification Listener Check
        boolean notifGranted = false;
        try {
            Set<String> packages = NotificationManagerCompat.getEnabledListenerPackages(this);
            notifGranted = packages.contains(getPackageName());
        } catch (Exception e) {
            notifGranted = true;
        }

        // 2. Real SMS Permission Check
        boolean smsGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;

        // 3. Real Battery Optimization Check
        boolean batteryGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    batteryGranted = pm.isIgnoringBatteryOptimizations(getPackageName());
                }
            } catch (Exception e) {
                batteryGranted = true;
            }
        }

        if (switchNotificationAccess != null) switchNotificationAccess.setChecked(notifGranted);
        if (switchSmsPermission != null) switchSmsPermission.setChecked(smsGranted);
        if (switchBatteryOptimization != null) switchBatteryOptimization.setChecked(batteryGranted);

        boolean allGreen = notifGranted && smsGranted && batteryGranted;

        if (tvShieldStatusHeader != null) {
            if (allGreen) {
                tvShieldStatusHeader.setText("● ALL GREEN");
                tvShieldStatusHeader.setTextColor(Color.parseColor("#10B981"));
            } else {
                tvShieldStatusHeader.setText("⚠️ ACTION REQUIRED");
                tvShieldStatusHeader.setTextColor(Color.parseColor("#F59E0B"));
            }
        }
    }
}
