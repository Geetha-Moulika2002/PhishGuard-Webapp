package com.phishguard.app;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.UUID;

public class AuthManager {

    private static final String PREF_NAME = "PhishGuardAuthPrefs";
    private static final String KEY_IS_LOGGED_IN = "is_logged_in";
    private static final String KEY_IS_FIRST_LAUNCH = "is_first_launch";
    private static final String KEY_USER_EMAIL = "user_email";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_SESSION_TOKEN = "session_token";
    private static final String KEY_LOGIN_TIME = "login_time";

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public static boolean isLoggedIn(Context context) {
        return getPrefs(context).getBoolean(KEY_IS_LOGGED_IN, false);
    }

    public static boolean isFirstLaunch(Context context) {
        return getPrefs(context).getBoolean(KEY_IS_FIRST_LAUNCH, true);
    }

    public static void setFirstLaunchCompleted(Context context) {
        SharedPreferences.Editor editor = getPrefs(context).edit();
        editor.putBoolean(KEY_IS_FIRST_LAUNCH, false);
        editor.apply();
    }

    public static void saveSession(Context context, String email, String name) {
        SharedPreferences.Editor editor = getPrefs(context).edit();
        editor.putBoolean(KEY_IS_LOGGED_IN, true);
        editor.putString(KEY_USER_EMAIL, email != null ? email.trim().toLowerCase() : "user@phishguard.ai");
        editor.putString(KEY_USER_NAME, name != null && !name.trim().isEmpty() ? name.trim() : extractNameFromEmail(email));
        editor.putString(KEY_SESSION_TOKEN, "PG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        editor.putLong(KEY_LOGIN_TIME, System.currentTimeMillis());
        editor.apply();
    }

    public static void saveUserLogin(Context context, String email, String name) {
        saveSession(context, email, name);
    }

    public static String getUserEmail(Context context) {
        String email = getPrefs(context).getString(KEY_USER_EMAIL, "user@phishguard.ai");
        return email != null ? email.trim().toLowerCase() : "user@phishguard.ai";
    }

    public static String getUserName(Context context) {
        return getPrefs(context).getString(KEY_USER_NAME, "Protected User");
    }

    public static String getSessionToken(Context context) {
        return getPrefs(context).getString(KEY_SESSION_TOKEN, "PG-ACTIVE");
    }

    public static void logout(Context context) {
        SharedPreferences.Editor editor = getPrefs(context).edit();
        editor.putBoolean(KEY_IS_LOGGED_IN, false);
        editor.remove(KEY_USER_EMAIL);
        editor.remove(KEY_USER_NAME);
        editor.remove(KEY_SESSION_TOKEN);
        editor.remove(KEY_LOGIN_TIME);
        editor.apply();
    }

    private static String extractNameFromEmail(String email) {
        if (email != null && email.contains("@")) {
            String prefix = email.split("@")[0];
            if (!prefix.isEmpty()) {
                return prefix.substring(0, 1).toUpperCase() + prefix.substring(1);
            }
        }
        return "Protected User";
    }
}
