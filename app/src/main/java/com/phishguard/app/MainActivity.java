package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Splash screen navigation logic
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Intent intent;
            if (AuthManager.isLoggedIn(MainActivity.this)) {
                // User is already logged in -> Go directly to Dashboard
                intent = new Intent(MainActivity.this, DashboardActivity.class);
            } else if (AuthManager.isFirstLaunch(MainActivity.this)) {
                // First time opening app -> Show Onboarding
                intent = new Intent(MainActivity.this, OnboardingActivity.class);
            } else {
                // Next time (not logged in) -> Go directly to Login/Register
                intent = new Intent(MainActivity.this, LoginActivity.class);
            }

            startActivity(intent);
            finish();
        }, 1500);
    }
}