package com.phishguard.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;

public class ProfileActivity extends AppCompatActivity {

    private TextView tvProfileName, tvProfileEmail, tvProfilePhone;
    private Button btnEditProfile;
    private BottomNavigationView bottomNavigation;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);

        tvProfileName = findViewById(R.id.tvProfileName);
        tvProfileEmail = findViewById(R.id.tvProfileEmail);
        tvProfilePhone = findViewById(R.id.tvProfilePhone);
        btnEditProfile = findViewById(R.id.btnEditProfile);
        bottomNavigation = findViewById(R.id.bottomNavigation);

        loadProfileData();

        if (btnEditProfile != null) {
            btnEditProfile.setOnClickListener(v -> startActivity(new Intent(this, EditProfileActivity.class)));
        }

        if (bottomNavigation != null) {
            bottomNavigation.setSelectedItemId(R.id.nav_profile);
            bottomNavigation.setOnItemSelectedListener(item -> {
                int id = item.getItemId();
                if (id == R.id.nav_home) {
                    startActivity(new Intent(this, DashboardActivity.class));
                    return true;
                } else if (id == R.id.nav_history) {
                    startActivity(new Intent(this, ThreatHistoryActivity.class));
                    return true;
                } else if (id == R.id.nav_notifications) {
                    startActivity(new Intent(this, NotificationsActivity.class));
                    return true;
                } else if (id == R.id.nav_profile) {
                    return true;
                }
                return false;
            });
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadProfileData();
    }

    private void loadProfileData() {
        String name = AuthManager.getUserName(this);
        String email = AuthManager.getUserEmail(this);

        SharedPreferences prefs = getSharedPreferences("PhishGuardUserPrefs", MODE_PRIVATE);
        String phone = prefs.getString("user_phone", "+1 (555) 019-2831");

        if (tvProfileName != null) tvProfileName.setText(name);
        if (tvProfileEmail != null) tvProfileEmail.setText(email);
        if (tvProfilePhone != null) tvProfilePhone.setText(phone);
    }
}
