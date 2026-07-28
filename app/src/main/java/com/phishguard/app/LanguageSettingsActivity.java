package com.phishguard.app;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class LanguageSettingsActivity extends AppCompatActivity {

    private Button btnLangEnglish, btnLangHindi, btnLangSpanish;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_language_settings);

        btnLangEnglish = findViewById(R.id.btnLangEnglish);
        btnLangHindi = findViewById(R.id.btnLangHindi);
        btnLangSpanish = findViewById(R.id.btnLangSpanish);

        SharedPreferences prefs = getSharedPreferences("PhishGuardSettings", MODE_PRIVATE);
        String currentLang = prefs.getString("app_language", "English");

        highlightActiveLang(currentLang);

        if (btnLangEnglish != null) {
            btnLangEnglish.setOnClickListener(v -> setLanguage("English"));
        }
        if (btnLangHindi != null) {
            btnLangHindi.setOnClickListener(v -> setLanguage("Hindi (हिंदी)"));
        }
        if (btnLangSpanish != null) {
            btnLangSpanish.setOnClickListener(v -> setLanguage("Spanish (Español)"));
        }
    }

    private void setLanguage(String lang) {
        SharedPreferences prefs = getSharedPreferences("PhishGuardSettings", MODE_PRIVATE);
        prefs.edit().putString("app_language", lang).apply();
        highlightActiveLang(lang);
        Toast.makeText(this, "App language updated to " + lang, Toast.LENGTH_SHORT).show();
        finish();
    }

    private void highlightActiveLang(String lang) {
        if (btnLangEnglish != null) btnLangEnglish.setBackgroundResource(lang.contains("English") ? R.drawable.bg_button_primary : R.drawable.bg_card_dark);
        if (btnLangHindi != null) btnLangHindi.setBackgroundResource(lang.contains("Hindi") ? R.drawable.bg_button_primary : R.drawable.bg_card_dark);
        if (btnLangSpanish != null) btnLangSpanish.setBackgroundResource(lang.contains("Spanish") ? R.drawable.bg_button_primary : R.drawable.bg_card_dark);
    }
}
