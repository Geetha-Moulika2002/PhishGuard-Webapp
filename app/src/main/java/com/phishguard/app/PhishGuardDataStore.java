package com.phishguard.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class PhishGuardDataStore {
    private static PhishGuardDataStore instance;
    private SharedPreferences prefs;
    private String activeSyncEmail = null;
    private String emergencyContact = "";
    private boolean audioAlarmEnabled = true;

    private final List<ScanItem> scanHistory = new ArrayList<>();
    private final List<BlockedSender> blockedSenders = new ArrayList<>();
    private final List<NotificationItem> notifications = new ArrayList<>();
    private final List<ScamReport> scamReports = new ArrayList<>();

    public boolean isAudioAlarmEnabled() {
        if (prefs != null) {
            return prefs.getBoolean("audio_alarm_enabled", true);
        }
        return audioAlarmEnabled;
    }

    public void setAudioAlarmEnabled(boolean enabled) {
        this.audioAlarmEnabled = enabled;
        if (prefs != null) {
            prefs.edit().putBoolean("audio_alarm_enabled", enabled).apply();
        }
    }

    public interface DataChangeListener {
        void onDataChanged();
    }
    private DataChangeListener dataChangeListener;

    public void setDataChangeListener(DataChangeListener listener) {
        this.dataChangeListener = listener;
    }

    public static synchronized PhishGuardDataStore getInstance() {
        if (instance == null) {
            instance = new PhishGuardDataStore();
        }
        return instance;
    }

    public void init(Context context) {
        if (context != null) {
            String userEmail = AuthManager.getUserEmail(context);
            String safeKey = "PhishGuardDataStorePrefs";
            if (userEmail != null && !userEmail.isEmpty()) {
                safeKey = "PhishGuardDataStorePrefs_" + userEmail.toLowerCase().replaceAll("[^a-z0-9]", "_");
            }

            if (prefs == null || (userEmail != null && !userEmail.equals(activeSyncEmail))) {
                prefs = context.getApplicationContext().getSharedPreferences(safeKey, Context.MODE_PRIVATE);
                scanHistory.clear();
                blockedSenders.clear();
                notifications.clear();
                loadDataFromPrefs();
            }
            startRealtimeFirestoreSync(context);
        }
    }

    public static String maskPhoneNumber(String sender) {
        if (sender == null || sender.trim().isEmpty()) return "SMS Sender";
        String clean = sender.trim();
        if (clean.matches("^\\+?\\d{7,15}$")) {
            int len = clean.length();
            if (len > 6) {
                String prefix = clean.substring(0, Math.min(5, len - 4));
                String suffix = clean.substring(len - 2);
                return prefix + "*** ***" + suffix;
            }
        }
        return clean;
    }

    public static String getSafeCloudPreview(String message) {
        if (message == null || message.trim().isEmpty()) return "Scanned Content";
        String clean = message.trim();
        if (clean.length() > 35) {
            return clean.substring(0, 35) + "...";
        }
        return clean;
    }

    public void startRealtimeFirestoreSync(Context context) {
        String userEmail = AuthManager.getUserEmail(context);

        try {
            // Collection 1: Global Community Blocked Senders (Synced across ALL user accounts)
            FirebaseFirestore.getInstance().collection("global_blocked_senders")
                    .addSnapshotListener((value, error) -> {
                        if (error != null || value == null) return;
                        if (value.isEmpty()) {
                            // Seed global_blocked_senders collection so it appears in Firebase Console
                            String[] initialGlobals = {"+919959215135", "SBI-ALERT", "HDFCBK-LOAN", "PAYTM-KYC", "VM-BOISTK"};
                            for (String g : initialGlobals) {
                                Map<String, Object> data = new HashMap<>();
                                data.put("phoneOrHeader", g);
                                data.put("reason", "Global Threat Intelligence Blacklist");
                                data.put("dateAdded", "Today");
                                data.put("userEmail", "global_shield");
                                data.put("timestamp", FieldValue.serverTimestamp());
                                FirebaseFirestore.getInstance().collection("global_blocked_senders").add(data);
                            }
                        }
                        for (QueryDocumentSnapshot doc : value) {
                            String header = doc.getString("phoneOrHeader");
                            String reason = doc.getString("reason");
                            if (header != null && !isSenderBlocked(header)) {
                                blockedSenders.add(0, new BlockedSender(header, reason != null ? reason : "Global Community Blocked", "Today", getTodayDateKey()));
                            }
                        }
                        saveDataToPrefs();
                        notifyListener();
                    });

            // Collection 2: Cross-Account Blocked Senders Sync (All blocked senders in Firebase affect ALL user accounts!)
            FirebaseFirestore.getInstance().collection("blocked_senders")
                    .addSnapshotListener((value, error) -> {
                        if (error != null || value == null) return;
                        for (QueryDocumentSnapshot doc : value) {
                            String header = doc.getString("phoneOrHeader");
                            String reason = doc.getString("reason");
                            if (header != null && !isSenderBlocked(header)) {
                                blockedSenders.add(0, new BlockedSender(header, reason != null ? reason : "Community Blocked", "Today", getTodayDateKey()));
                            }
                        }
                        saveDataToPrefs();
                        notifyListener();
                    });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void notifyListener() {
        if (dataChangeListener != null) {
            new Handler(Looper.getMainLooper()).post(() -> dataChangeListener.onDataChanged());
        }
    }

    public static class ScanItem {
        public String id;
        public String sender;
        public String message;
        public int score;
        public String riskLevel;
        public String timestamp;
        public String dateKey;
        public String threatType;

        public ScanItem(String id, String sender, String message, int score, String riskLevel, String timestamp, String dateKey, String threatType) {
            this.id = id;
            this.sender = sender;
            this.message = message;
            this.score = score;
            this.riskLevel = riskLevel;
            this.timestamp = timestamp;
            this.dateKey = dateKey;
            this.threatType = threatType;
        }

        public ScanItem(String id, String sender, String message, int score, String riskLevel, String timestamp, String dateKey) {
            this(id, sender, message, score, riskLevel, timestamp, dateKey, "Scanned Message");
        }
    }

    public static class NotificationItem {
        public String id;
        public String title;
        public String body;
        public String time;
        public String dateKey;
        public String type;
        public boolean read;

        public NotificationItem(String title, String body, String time, String dateKey, String type) {
            this.id = String.valueOf(System.currentTimeMillis());
            this.title = title;
            this.body = body;
            this.time = time;
            this.dateKey = dateKey;
            this.type = type;
            this.read = false;
        }
    }

    public static class BlockedSender {
        public String phoneOrHeader;
        public String reason;
        public String dateAdded;
        public String dateKey;

        public BlockedSender(String phoneOrHeader, String reason, String dateAdded, String dateKey) {
            this.phoneOrHeader = phoneOrHeader;
            this.reason = reason;
            this.dateAdded = dateAdded;
            this.dateKey = dateKey;
        }
    }

    public static class ScamReport {
        public String id;
        public String smsText;
        public String issueDescription;
        public String screenshotStatus;
        public String timestamp;
        public String dateKey;

        public ScamReport(String smsText, String issueDescription, String screenshotStatus, String timestamp, String dateKey) {
            this.id = String.valueOf(System.currentTimeMillis());
            this.smsText = smsText;
            this.issueDescription = issueDescription;
            this.screenshotStatus = screenshotStatus;
            this.timestamp = timestamp;
            this.dateKey = dateKey;
        }
    }

    public List<ScanItem> getScanHistory() { return scanHistory; }
    public List<BlockedSender> getBlockedSenders() { return blockedSenders; }
    public List<NotificationItem> getNotifications() { return notifications; }
    public List<ScamReport> getScamReports() { return scamReports; }

    public int getSecurityScore() {
        int baseScore = 100;
        int threatDeduction = 0;
        for (ScanItem item : scanHistory) {
            if (item.score >= 70) {
                threatDeduction += 10;
            } else if (item.score >= 40) {
                threatDeduction += 5;
            }
        }
        int finalScore = baseScore - threatDeduction;
        return Math.max(25, Math.min(100, finalScore));
    }

    public static String getYesterdayDateKey() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DATE, -1);
        return sdf.format(cal.getTime());
    }

    public boolean isSenderBlocked(String senderHeader) {
        if (senderHeader == null || senderHeader.trim().isEmpty()) return false;
        String query = senderHeader.toLowerCase().trim();
        for (BlockedSender b : blockedSenders) {
            if (b.phoneOrHeader != null && b.phoneOrHeader.toLowerCase().trim().equals(query)) {
                return true;
            }
        }
        return false;
    }

    public void addScan(ScanItem item) {
        scanHistory.add(0, item);
        saveDataToPrefs();
        notifyListener();
    }

    public void deleteScanItem(Context context, ScanItem item) {
        if (item == null) return;
        scanHistory.remove(item);
        saveDataToPrefs();
        notifyListener();

        if (item.id != null) {
            try {
                FirebaseFirestore.getInstance().collection("scans").document(item.id).delete();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void clearScanHistory(Context context) {
        scanHistory.clear();
        saveDataToPrefs();
        notifyListener();

        String userEmail = AuthManager.getUserEmail(context);
        if (userEmail != null && !userEmail.isEmpty()) {
            try {
                FirebaseFirestore.getInstance().collection("scans")
                        .whereEqualTo("userEmail", userEmail)
                        .get()
                        .addOnSuccessListener(queryDocumentSnapshots -> {
                            for (QueryDocumentSnapshot doc : queryDocumentSnapshots) {
                                doc.getReference().delete();
                            }
                        });
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void addNotification(NotificationItem item) {
        notifications.add(0, item);
        saveDataToPrefs();
        notifyListener();
    }

    public void addBlockedSender(Context context, BlockedSender sender, boolean isGlobal) {
        if (!isSenderBlocked(sender.phoneOrHeader)) {
            blockedSenders.add(0, sender);
            saveDataToPrefs();
            notifyListener();
        }

        try {
            String userEmail = context != null ? AuthManager.getUserEmail(context) : "community_user";
            Map<String, Object> data = new HashMap<>();
            data.put("phoneOrHeader", sender.phoneOrHeader);
            data.put("reason", sender.reason);
            data.put("dateAdded", sender.dateAdded);
            data.put("userEmail", userEmail != null ? userEmail : "community_user");
            data.put("timestamp", FieldValue.serverTimestamp());

            // 1. Write to personal blocked_senders collection
            FirebaseFirestore.getInstance().collection("blocked_senders").add(data)
                    .addOnSuccessListener(ref -> Log.e("PHISHGUARD_FIREBASE", "✅ Document added to blocked_senders: " + ref.getId()))
                    .addOnFailureListener(err -> Log.e("PHISHGUARD_FIREBASE", "❌ Failed writing to blocked_senders: " + err.getMessage()));

            // 2. Write to global_blocked_senders collection so ALL users get it
            FirebaseFirestore.getInstance().collection("global_blocked_senders").add(data)
                    .addOnSuccessListener(ref -> Log.e("PHISHGUARD_FIREBASE", "✅ Document added to global_blocked_senders: " + ref.getId()))
                    .addOnFailureListener(err -> Log.e("PHISHGUARD_FIREBASE", "❌ Failed writing to global_blocked_senders: " + err.getMessage()));
        } catch (Exception e) {
            Log.e("PHISHGUARD_FIREBASE", "Firestore error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void addBlockedSender(BlockedSender sender) {
        addBlockedSender(null, sender, true);
    }

    public void deleteBlockedSender(Context context, String phoneOrHeader) {
        if (phoneOrHeader == null) return;
        for (int i = blockedSenders.size() - 1; i >= 0; i--) {
            if (blockedSenders.get(i).phoneOrHeader.equalsIgnoreCase(phoneOrHeader)) {
                blockedSenders.remove(i);
            }
        }
        saveDataToPrefs();
        notifyListener();

        String userEmail = AuthManager.getUserEmail(context);
        try {
            FirebaseFirestore.getInstance().collection("blocked_senders")
                    .whereEqualTo("phoneOrHeader", phoneOrHeader)
                    .get()
                    .addOnSuccessListener(queryDocumentSnapshots -> {
                        for (QueryDocumentSnapshot doc : queryDocumentSnapshots) {
                            doc.getReference().delete();
                        }
                    });

            FirebaseFirestore.getInstance().collection("global_blocked_senders")
                    .whereEqualTo("phoneOrHeader", phoneOrHeader)
                    .get()
                    .addOnSuccessListener(queryDocumentSnapshots -> {
                        for (QueryDocumentSnapshot doc : queryDocumentSnapshots) {
                            doc.getReference().delete();
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void addScamReport(ScamReport report) {
        scamReports.add(0, report);
        saveDataToPrefs();
        notifyListener();
    }

    private void saveDataToPrefs() {
        if (prefs == null) return;
        try {
            JSONArray scansArr = new JSONArray();
            for (ScanItem s : scanHistory) {
                JSONObject obj = new JSONObject();
                obj.put("id", s.id);
                obj.put("sender", s.sender);
                obj.put("message", s.message);
                obj.put("score", s.score);
                obj.put("riskLevel", s.riskLevel);
                obj.put("timestamp", s.timestamp);
                obj.put("dateKey", s.dateKey);
                obj.put("threatType", s.threatType);
                scansArr.put(obj);
            }

            JSONArray blockedArr = new JSONArray();
            for (BlockedSender b : blockedSenders) {
                JSONObject obj = new JSONObject();
                obj.put("phoneOrHeader", b.phoneOrHeader);
                obj.put("reason", b.reason);
                obj.put("dateAdded", b.dateAdded);
                obj.put("dateKey", b.dateKey);
                blockedArr.put(obj);
            }

            prefs.edit()
                    .putString("persistent_scans", scansArr.toString())
                    .putString("persistent_blocked", blockedArr.toString())
                    .apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void loadDataFromPrefs() {
        if (prefs == null) return;
        try {
            String scansStr = prefs.getString("persistent_scans", null);
            if (scansStr != null) {
                scanHistory.clear();
                JSONArray scansArr = new JSONArray(scansStr);
                for (int i = 0; i < scansArr.length(); i++) {
                    JSONObject obj = scansArr.getJSONObject(i);
                    scanHistory.add(new ScanItem(
                            obj.optString("id"),
                            obj.optString("sender"),
                            obj.optString("message"),
                            obj.optInt("score"),
                            obj.optString("riskLevel"),
                            obj.optString("timestamp"),
                            obj.optString("dateKey"),
                            obj.optString("threatType", "Scanned Message")
                    ));
                }
            }

            String blockedStr = prefs.getString("persistent_blocked", null);
            if (blockedStr != null) {
                blockedSenders.clear();
                JSONArray blockedArr = new JSONArray(blockedStr);
                for (int i = 0; i < blockedArr.length(); i++) {
                    JSONObject obj = blockedArr.getJSONObject(i);
                    blockedSenders.add(new BlockedSender(
                            obj.optString("phoneOrHeader"),
                            obj.optString("reason"),
                            obj.optString("dateAdded"),
                            obj.optString("dateKey")
                    ));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static String getFormattedCurrentTime() {
        SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());
        return sdf.format(new Date());
    }

    public static String getTodayDateKey() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        return sdf.format(new Date());
    }
}
