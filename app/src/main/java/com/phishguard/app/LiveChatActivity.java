package com.phishguard.app;

import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class LiveChatActivity extends AppCompatActivity {

    private LinearLayout layoutChatContainer;
    private ScrollView scrollChat;
    private EditText etMessageInput;
    private Button btnSend;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_live_chat);

        layoutChatContainer = findViewById(R.id.layoutChatContainer);
        scrollChat = findViewById(R.id.scrollChat);
        etMessageInput = findViewById(R.id.etMessageInput);
        btnSend = findViewById(R.id.btnSend);

        // Initial Assistant Greeting
        addBotBubble("Hello! I am PhishGuard AI Security Assistant. Ask me anything about SMS scanning, blocking senders, security scores, or privacy protection.");

        if (btnSend != null) {
            btnSend.setOnClickListener(v -> sendMessage());
        }
    }

    private void sendMessage() {
        if (etMessageInput == null) return;
        String userText = etMessageInput.getText().toString().trim();
        if (TextUtils.isEmpty(userText)) return;

        // User message bubble
        addUserBubble(userText);
        etMessageInput.setText("");

        // Generate intelligent security assistant response
        String botReply = generateBotReply(userText);

        // Bot message bubble
        if (layoutChatContainer != null) {
            layoutChatContainer.postDelayed(() -> addBotBubble(botReply), 400);
        }
    }

    private String generateBotReply(String input) {
        String lower = input.toLowerCase();

        if (lower.contains("scan") || lower.contains("sms")) {
            return "PhishGuard analyzes incoming SMS messages strictly on-device using intent keyword analysis, link evaluation, and urgency patterns. Your messages never leave your phone!";
        } else if (lower.contains("block")) {
            return "To block a scam sender, open Blocked List from the Dashboard and add their phone number or SMS header. PhishGuard will automatically suppress pop-up alerts from them!";
        } else if (lower.contains("score") || lower.contains("security")) {
            return "Your Security Score (e.g. 85/100) is calculated based on enabled Android permissions, active block lists, and Threat Center updates.";
        } else if (lower.contains("report") || lower.contains("scam")) {
            return "You can report suspicious SMS text directly in Report Scam. Submitted reports enter PhishGuard's threat database to help protect users.";
        } else if (lower.contains("privacy") || lower.contains("data")) {
            return "PhishGuard operates under a strict Zero-Cloud SMS policy. No personal texts or contact lists are ever uploaded or sold.";
        } else if (lower.contains("hello") || lower.contains("hi") || lower.contains("hey")) {
            return "Hello! How can I assist you with your mobile security today?";
        } else {
            return "I have analyzed your query: \"" + input + "\". PhishGuard is actively protecting your device against fraudulent SMS phishing. Is there anything specific you need help configuring?";
        }
    }

    private void addUserBubble(String text) {
        if (layoutChatContainer == null) return;

        LinearLayout bubble = new LinearLayout(this);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setBackgroundResource(R.drawable.bg_button_primary);
        bubble.setPadding(28, 20, 28, 20);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.gravity = android.view.Gravity.END;
        params.setMargins(60, 10, 0, 10);
        bubble.setLayoutParams(params);

        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(android.graphics.Color.WHITE);
        tv.setTextSize(14);
        bubble.addView(tv);

        layoutChatContainer.addView(bubble);
        scrollToBottom();
    }

    private void addBotBubble(String text) {
        if (layoutChatContainer == null) return;

        LinearLayout bubble = new LinearLayout(this);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setBackgroundResource(R.drawable.bg_card_dark);
        bubble.setPadding(28, 20, 28, 20);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.gravity = android.view.Gravity.START;
        params.setMargins(0, 10, 60, 10);
        bubble.setLayoutParams(params);

        TextView tvSender = new TextView(this);
        tvSender.setText("🤖 PhishGuard AI Assistant");
        tvSender.setTextColor(android.graphics.Color.parseColor("#38BDF8"));
        tvSender.setTextSize(12);
        tvSender.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(android.graphics.Color.parseColor("#E2E8F0"));
        tv.setTextSize(14);
        tv.setPadding(0, 6, 0, 0);

        bubble.addView(tvSender);
        bubble.addView(tv);

        layoutChatContainer.addView(bubble);
        scrollToBottom();
    }

    private void scrollToBottom() {
        if (scrollChat != null) {
            scrollChat.post(() -> scrollChat.fullScroll(ScrollView.FOCUS_DOWN));
        }
    }
}
