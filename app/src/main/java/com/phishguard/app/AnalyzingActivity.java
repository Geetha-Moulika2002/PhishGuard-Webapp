package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;

import androidx.appcompat.app.AppCompatActivity;

public class AnalyzingActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_analyzing);

        String sms = getIntent().getStringExtra("sms_text");

        new Handler().postDelayed(() -> {

            Intent intent = new Intent(
                    AnalyzingActivity.this,
                    ResultActivity.class
            );

            intent.putExtra("sms_text", sms);

            startActivity(intent);

            finish();

        }, 3000);

    }
}