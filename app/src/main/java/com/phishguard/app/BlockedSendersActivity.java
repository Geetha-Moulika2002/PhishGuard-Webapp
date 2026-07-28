package com.phishguard.app;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class BlockedSendersActivity extends AppCompatActivity {

    private LinearLayout layoutBlockedList, layoutEmptyState;
    private EditText etSearchBlocked, etNewSender;
    private Button btnAddBlocked;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_blocked_senders);

        layoutBlockedList = findViewById(R.id.layoutBlockedList);
        layoutEmptyState = findViewById(R.id.layoutEmptyState);
        etSearchBlocked = findViewById(R.id.etSearchBlocked);
        etNewSender = findViewById(R.id.etNewSender);
        btnAddBlocked = findViewById(R.id.btnAddBlocked);

        renderBlockedList();

        if (btnAddBlocked != null) {
            btnAddBlocked.setOnClickListener(v -> {
                String newSender = etNewSender != null ? etNewSender.getText().toString().trim() : "";
                if (newSender.isEmpty()) {
                    Toast.makeText(this, "Please enter phone number or header", Toast.LENGTH_SHORT).show();
                    return;
                }

                // 1. Add to Local DataStore Database
                PhishGuardDataStore.getInstance().addBlockedSender(new PhishGuardDataStore.BlockedSender(
                        newSender, "Manually added by user", "Today", PhishGuardDataStore.getTodayDateKey()
                ));

                // 2. Add to Firebase Firestore Database ("blocked_senders" collection)
                try {
                    Map<String, Object> map = new HashMap<>();
                    map.put("phoneOrHeader", newSender);
                    map.put("reason", "Manually added by user");
                    map.put("userEmail", AuthManager.getUserEmail(this));
                    map.put("timestamp", new java.util.Date());

                    FirebaseFirestore.getInstance().collection("blocked_senders").add(map);
                } catch (Exception e) {
                    e.printStackTrace();
                }

                if (etNewSender != null) etNewSender.setText("");
                renderBlockedList();
                Toast.makeText(this, "Sender Blocked & Saved to Database", Toast.LENGTH_SHORT).show();
            });
        }

        if (etSearchBlocked != null) {
            etSearchBlocked.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    renderBlockedList();
                }
                @Override
                public void afterTextChanged(Editable s) {}
            });
        }
    }

    private void renderBlockedList() {
        List<PhishGuardDataStore.BlockedSender> list = PhishGuardDataStore.getInstance().getBlockedSenders();
        String query = etSearchBlocked != null ? etSearchBlocked.getText().toString().toLowerCase().trim() : "";

        if (layoutBlockedList != null) {
            layoutBlockedList.removeAllViews();
            int count = 0;

            for (int i = 0; i < list.size(); i++) {
                final int index = i;
                PhishGuardDataStore.BlockedSender sender = list.get(i);
                if (!query.isEmpty() && !sender.phoneOrHeader.toLowerCase().contains(query)) {
                    continue;
                }
                count++;

                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.HORIZONTAL);
                card.setBackgroundResource(R.drawable.bg_card_dark);
                card.setPadding(32, 24, 32, 24);
                card.setGravity(android.view.Gravity.CENTER_VERTICAL);

                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 0, 0, 16);
                card.setLayoutParams(params);

                LinearLayout textCol = new LinearLayout(this);
                textCol.setOrientation(LinearLayout.VERTICAL);
                LinearLayout.LayoutParams colParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                textCol.setLayoutParams(colParams);

                TextView tvHeader = new TextView(this);
                tvHeader.setText(sender.phoneOrHeader);
                tvHeader.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
                tvHeader.setTextSize(15);
                tvHeader.setTypeface(null, android.graphics.Typeface.BOLD);

                TextView tvReason = new TextView(this);
                tvReason.setText(sender.reason + " • " + sender.dateAdded);
                tvReason.setTextColor(android.graphics.Color.parseColor("#94A3B8"));
                tvReason.setTextSize(12);

                textCol.addView(tvHeader);
                textCol.addView(tvReason);

                Button btnUnblock = new Button(this);
                btnUnblock.setText("Unblock");
                btnUnblock.setTextSize(12);
                btnUnblock.setTextColor(android.graphics.Color.parseColor("#38BDF8"));
                btnUnblock.setBackgroundResource(R.drawable.bg_card_dark);
                btnUnblock.setOnClickListener(v -> {
                    PhishGuardDataStore.getInstance().getBlockedSenders().remove(index);
                    renderBlockedList();
                    Toast.makeText(this, "Unblocked " + sender.phoneOrHeader, Toast.LENGTH_SHORT).show();
                });

                card.addView(textCol);
                card.addView(btnUnblock);
                layoutBlockedList.addView(card);
            }

            if (count == 0 && layoutEmptyState != null) {
                layoutEmptyState.setVisibility(View.VISIBLE);
                layoutBlockedList.setVisibility(View.GONE);
            } else if (layoutEmptyState != null) {
                layoutEmptyState.setVisibility(View.GONE);
                layoutBlockedList.setVisibility(View.VISIBLE);
            }
        }
    }
}
