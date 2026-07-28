package com.phishguard.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class PhishGuardDataStore {
    private static PhishGuardDataStore instance;
    private SharedPreferences prefs;
    private String activeSyncEmail = null;

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
        if (context != null && prefs == null) {
            prefs = context.getApplicationContext().getSharedPreferences("PhishGuardDataStorePrefs", Context.MODE_PRIVATE);
            loadDataFromPrefs();
        }
        if (context != null) {
            startRealtimeFirestoreSync(context);
        }
    }

    public void startRealtimeFirestoreSync(Context context) {
        String userEmail = AuthManager.getUserEmail(context);
        if (userEmail == null || userEmail.isEmpty()) return;

        // Re-attach if user email changed or sync not started for this email
        if (userEmail.equals(activeSyncEmail)) return;
        activeSyncEmail = userEmail;

        try {
            // 1. Sync Scans Real-time from Firebase Firestore ("scans")
            FirebaseFirestore.getInstance().collection("scans")
                    .whereEqualTo("userEmail", userEmail)
                    .addSnapshotListener((value, error) -> {
                        if (error != null || value == null) return;
                        scanHistory.clear();
                        for (QueryDocumentSnapshot doc : value) {
                            String sender = doc.getString("sender");
                            String message = doc.getString("message");
                            Long scoreObj = doc.getLong("riskScore");
                            int score = scoreObj != null ? scoreObj.intValue() : 0;
                            String riskLevel = doc.getString("riskLevel");
                            String threatType = doc.getString("threatType");

                            scanHistory.add(new ScanItem(
                                    doc.getId(),
                                    sender != null ? sender : "Manual Scan",
                                    message != null ? message : "",
                                    score,
                                    riskLevel != null ? riskLevel : (score >= 65 ? "HIGH RISK" : "SAFE"),
                                    getFormattedCurrentTime(),
                                    getTodayDateKey(),
                                    threatType != null ? threatType : "Scanned Message"
                            ));
                        }
                        saveDataToPrefs();
                        notifyListener();
                    });

            // 2. Sync Blocked Senders Real-time from Firebase Firestore ("blocked_senders")
            FirebaseFirestore.getInstance().collection("blocked_senders")
                    .whereEqualTo("userEmail", userEmail)
                    .addSnapshotListener((value, error) -> {
                        if (error != null || value == null) return;
                        blockedSenders.clear();
                        for (QueryDocumentSnapshot doc : value) {
                            String header = doc.getString("phoneOrHeader");
                            String reason = doc.getString("reason");
                            if (header != null) {
                                blockedSenders.add(new BlockedSender(header, reason != null ? reason : "Blocked", "Today", getTodayDateKey()));
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
        public String timestamp;  // e.g. "09:42 PM"
        public String dateKey;    // e.g. "2026-07-27"
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

    private final List<ScanItem> scanHistory = new ArrayList<>();
    private final List<NotificationItem> notifications = new ArrayList<>();
    private final List<BlockedSender> blockedSenders = new ArrayList<>();
    private final List<ScamReport> scamReports = new ArrayList<>();

    private PhishGuardDataStore() {
        // Zero-start new profiles: No initial dummy items!
    }

    public static String getTodayDateKey() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        return sdf.format(new Date());
    }

    public static String getYesterdayDateKey() {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DATE, -1);
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        return sdf.format(cal.getTime());
    }

    public static String getFormattedCurrentTime() {
        SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());
        return sdf.format(new Date());
    }

    public List<ScanItem> getScanHistory() { return scanHistory; }
    public List<NotificationItem> getNotifications() { return notifications; }
    public List<BlockedSender> getBlockedSenders() { return blockedSenders; }
    public List<ScamReport> getScamReports() { return scamReports; }

    public int getSecurityScore() {
        int baseScore = 80;
        if (!blockedSenders.isEmpty()) baseScore += 10;
        if (!scanHistory.isEmpty()) baseScore += 10;
        return Math.min(baseScore, 100);
    }

    public boolean isSenderBlocked(String sender) {
        if (sender == null) return false;
        String query = sender.toLowerCase().trim();
        for (BlockedSender item : blockedSenders) {
            if (item.phoneOrHeader != null && item.phoneOrHeader.toLowerCase().trim().equals(query)) {
                return true;
            }
        }
        return false;
    }

    public void addScan(ScanItem item) {
        scanHistory.add(0, item);
        saveDataToPrefs();
    }

    public void deleteScanItem(Context context, ScanItem item) {
        if (item == null) return;
        scanHistory.remove(item);
        saveDataToPrefs();

        // Sync Deletion to Firebase Firestore Database ("scans")
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

        // Sync Clear All Deletion to Firebase Firestore Database ("scans")
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
    }

    public void addBlockedSender(BlockedSender sender) {
        if (!isSenderBlocked(sender.phoneOrHeader)) {
            blockedSenders.add(0, sender);
            saveDataToPrefs();
        }
    }

    public void deleteBlockedSender(Context context, String phoneOrHeader) {
        if (phoneOrHeader == null) return;
        for (int i = blockedSenders.size() - 1; i >= 0; i--) {
            if (blockedSenders.get(i).phoneOrHeader.equalsIgnoreCase(phoneOrHeader)) {
                blockedSenders.remove(i);
            }
        }
        saveDataToPrefs();

        // Sync Deletion to Firebase Firestore Database ("blocked_senders")
        String userEmail = AuthManager.getUserEmail(context);
        if (userEmail != null && !userEmail.isEmpty()) {
            try {
                FirebaseFirestore.getInstance().collection("blocked_senders")
                        .whereEqualTo("userEmail", userEmail)
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
    }

    public void addScamReport(ScamReport report) {
        scamReports.add(0, report);
        saveDataToPrefs();
    }

    private void saveDataToPrefs() {
        if (prefs == null) return;
        try {
            // Serialize Scans
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

            // Serialize Blocked Senders
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
                            obj.optString("id", String.valueOf(System.currentTimeMillis())),
                            obj.optString("sender", "Unknown"),
                            obj.optString("message", ""),
                            obj.optInt("score", 0),
                            obj.optString("riskLevel", "SAFE"),
                            obj.optString("timestamp", getFormattedCurrentTime()),
                            obj.optString("dateKey", getTodayDateKey()),
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
                            obj.optString("phoneOrHeader", ""),
                            obj.optString("reason", "Blocked"),
                            obj.optString("dateAdded", "Today"),
                            obj.optString("dateKey", getTodayDateKey())
                    ));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
