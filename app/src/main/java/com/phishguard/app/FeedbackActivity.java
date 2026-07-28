package com.phishguard.app;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;

public class FeedbackActivity extends AppCompatActivity {

    private EditText etFeedbackMessage;
    private Button btnSubmitFeedback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_feedback);

        etFeedbackMessage = findViewById(R.id.etFeedbackMessage);
        btnSubmitFeedback = findViewById(R.id.btnSubmitFeedback);

        if (btnSubmitFeedback != null) {
            btnSubmitFeedback.setOnClickListener(v -> {
                String text = etFeedbackMessage != null ? etFeedbackMessage.getText().toString().trim() : "";
                if (text.isEmpty()) {
                    Toast.makeText(this, "Please enter your feedback message", Toast.LENGTH_SHORT).show();
                    return;
                }

                // Write feedback to Firebase Firestore Database ("feedbacks" collection)
                try {
                    Map<String, Object> map = new HashMap<>();
                    map.put("message", text);
                    map.put("userEmail", AuthManager.getUserEmail(this));
                    map.put("timestamp", new java.util.Date());
                    map.put("status", "RECEIVED");

                    FirebaseFirestore.getInstance().collection("feedbacks").add(map);
                } catch (Exception e) {
                    e.printStackTrace();
                }

                Toast.makeText(this, "Thank you! Your feedback has been saved to the database.", Toast.LENGTH_LONG).show();
                finish();
            });
        }
    }
}
