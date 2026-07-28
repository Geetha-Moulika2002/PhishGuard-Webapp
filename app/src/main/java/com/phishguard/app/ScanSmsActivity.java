package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class ScanSmsActivity extends AppCompatActivity {

    Button btnAnalyze;
    EditText etSms;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan_sms);

        btnAnalyze = findViewById(R.id.btnAnalyze);
        etSms = findViewById(R.id.etSms);

        btnAnalyze.setOnClickListener(v -> {

            String sms = etSms.getText().toString().trim();

            if (sms.isEmpty()) {

                Toast.makeText(
                        this,
                        "Please enter SMS content",
                        Toast.LENGTH_SHORT
                ).show();

                return;
            }

            Intent intent = new Intent(
                    ScanSmsActivity.this,
                    AnalyzingActivity.class
            );

            intent.putExtra("sms_text", sms);

            startActivity(intent);

        });

    }
}