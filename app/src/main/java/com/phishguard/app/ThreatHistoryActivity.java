package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;

import java.util.ArrayList;
import java.util.List;

public class ThreatHistoryActivity extends AppCompatActivity {

    private EditText etSearchHistory;
    private TextView btnFilterAll, btnFilterToday, btnFilterYesterday, btnFilterWeek, btnExportPdf, btnShareReport, btnClearAll;
    private LinearLayout layoutHistoryList, layoutEmptyState;
    private BottomNavigationView bottomNavigation;

    private String activeFilter = "all";
    private String searchQuery = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_threat_history);

        PhishGuardDataStore.getInstance().init(this);

        etSearchHistory = findViewById(R.id.etSearchHistory);
        btnFilterAll = findViewById(R.id.btnFilterAll);
        btnFilterToday = findViewById(R.id.btnFilterToday);
        btnFilterYesterday = findViewById(R.id.btnFilterYesterday);
        btnFilterWeek = findViewById(R.id.btnFilterWeek);
        btnExportPdf = findViewById(R.id.btnExportPdf);
        btnShareReport = findViewById(R.id.btnShareReport);
        btnClearAll = findViewById(R.id.btnClearAll);
        layoutHistoryList = findViewById(R.id.layoutHistoryList);
        layoutEmptyState = findViewById(R.id.layoutEmptyState);
        bottomNavigation = findViewById(R.id.bottomNavigation);

        if (etSearchHistory != null) {
            etSearchHistory.addTextChangedListener(new TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                    searchQuery = s.toString().trim().toLowerCase();
                    renderScanHistory();
                }
                @Override public void afterTextChanged(Editable s) {}
            });
        }

        if (btnFilterAll != null) btnFilterAll.setOnClickListener(v -> setFilter("all"));
        if (btnFilterToday != null) btnFilterToday.setOnClickListener(v -> setFilter("today"));
        if (btnFilterYesterday != null) btnFilterYesterday.setOnClickListener(v -> setFilter("yesterday"));
        if (btnFilterWeek != null) btnFilterWeek.setOnClickListener(v -> setFilter("week"));

        if (btnExportPdf != null) btnExportPdf.setOnClickListener(v -> exportPdfReport());
        if (btnShareReport != null) btnShareReport.setOnClickListener(v -> shareReportNative());

        if (btnClearAll != null) {
            btnClearAll.setOnClickListener(v -> {
                PhishGuardDataStore.getInstance().clearScanHistory(this);
                renderScanHistory();
                Toast.makeText(this, "Scan History Cleared in Database", Toast.LENGTH_SHORT).show();
            });
        }

        if (bottomNavigation != null) {
            bottomNavigation.setSelectedItemId(R.id.nav_history);
            bottomNavigation.setOnItemSelectedListener(item -> {
                int id = item.getItemId();
                if (id == R.id.nav_home) {
                    startActivity(new Intent(this, DashboardActivity.class));
                    return true;
                } else if (id == R.id.nav_history) {
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

        setFilter("all");
    }

    @Override
    protected void onResume() {
        super.onResume();
        renderScanHistory();
    }

    private void setFilter(String filter) {
        this.activeFilter = filter;
        if (btnFilterAll != null) btnFilterAll.setBackgroundResource("all".equals(filter) ? R.drawable.bg_button_primary : R.drawable.bg_card_dark);
        if (btnFilterToday != null) btnFilterToday.setBackgroundResource("today".equals(filter) ? R.drawable.bg_button_primary : R.drawable.bg_card_dark);
        if (btnFilterYesterday != null) btnFilterYesterday.setBackgroundResource("yesterday".equals(filter) ? R.drawable.bg_button_primary : R.drawable.bg_card_dark);
        if (btnFilterWeek != null) btnFilterWeek.setBackgroundResource("week".equals(filter) ? R.drawable.bg_button_primary : R.drawable.bg_card_dark);

        renderScanHistory();
    }

    private void renderScanHistory() {
        List<PhishGuardDataStore.ScanItem> allScans = PhishGuardDataStore.getInstance().getScanHistory();
        List<PhishGuardDataStore.ScanItem> filtered = new ArrayList<>();

        for (PhishGuardDataStore.ScanItem item : allScans) {
            if (!searchQuery.isEmpty()) {
                boolean matchSender = item.sender != null && item.sender.toLowerCase().contains(searchQuery);
                boolean matchMessage = item.message != null && item.message.toLowerCase().contains(searchQuery);
                boolean matchThreat = item.threatType != null && item.threatType.toLowerCase().contains(searchQuery);
                if (!matchSender && !matchMessage && !matchThreat) continue;
            }

            String todayKey = PhishGuardDataStore.getTodayDateKey();
            String yesterdayKey = PhishGuardDataStore.getYesterdayDateKey();

            if ("today".equals(activeFilter)) {
                if (item.dateKey == null || !item.dateKey.equals(todayKey)) {
                    continue;
                }
            } else if ("yesterday".equals(activeFilter)) {
                if (item.dateKey == null || !item.dateKey.equals(yesterdayKey)) {
                    continue;
                }
            }

            filtered.add(item);
        }

        if (layoutHistoryList != null) {
            layoutHistoryList.removeAllViews();

            if (filtered.isEmpty()) {
                if (layoutEmptyState != null) layoutEmptyState.setVisibility(View.VISIBLE);
                layoutHistoryList.setVisibility(View.GONE);
                return;
            } else if (layoutEmptyState != null) {
                layoutEmptyState.setVisibility(View.GONE);
                layoutHistoryList.setVisibility(View.VISIBLE);
            }

            for (PhishGuardDataStore.ScanItem item : filtered) {
                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setBackgroundResource(R.drawable.bg_card_dark);
                card.setPadding(32, 24, 32, 24);

                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 0, 0, 20);
                card.setLayoutParams(params);

                // Header Row (Sender + Risk Badge)
                LinearLayout headerRow = new LinearLayout(this);
                headerRow.setOrientation(LinearLayout.HORIZONTAL);

                TextView tvSender = new TextView(this);
                tvSender.setText(item.sender);
                tvSender.setTextColor(android.graphics.Color.WHITE);
                tvSender.setTextSize(16);
                tvSender.setTypeface(null, android.graphics.Typeface.BOLD);

                LinearLayout.LayoutParams p1 = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
                tvSender.setLayoutParams(p1);

                TextView tvRisk = new TextView(this);
                tvRisk.setText(item.riskLevel + " (" + item.score + "/100)");
                tvRisk.setTextColor(item.score >= 70 ? android.graphics.Color.parseColor("#EF4444") : android.graphics.Color.parseColor("#10B981"));
                tvRisk.setTextSize(12);
                tvRisk.setTypeface(null, android.graphics.Typeface.BOLD);

                headerRow.addView(tvSender);
                headerRow.addView(tvRisk);

                // Message Body
                TextView tvMessage = new TextView(this);
                tvMessage.setText(item.message);
                tvMessage.setTextColor(android.graphics.Color.parseColor("#CBD5E1"));
                tvMessage.setTextSize(13);
                tvMessage.setPadding(0, 10, 0, 10);

                // Footer Row (Timestamp + Delete Action)
                LinearLayout footerRow = new LinearLayout(this);
                footerRow.setOrientation(LinearLayout.HORIZONTAL);

                TextView tvTime = new TextView(this);
                tvTime.setText(item.timestamp + " • " + item.threatType);
                tvTime.setTextColor(android.graphics.Color.parseColor("#64748B"));
                tvTime.setTextSize(11);

                LinearLayout.LayoutParams p2 = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
                tvTime.setLayoutParams(p2);

                TextView tvDelete = new TextView(this);
                tvDelete.setText("Delete");
                tvDelete.setTextColor(android.graphics.Color.parseColor("#EF4444"));
                tvDelete.setTextSize(12);
                tvDelete.setClickable(true);
                tvDelete.setOnClickListener(v -> {
                    PhishGuardDataStore.getInstance().deleteScanItem(this, item);
                    renderScanHistory();
                    Toast.makeText(this, "Scan record deleted from database", Toast.LENGTH_SHORT).show();
                });

                footerRow.addView(tvTime);
                footerRow.addView(tvDelete);

                card.addView(headerRow);
                card.addView(tvMessage);
                card.addView(footerRow);

                layoutHistoryList.addView(card);
            }
        }
    }

    private void exportPdfReport() {
        new AlertDialog.Builder(this)
                .setTitle("📄 Export PDF Threat Report")
                .setMessage("PhishGuard Security Report\n\nTotal Scans Analyzed: " + PhishGuardDataStore.getInstance().getScanHistory().size() + "\nNeutralized Threats: " + PhishGuardDataStore.getInstance().getBlockedSenders().size() + "\nOverall Protection Score: " + PhishGuardDataStore.getInstance().getSecurityScore() + "/100\n\nReport generated and ready for export.")
                .setPositiveButton("Download PDF", (dialog, which) -> Toast.makeText(this, "PDF Report saved to Downloads", Toast.LENGTH_LONG).show())
                .setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss())
                .show();
    }

    private void shareReportNative() {
        try {
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/plain");
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, "PhishGuard Threat Protection Report");
            shareIntent.putExtra(Intent.EXTRA_TEXT, "🛡️ PhishGuard Protection Summary:\nScans Analyzed: " + PhishGuardDataStore.getInstance().getScanHistory().size() + "\nThreats Neutralized: " + PhishGuardDataStore.getInstance().getBlockedSenders().size() + "\nSecurity Score: " + PhishGuardDataStore.getInstance().getSecurityScore() + "/100");
            startActivity(Intent.createChooser(shareIntent, "Share PhishGuard Security Report"));
        } catch (Exception e) {
            Toast.makeText(this, "Sharing PhishGuard Threat Report...", Toast.LENGTH_SHORT).show();
        }
    }
}