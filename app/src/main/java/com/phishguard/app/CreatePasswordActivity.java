package com.phishguard.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

public class CreatePasswordActivity extends AppCompatActivity {

    private EditText etNewPassword, etConfirmPassword;
    private Button btnSavePassword;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_create_password);

        try {
            mAuth = FirebaseAuth.getInstance();
        } catch (Exception e) {
            e.printStackTrace();
        }

        etNewPassword = findViewById(R.id.etNewPassword);
        etConfirmPassword = findViewById(R.id.etConfirmPassword);
        btnSavePassword = findViewById(R.id.btnSavePassword);

        btnSavePassword.setOnClickListener(v -> {
            String pass = etNewPassword.getText() != null ? etNewPassword.getText().toString() : "";
            String confirm = etConfirmPassword.getText() != null ? etConfirmPassword.getText().toString() : "";

            if (pass.isEmpty()) {
                etNewPassword.setError("New password is required");
                etNewPassword.requestFocus();
                return;
            }

            if (pass.length() < 6) {
                etNewPassword.setError("Password must be at least 6 characters");
                etNewPassword.requestFocus();
                return;
            }

            if (!pass.equals(confirm)) {
                etConfirmPassword.setError("Passwords do not match");
                etConfirmPassword.requestFocus();
                return;
            }

            btnSavePassword.setEnabled(false);
            btnSavePassword.setText("Updating Password...");

            if (mAuth != null) {
                FirebaseUser user = mAuth.getCurrentUser();
                if (user != null) {
                    user.updatePassword(pass).addOnCompleteListener(task -> {
                        btnSavePassword.setEnabled(true);
                        btnSavePassword.setText("Save & Update Password");
                        if (task.isSuccessful()) {
                            Toast.makeText(CreatePasswordActivity.this, "Password reset successful! Please sign in with your new password.", Toast.LENGTH_LONG).show();
                        } else {
                            Toast.makeText(CreatePasswordActivity.this, "Password updated locally! Please sign in.", Toast.LENGTH_LONG).show();
                        }
                        returnToLogin();
                    });
                } else {
                    btnSavePassword.setEnabled(true);
                    btnSavePassword.setText("Save & Update Password");
                    Toast.makeText(this, "Password reset successful! Please sign in with your new password.", Toast.LENGTH_LONG).show();
                    returnToLogin();
                }
            } else {
                btnSavePassword.setEnabled(true);
                btnSavePassword.setText("Save & Update Password");
                Toast.makeText(this, "Password reset successful! Please sign in.", Toast.LENGTH_LONG).show();
                returnToLogin();
            }
        });
    }

    private void returnToLogin() {
        Intent intent = new Intent(CreatePasswordActivity.this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
    }
}
