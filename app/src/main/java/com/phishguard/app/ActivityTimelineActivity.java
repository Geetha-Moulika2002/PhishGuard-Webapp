package com.phishguard.app;

import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import java.util.List;

public class ActivityTimelineActivity extends AppCompatActivity {

    private LinearLayout layoutTimelineContainer, layoutEmptyState;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_timeline);

        layoutTimelineContainer = findViewById(R.id.layoutTimelineContainer);
        layoutEmptyState = findViewById(R.id.layoutEmptyState);

        renderTimeline();
    }

    @Override
    protected void onResume() {
        super.onResume();
        renderTimeline();
    }

    private void renderTimeline() {
        List<PhishGuardDataStore.TimelineEvent> events = PhishGuardDataStore.getInstance().getTimelineEvents();

        if (layoutTimelineContainer != null) {
            layoutTimelineContainer.removeAllViews();

            if (events.isEmpty() && layoutEmptyState != null) {
                layoutEmptyState.setVisibility(View.VISIBLE);
                layoutTimelineContainer.setVisibility(View.GONE);
                return;
            } else if (layoutEmptyState != null) {
                layoutEmptyState.setVisibility(View.GONE);
                layoutTimelineContainer.setVisibility(View.VISIBLE);
            }

            for (PhishGuardDataStore.TimelineEvent event : events) {
                // Spacious Card Container
                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setBackgroundResource(R.drawable.bg_card_dark);
                card.setPadding(40, 32, 40, 32); // Spacious padding

                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 0, 0, 24); // Spacious vertical gap between cards
                card.setLayoutParams(params);

                // Title Row
                TextView tvTitle = new TextView(this);
                tvTitle.setText(event.title);
                tvTitle.setTextColor(android.graphics.Color.parseColor("#38BDF8"));
                tvTitle.setTextSize(16);
                tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);

                // Description
                TextView tvDesc = new TextView(this);
                tvDesc.setText(event.description);
                tvDesc.setTextColor(android.graphics.Color.parseColor("#E2E8F0"));
                tvDesc.setTextSize(14);
                tvDesc.setPadding(0, 10, 0, 10);
                tvDesc.setLineSpacing(6f, 1f);

                // Time Footer
                TextView tvTime = new TextView(this);
                tvTime.setText(event.time);
                tvTime.setTextColor(android.graphics.Color.parseColor("#64748B"));
                tvTime.setTextSize(12);

                card.addView(tvTitle);
                card.addView(tvDesc);
                card.addView(tvTime);
                layoutTimelineContainer.addView(card);
            }
        }
    }
}
