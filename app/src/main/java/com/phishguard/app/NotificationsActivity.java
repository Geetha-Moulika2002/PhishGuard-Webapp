package com.phishguard.app;

import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.util.List;

public class NotificationsActivity extends AppCompatActivity {

    private LinearLayout layoutNotifList, layoutEmptyState;
    private TextView btnClearNotifs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notifications);

        layoutNotifList = findViewById(R.id.layoutNotifList);
        layoutEmptyState = findViewById(R.id.layoutEmptyState);
        btnClearNotifs = findViewById(R.id.btnClearNotifs);

        renderNotifications();

        if (btnClearNotifs != null) {
            btnClearNotifs.setOnClickListener(v -> {
                PhishGuardDataStore.getInstance().getNotifications().clear();
                renderNotifications();
                Toast.makeText(this, "Notifications Cleared", Toast.LENGTH_SHORT).show();
            });
        }
    }

    private void renderNotifications() {
        List<PhishGuardDataStore.NotificationItem> items = PhishGuardDataStore.getInstance().getNotifications();

        if (layoutNotifList != null) {
            layoutNotifList.removeAllViews();

            if (items.isEmpty() && layoutEmptyState != null) {
                layoutEmptyState.setVisibility(View.VISIBLE);
                layoutNotifList.setVisibility(View.GONE);
                return;
            } else if (layoutEmptyState != null) {
                layoutEmptyState.setVisibility(View.GONE);
                layoutNotifList.setVisibility(View.VISIBLE);
            }

            for (PhishGuardDataStore.NotificationItem notif : items) {
                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setBackgroundResource(R.drawable.bg_card_dark);
                card.setPadding(32, 24, 32, 24);

                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 0, 0, 20);
                card.setLayoutParams(params);

                TextView tvTitle = new TextView(this);
                tvTitle.setText(notif.title + " • " + notif.time);
                tvTitle.setTextColor(android.graphics.Color.parseColor("#38BDF8"));
                tvTitle.setTextSize(14);
                tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);

                TextView tvBody = new TextView(this);
                tvBody.setText(notif.body);
                tvBody.setTextColor(android.graphics.Color.parseColor("#CBD5E1"));
                tvBody.setTextSize(13);
                tvBody.setPadding(0, 6, 0, 0);

                card.addView(tvTitle);
                card.addView(tvBody);
                layoutNotifList.addView(card);
            }
        }
    }
}
