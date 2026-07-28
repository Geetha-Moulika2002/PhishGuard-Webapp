package com.phishguard.app;

import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class ThreatCenterActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_threat_center);

        findViewById(R.id.btnBookmark1).setOnClickListener(v -> Toast.makeText(this, "Scam Alert Bookmarked", Toast.LENGTH_SHORT).show());
        findViewById(R.id.btnBookmark2).setOnClickListener(v -> Toast.makeText(this, "Safety Tip Bookmarked", Toast.LENGTH_SHORT).show());
    }
}
