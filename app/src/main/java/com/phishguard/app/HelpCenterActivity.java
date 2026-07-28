package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;

public class HelpCenterActivity extends AppCompatActivity {

    private View rowLiveChat, rowReportScam, rowFeedback, rowBugReport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_help_center);

        rowLiveChat = findViewById(R.id.rowLiveChat);
        rowReportScam = findViewById(R.id.rowReportScam);
        rowFeedback = findViewById(R.id.rowFeedback);
        rowBugReport = findViewById(R.id.rowBugReport);

        if (rowLiveChat != null) {
            rowLiveChat.setOnClickListener(v -> startActivity(new Intent(this, LiveChatActivity.class)));
        }

        if (rowReportScam != null) {
            rowReportScam.setOnClickListener(v -> startActivity(new Intent(this, ReportActivity.class)));
        }

        if (rowFeedback != null) {
            rowFeedback.setOnClickListener(v -> startActivity(new Intent(this, FeedbackActivity.class)));
        }

        if (rowBugReport != null) {
            rowBugReport.setOnClickListener(v -> startActivity(new Intent(this, FeedbackActivity.class)));
        }
    }
}
