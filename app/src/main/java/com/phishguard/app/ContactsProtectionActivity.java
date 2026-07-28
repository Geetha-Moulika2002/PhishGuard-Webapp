package com.phishguard.app;

import android.os.Bundle;
import android.text.InputType;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import java.util.List;

public class ContactsProtectionActivity extends AppCompatActivity {

    private LinearLayout layoutTrustedContacts;
    private TextView tvEmergencyContactNumber;
    private Button btnAddTrustedContact, btnSetEmergencyGuardian;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_contacts_protection);

        layoutTrustedContacts = findViewById(R.id.layoutTrustedContacts);
        tvEmergencyContactNumber = findViewById(R.id.tvEmergencyContactNumber);
        btnAddTrustedContact = findViewById(R.id.btnAddTrustedContact);
        btnSetEmergencyGuardian = findViewById(R.id.btnSetEmergencyGuardian);

        renderTrustedContacts();

        if (btnSetEmergencyGuardian != null) {
            btnSetEmergencyGuardian.setOnClickListener(v -> showEditEmergencyDialog());
        }

        if (btnAddTrustedContact != null) {
            btnAddTrustedContact.setOnClickListener(v -> showAddTrustedDialog());
        }
    }

    private void renderTrustedContacts() {
        if (tvEmergencyContactNumber != null) {
            tvEmergencyContactNumber.setText(PhishGuardDataStore.getInstance().getEmergencyContact());
        }

        if (layoutTrustedContacts != null) {
            layoutTrustedContacts.removeAllViews();
            List<PhishGuardDataStore.TrustedContact> list = PhishGuardDataStore.getInstance().getTrustedContacts();

            for (PhishGuardDataStore.TrustedContact contact : list) {
                TextView tv = new TextView(this);
                tv.setText("• " + contact.name + " (" + contact.phone + ")");
                tv.setTextColor(android.graphics.Color.parseColor("#E2E8F0"));
                tv.setTextSize(14);
                tv.setPadding(0, 6, 0, 6);
                layoutTrustedContacts.addView(tv);
            }
        }
    }

    private void showEditEmergencyDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Set Emergency Guardian Contact");
        builder.setMessage("Enter guardian mobile phone number to receive automated emergency SMS warnings:");

        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_PHONE);
        input.setText(PhishGuardDataStore.getInstance().getEmergencyContact());
        builder.setView(input);

        builder.setPositiveButton("Save", (dialog, which) -> {
            String phone = input.getText().toString().trim();
            if (!phone.isEmpty()) {
                PhishGuardDataStore.getInstance().setEmergencyContact(phone);
                renderTrustedContacts();
                Toast.makeText(this, "Emergency Guardian Saved", Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    private void showAddTrustedDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Add Trusted Whitelist Contact");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 20);

        final EditText inputName = new EditText(this);
        inputName.setHint("Contact Name (e.g. Mom)");
        layout.addView(inputName);

        final EditText inputPhone = new EditText(this);
        inputPhone.setHint("Phone Number");
        inputPhone.setInputType(InputType.TYPE_CLASS_PHONE);
        layout.addView(inputPhone);

        builder.setView(layout);

        builder.setPositiveButton("Add", (dialog, which) -> {
            String name = inputName.getText().toString().trim();
            String phone = inputPhone.getText().toString().trim();
            if (!name.isEmpty() && !phone.isEmpty()) {
                PhishGuardDataStore.getInstance().addTrustedContact(new PhishGuardDataStore.TrustedContact(name, phone));
                renderTrustedContacts();
                Toast.makeText(this, "Trusted Whitelist Contact Added", Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }
}
