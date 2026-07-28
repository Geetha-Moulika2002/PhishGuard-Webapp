package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class QrScannerActivity extends AppCompatActivity {

    private View layoutScanning, layoutResult;
    private TextView tvQrResultStatus, tvQrUrl;
    private Button btnScanAgain, btnDone;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_qr_scanner);

        layoutScanning = findViewById(R.id.layoutScanning);
        layoutResult = findViewById(R.id.layoutResult);
        tvQrResultStatus = findViewById(R.id.tvQrResultStatus);
        tvQrUrl = findViewById(R.id.tvQrUrl);
        btnScanAgain = findViewById(R.id.btnScanAgain);
        btnDone = findViewById(R.id.btnDone);

        startSimulatedScan();

        btnScanAgain.setOnClickListener(v -> {
            layoutResult.setVisibility(View.GONE);
            layoutScanning.setVisibility(View.VISIBLE);
            startSimulatedScan();
        });

        btnDone.setOnClickListener(v -> finish());
    }

    private void startSimulatedScan() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (isFinishing()) return;
            layoutScanning.setVisibility(View.GONE);
            layoutResult.setVisibility(View.VISIBLE);

            tvQrResultStatus.setText("✅ SAFE QR CODE");
            tvQrUrl.setText("https://official-merchant.com/pay");

            PhishGuardDataStore.getInstance().addScan(new PhishGuardDataStore.ScanItem(
                    String.valueOf(System.currentTimeMillis()),
                    "QR Code Scanner",
                    "https://official-merchant.com/pay",
                    0,
                    "SAFE",
                    "Just now",
                    "Safe QR Payment Code"
            ));
        }, 2000);
    }
}
