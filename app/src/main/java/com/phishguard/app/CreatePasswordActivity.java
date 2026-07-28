package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class CreatePasswordActivity extends AppCompatActivity {

    private EditText etNewPassword, etConfirmPassword;
    private Button btnSavePassword;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_create_password);

        etNewPassword = findViewById(R.id.etNewPassword);
        etConfirmPassword = findViewById(R.id.etConfirmPassword);
        btnSavePassword = findViewById(R.id.btnSavePassword);

        btnSavePassword.setOnClickListener(v -> {
            String pass = etNewPassword.getText().toString();
            String confirm = etConfirmPassword.getText().toString();

            if (pass.isEmpty() || !pass.equals(confirm)) {
                Toast.makeText(this, "Passwords do not match or empty", Toast.LENGTH_SHORT).show();
                return;
            }

            Toast.makeText(this, "Password reset successful! Please login.", Toast.LENGTH_LONG).show();
            Intent intent = new Intent(CreatePasswordActivity.this, LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });
    }
}
