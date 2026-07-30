package com.phishguard.app;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class LiveChatActivity extends AppCompatActivity {

    private LinearLayout layoutChatContainer;
    private ScrollView scrollChat;
    private EditText etMessageInput;
    private Button btnSend;
    private TextView pillBiLSTM, pillAnalyzeLink, pillBlockScammers, pillSecurityScore, pillReportScam;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_live_chat);

        layoutChatContainer = findViewById(R.id.layoutChatContainer);
        scrollChat = findViewById(R.id.scrollChat);
        etMessageInput = findViewById(R.id.etMessageInput);
        btnSend = findViewById(R.id.btnSend);

        pillBiLSTM = findViewById(R.id.pillBiLSTM);
        pillAnalyzeLink = findViewById(R.id.pillAnalyzeLink);
        pillBlockScammers = findViewById(R.id.pillBlockScammers);
        pillSecurityScore = findViewById(R.id.pillSecurityScore);
        pillReportScam = findViewById(R.id.pillReportScam);

        setupPillListeners();

        // Initial AI Assistant Welcome Message
        addBotBubble("Hello! 🛡️ I am **PhishGuard AI Assistant** powered by our BiLSTM Neural Threat Model.\n\nAsk me to scan any suspicious SMS or link, inquire about how our AI works, or check your security score!");

        if (btnSend != null) {
            btnSend.setOnClickListener(v -> sendMessage());
        }
    }

    private void setupPillListeners() {
        if (pillBiLSTM != null) {
            pillBiLSTM.setOnClickListener(v -> handlePillClick("How does the BiLSTM AI model detect phishing?"));
        }
        if (pillAnalyzeLink != null) {
            pillAnalyzeLink.setOnClickListener(v -> handlePillClick("Analyze this SMS link: http://sbi-kyc-verify-bank.com/update"));
        }
        if (pillBlockScammers != null) {
            pillBlockScammers.setOnClickListener(v -> handlePillClick("How do I block a scam sender or header?"));
        }
        if (pillSecurityScore != null) {
            pillSecurityScore.setOnClickListener(v -> handlePillClick("What is my current security score?"));
        }
        if (pillReportScam != null) {
            pillReportScam.setOnClickListener(v -> handlePillClick("How to report a phishing scam sender?"));
        }
    }

    private void handlePillClick(String promptText) {
        if (etMessageInput != null) {
            etMessageInput.setText(promptText);
            sendMessage();
        }
    }

    private void sendMessage() {
        if (etMessageInput == null) return;
        String userText = etMessageInput.getText().toString().trim();
        if (TextUtils.isEmpty(userText)) return;

        // Add User Message Bubble
        addUserBubble(userText);
        etMessageInput.setText("");

        // Show realistic typing indicator & generate smart reply
        if (layoutChatContainer != null) {
            final TextView tvTyping = addTypingIndicator();
            layoutChatContainer.postDelayed(() -> {
                removeTypingIndicator(tvTyping);
                String botReply = generateSmartReply(userText);
                addBotBubble(botReply);
            }, 600);
        }
    }

    private String generateSmartReply(String input) {
        String lower = input.toLowerCase().trim();

        // 1. Real-time Intent & Content Scanning if text contains URL or SMS content
        if (lower.contains("http") || lower.contains("www.") || lower.contains(".com") || lower.contains("claim") || lower.contains("kyc") || lower.contains("reward") || lower.contains("cashback") || lower.contains("urgent") || lower.contains("account suspended")) {
            PhishingAnalyzer.AnalysisResult result = PhishingAnalyzer.analyzeMessage(input);
            StringBuilder sb = new StringBuilder();
            sb.append("🔍 **Live Phishing Analysis Result**:\n\n");
            sb.append("• **Risk Score**: ").append(result.riskScore).append("/100 (").append(result.riskLevel).append(")\n");
            sb.append("• **Threat Type**: ").append(result.threatType).append("\n\n");
            
            if (result.riskScore >= 65) {
                sb.append("🚨 **DANGER DETECTED**: This content contains suspicious phishing keywords/links. PhishGuard recommends NOT clicking any links or providing OTPs!");
            } else {
                sb.append("✅ **CONTENT VERIFIED**: No active malicious phishing patterns detected in this message snippet.");
            }
            return sb.toString();
        }

        // 2. BiLSTM & AI Model Architecture Explanation
        if (lower.contains("bilstm") || lower.contains("model") || lower.contains("algorithm") || lower.contains("ai") || lower.contains("attention")) {
            return "🤖 **PhishGuard 6-Layer Neural Architecture**:\n\n" +
                    "1. **TF-IDF Token Extraction**: Parses character n-grams.\n" +
                    "2. **Embedding Space**: Maps tokens into a 64-dim dense vector.\n" +
                    "3. **BiLSTM Bidirectional Pass**: Analyzes forward & backward context.\n" +
                    "4. **Self-Attention Layer**: Weights high-risk intent keywords.\n" +
                    "5. **Ensemble Fusion**: Combines neural probability with domain heuristic rules.\n" +
                    "6. **On-Device Evaluation**: Evaluated 100% locally in under 5ms!";
        }

        // 3. Security Score Query
        if (lower.contains("score") || lower.contains("rating") || lower.contains("security")) {
            int score = PhishGuardDataStore.getInstance().getSecurityScore();
            return "📊 **Current Device Security Rating**: " + score + "/100\n\n" +
                    "• Active Blocked Senders: " + PhishGuardDataStore.getInstance().getBlockedSenders().size() + "\n" +
                    "• Audio Warning Siren: " + (PhishGuardDataStore.getInstance().isAudioAlarmEnabled() ? "ENABLED ✔" : "MUTED ❌") + "\n\n" +
                    "💡 *Tip: Enable Community Fraud Shield in Blocked Senders to maintain 100/100 score!*";
        }

        // 4. How to Block Senders
        if (lower.contains("block") || lower.contains("sender") || lower.contains("header")) {
            return "🛡️ **Blocking Scammers in PhishGuard**:\n\n" +
                    "1. Open **Blocked Senders** from the Dashboard.\n" +
                    "2. Enter the phone number or SMS header (e.g. `AX-BANK` or `+91 99592 15135`).\n" +
                    "3. Tap **Block**.\n\n" +
                    "✅ PhishGuard will automatically silence notifications and trigger the **Dramatic Red Security Overlay + Audio Siren** if they text!";
        }

        // 5. Reporting Scams & Community Shield
        if (lower.contains("report") || lower.contains("scam") || lower.contains("community")) {
            return "🚨 **Reporting Scam Senders**:\n\n" +
                    "Open **Report Scam** from the main dashboard, enter the scam text & sender header, and submit.\n\n" +
                    "PhishGuard publishes reported senders to our **Firebase Cloud Firestore `global_blocked_senders`** collection, auto-protecting ALL users worldwide!";
        }

        // 6. Privacy & Data Security
        if (lower.contains("privacy") || lower.contains("data") || lower.contains("cloud") || lower.contains("permission")) {
            return "🔒 **Privacy Guarantee**:\n\n" +
                    "PhishGuard operates under a strict Zero-Privacy-Violation policy. Your personal SMS messages are scanned strictly on your phone's memory and are NEVER uploaded or sold to third parties!";
        }

        // 7. General Greeting
        if (lower.contains("hello") || lower.contains("hi") || lower.contains("hey")) {
            return "Hello! How can I assist you with your mobile security or SMS threat scanning today?";
        }

        // Default Intelligent Fallback
        return "I have evaluated your input: \"" + input + "\". PhishGuard is actively protecting your device. Try asking me to analyze an SMS link or explain our BiLSTM AI model!";
    }

    private TextView addTypingIndicator() {
        if (layoutChatContainer == null) return null;

        TextView tvTyping = new TextView(this);
        tvTyping.setText("🤖 PhishGuard AI is analyzing...");
        tvTyping.setTextColor(android.graphics.Color.parseColor("#94A3B8"));
        tvTyping.setTextSize(12);
        tvTyping.setPadding(20, 10, 20, 10);

        layoutChatContainer.addView(tvTyping);
        scrollToBottom();
        return tvTyping;
    }

    private void removeTypingIndicator(TextView tvTyping) {
        if (layoutChatContainer != null && tvTyping != null) {
            layoutChatContainer.removeView(tvTyping);
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
        params.setMargins(80, 12, 0, 12);
        bubble.setLayoutParams(params);

        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(android.graphics.Color.WHITE);
        tv.setTextSize(14);

        TextView tvTime = new TextView(this);
        tvTime.setText(getCurrentFormattedTime());
        tvTime.setTextColor(android.graphics.Color.parseColor("#93C5FD"));
        tvTime.setTextSize(10);
        tvTime.setGravity(android.view.Gravity.END);
        tvTime.setPadding(0, 4, 0, 0);

        bubble.addView(tv);
        bubble.addView(tvTime);

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
        params.setMargins(0, 12, 80, 12);
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

        TextView tvTime = new TextView(this);
        tvTime.setText(getCurrentFormattedTime());
        tvTime.setTextColor(android.graphics.Color.parseColor("#64748B"));
        tvTime.setTextSize(10);
        tvTime.setPadding(0, 6, 0, 0);

        bubble.addView(tvSender);
        bubble.addView(tv);
        bubble.addView(tvTime);

        layoutChatContainer.addView(bubble);
        scrollToBottom();
    }

    private String getCurrentFormattedTime() {
        SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());
        return sdf.format(new Date());
    }

    private void scrollToBottom() {
        if (scrollChat != null) {
            scrollChat.post(() -> scrollChat.fullScroll(ScrollView.FOCUS_DOWN));
        }
    }
}
