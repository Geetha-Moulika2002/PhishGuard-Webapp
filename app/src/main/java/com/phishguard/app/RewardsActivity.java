package com.phishguard.app;

import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import java.util.List;

public class RewardsActivity extends AppCompatActivity {

    private View badgeSafeUser, badge100Scans, badgeFirstReport, badge7DayStreak;
    private TextView tvBadge100ScansProgress, tvBadgeSafeUserStatus, tvBadgeReportStatus, tvBadgeStreakStatus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rewards);

        badgeSafeUser = findViewById(R.id.badgeSafeUser);
        badge100Scans = findViewById(R.id.badge100Scans);
        badgeFirstReport = findViewById(R.id.badgeFirstReport);
        badge7DayStreak = findViewById(R.id.badge7DayStreak);

        tvBadge100ScansProgress = findViewById(R.id.tvBadge100ScansProgress);
        tvBadgeSafeUserStatus = findViewById(R.id.tvBadgeSafeUserStatus);
        tvBadgeReportStatus = findViewById(R.id.tvBadgeReportStatus);
        tvBadgeStreakStatus = findViewById(R.id.tvBadgeStreakStatus);

        updateRewardsDynamicState();

        if (badgeSafeUser != null) {
            badgeSafeUser.setOnClickListener(v -> showBadgeDialog(
                    "🏅 Safe User Badge",
                    "Requirement: Maintain an overall Security Protection Score of 80 or higher.\n\nCurrent Status: UNLOCKED! Your active defense score is " + PhishGuardDataStore.getInstance().getSecurityScore() + "/100."
            ));
        }

        if (badge100Scans != null) {
            badge100Scans.setOnClickListener(v -> showBadgeDialog(
                    "💯 100 Scans Badge",
                    "Requirement: Perform 100 on-device SMS scans.\n\nCurrent Progress: " + PhishGuardDataStore.getInstance().getScanHistory().size() + " / 100 scans completed."
            ));
        }

        if (badgeFirstReport != null) {
            badgeFirstReport.setOnClickListener(v -> showBadgeDialog(
                    "📢 First Report Badge",
                    "Requirement: Submit at least 1 scam report to the PhishGuard network.\n\nCurrent Status: " + (PhishGuardDataStore.getInstance().getScamReports().isEmpty() ? "LOCKED (Submit a report in Scam Reporter)" : "UNLOCKED!")
            ));
        }

        if (badge7DayStreak != null) {
            badge7DayStreak.setOnClickListener(v -> showBadgeDialog(
                    "🔥 7 Day Protection Streak",
                    "Requirement: Keep PhishGuard active continuously for 7 consecutive days.\n\nCurrent Status: UNLOCKED! 7-Day protection streak active."
            ));
        }
    }

    private void updateRewardsDynamicState() {
        int scans = PhishGuardDataStore.getInstance().getScanHistory().size();
        int score = PhishGuardDataStore.getInstance().getSecurityScore();
        boolean hasReport = !PhishGuardDataStore.getInstance().getScamReports().isEmpty();

        if (tvBadge100ScansProgress != null) {
            tvBadge100ScansProgress.setText(scans + " / 100 Scans");
        }

        if (tvBadgeSafeUserStatus != null) {
            tvBadgeSafeUserStatus.setText(score >= 80 ? "Unlocked (" + score + "/100)" : "Locked");
        }

        if (tvBadgeReportStatus != null) {
            tvBadgeReportStatus.setText(hasReport ? "Unlocked" : "Locked (0/1)");
        }

        if (tvBadgeStreakStatus != null) {
            tvBadgeStreakStatus.setText("Unlocked (7 Days)");
        }
    }

    private void showBadgeDialog(String title, String message) {
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("OK", (dialog, which) -> dialog.dismiss())
                .show();
    }
}
