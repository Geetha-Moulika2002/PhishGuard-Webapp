package com.phishguard.app;

import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;

import androidx.appcompat.app.AppCompatActivity;

public class PermissionActivity extends AppCompatActivity {

    Button btnPermission;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_permission);

        btnPermission = findViewById(R.id.btnPermission);

        btnPermission.setOnClickListener(v -> {

            Intent intent = new Intent(
                    Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
            );

            startActivity(intent);

        });

    }

    @Override
    protected void onResume() {
        super.onResume();

        // Check if permission granted

        if (isNotificationServiceEnabled()) {

            Intent intent = new Intent(
                    PermissionActivity.this,
                    DashboardActivity.class
            );

            startActivity(intent);

            finish();
        }
    }

    // Permission checker

    private boolean isNotificationServiceEnabled() {

        String packageName = getPackageName();

        String flat = Settings.Secure.getString(
                getContentResolver(),
                "enabled_notification_listeners"
        );

        if (flat != null) {

            return flat.contains(packageName);
        }

        return false;
    }
}