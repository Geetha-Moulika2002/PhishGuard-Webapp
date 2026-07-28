package com.phishguard.app;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class EditProfileActivity extends AppCompatActivity {

    private EditText etEditName, etEditEmail, etEditPhone;
    private Button btnSaveProfile;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_profile);

        etEditName = findViewById(R.id.etEditName);
        etEditEmail = findViewById(R.id.etEditEmail);
        etEditPhone = findViewById(R.id.etEditPhone);
        btnSaveProfile = findViewById(R.id.btnSaveProfile);

        String currentName = AuthManager.getUserName(this);
        String currentEmail = AuthManager.getUserEmail(this);

        SharedPreferences prefs = getSharedPreferences("PhishGuardUserPrefs", MODE_PRIVATE);
        String currentPhone = prefs.getString("user_phone", "+1 (555) 019-2831");

        if (etEditName != null) etEditName.setText(currentName);
        if (etEditEmail != null) etEditEmail.setText(currentEmail);
        if (etEditPhone != null) etEditPhone.setText(currentPhone);

        if (btnSaveProfile != null) {
            btnSaveProfile.setOnClickListener(v -> {
                String newName = etEditName != null ? etEditName.getText().toString().trim() : "";
                String newEmail = etEditEmail != null ? etEditEmail.getText().toString().trim() : "";
                String newPhone = etEditPhone != null ? etEditPhone.getText().toString().trim() : "";

                if (newName.isEmpty() || newEmail.isEmpty()) {
                    Toast.makeText(this, "Name and Email cannot be empty", Toast.LENGTH_SHORT).show();
                    return;
                }

                // Save to AuthManager SharedPreferences
                AuthManager.saveUserLogin(this, newName, newEmail);
                prefs.edit().putString("user_phone", newPhone).apply();

                Toast.makeText(this, "Profile updated successfully!", Toast.LENGTH_SHORT).show();
                finish();
            });
        }
    }
}
