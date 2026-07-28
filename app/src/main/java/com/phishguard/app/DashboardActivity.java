package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;

public class DashboardActivity extends AppCompatActivity {

    private View cardSms, cardReports, cardThreatCenter, cardSecurityCenter, cardSecurityScore;
    private View cardReportScam, cardBlockedSenders, cardRewards, cardSettings, cardHelp;
    private BottomNavigationView bottomNavigation;
    private TextView tvScanned, tvBlocked, tvUserWelcome, tvUserEmail, tvScoreDisplayHeader;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        PhishGuardDataStore.getInstance().init(this);
        PhishGuardDataStore.getInstance().setDataChangeListener(this::loadDashboardStats);

        // Core Views
        cardSms = findViewById(R.id.cardSms);
        cardReports = findViewById(R.id.cardReports);
        bottomNavigation = findViewById(R.id.bottomNavigation);

        tvScanned = findViewById(R.id.tvScanned);
        tvBlocked = findViewById(R.id.tvBlocked);
        tvUserWelcome = findViewById(R.id.tvUserWelcome);
        tvUserEmail = findViewById(R.id.tvUserEmail);
        tvScoreDisplayHeader = findViewById(R.id.tvScoreDisplayHeader);

        cardThreatCenter = findViewById(R.id.cardThreatCenter);
        cardSecurityCenter = findViewById(R.id.cardSecurityCenter);
        cardSecurityScore = findViewById(R.id.cardSecurityScore);
        cardReportScam = findViewById(R.id.cardReportScam);
        cardBlockedSenders = findViewById(R.id.cardBlockedSenders);
        cardRewards = findViewById(R.id.cardRewards);
        cardSettings = findViewById(R.id.cardSettings);
        cardHelp = findViewById(R.id.cardHelp);

        updateUserHeader();
        loadDashboardStats();

        // 1. Scan SMS
        if (cardSms != null) {
            cardSms.setOnClickListener(v -> startActivity(new Intent(this, ScanSmsActivity.class)));
        }

        // 2. Reports
        if (cardReports != null) {
            cardReports.setOnClickListener(v -> startActivity(new Intent(this, ReportsActivity.class)));
        }

        // 3. Threat Center
        if (cardThreatCenter != null) {
            cardThreatCenter.setOnClickListener(v -> startActivity(new Intent(this, ThreatCenterActivity.class)));
        }

        // 4. Security Center
        if (cardSecurityCenter != null) {
            cardSecurityCenter.setOnClickListener(v -> startActivity(new Intent(this, SecurityCenterActivity.class)));
        }

        // 5. Security Score
        if (cardSecurityScore != null) {
            cardSecurityScore.setOnClickListener(v -> startActivity(new Intent(this, SecurityScoreActivity.class)));
        }

        // 6. Report Scam
        if (cardReportScam != null) {
            cardReportScam.setOnClickListener(v -> startActivity(new Intent(this, ReportActivity.class)));
        }

        // 7. Blocked Senders
        if (cardBlockedSenders != null) {
            cardBlockedSenders.setOnClickListener(v -> startActivity(new Intent(this, BlockedSendersActivity.class)));
        }

        // 8. Rewards
        if (cardRewards != null) {
            cardRewards.setOnClickListener(v -> startActivity(new Intent(this, RewardsActivity.class)));
        }

        // 9. Settings
        if (cardSettings != null) {
            cardSettings.setOnClickListener(v -> startActivity(new Intent(this, SettingsActivity.class)));
        }

        // 10. Help Center
        if (cardHelp != null) {
            cardHelp.setOnClickListener(v -> startActivity(new Intent(this, HelpCenterActivity.class)));
        }

        // Bottom Navigation Bar Listener
        if (bottomNavigation != null) {
            bottomNavigation.setSelectedItemId(R.id.nav_home);
            bottomNavigation.setOnItemSelectedListener(item -> {
                int id = item.getItemId();
                if (id == R.id.nav_home) {
                    return true;
                } else if (id == R.id.nav_history) {
                    startActivity(new Intent(this, ThreatHistoryActivity.class));
                    return true;
                } else if (id == R.id.nav_notifications) {
                    startActivity(new Intent(this, NotificationsActivity.class));
                    return true;
                } else if (id == R.id.nav_profile) {
                    startActivity(new Intent(this, ProfileActivity.class));
                    return true;
                }
                return false;
            });
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        PhishGuardDataStore.getInstance().startRealtimeFirestoreSync(this);
        updateUserHeader();
        loadDashboardStats();
    }

    private void updateUserHeader() {
        String userName = AuthManager.getUserName(this);
        String userEmail = AuthManager.getUserEmail(this);

        if (tvUserWelcome != null) {
            tvUserWelcome.setText("Welcome Back, " + userName);
        }
        if (tvUserEmail != null) {
            tvUserEmail.setText(userEmail);
        }
    }

    private void loadDashboardStats() {
        int scanned = PhishGuardDataStore.getInstance().getScanHistory().size();
        int blocked = PhishGuardDataStore.getInstance().getBlockedSenders().size();
        int score = PhishGuardDataStore.getInstance().getSecurityScore();

        if (tvScanned != null) tvScanned.setText(String.valueOf(scanned));
        if (tvBlocked != null) tvBlocked.setText(String.valueOf(blocked));
        if (tvScoreDisplayHeader != null) tvScoreDisplayHeader.setText(score + " / 100 • Protected");
    }
}
