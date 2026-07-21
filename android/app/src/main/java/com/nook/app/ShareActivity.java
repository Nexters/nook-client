package com.nook.app;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

public class ShareActivity extends Activity {

    private static final String[][] MOCK_GROUPS = {
        { "cafe", "카페", "#F7D44C" },
        { "cinema", "독립영화관", "#4C9AF7" },
        { "lpbar", "LP바", "#2FA57B" },
        { "saturday", "토요일 모임 장소", "#8F7CF7" },
    };

    private final Set<String> selected = new HashSet<>();
    private String sharedText = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) sharedText = text;
        }

        setContentView(R.layout.activity_share);

        findViewById(R.id.share_dim).setOnClickListener(v -> finish());
        findViewById(R.id.btn_new_group).setOnClickListener(v -> openMainApp());
        findViewById(R.id.btn_save).setOnClickListener(v -> saveAndFinish());

        LinearLayout list = findViewById(R.id.group_list);
        for (String[] group : MOCK_GROUPS) {
            list.addView(buildGroupRow(group[0], group[1], group[2]));
        }
    }

    private View buildGroupRow(String id, String name, String colorHex) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(16);
        row.setPadding(pad, dp(14), pad, dp(14));

        View colorChip = new View(this);
        GradientDrawable chip = new GradientDrawable();
        chip.setColor(Color.parseColor(colorHex));
        chip.setCornerRadius(dp(4));
        colorChip.setBackground(chip);
        row.addView(colorChip, new LinearLayout.LayoutParams(dp(16), dp(16)));

        TextView label = new TextView(this);
        label.setText(name);
        label.setTextColor(Color.parseColor("#1A1A1A"));
        label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        label.setPadding(dp(14), 0, 0, 0);
        LinearLayout.LayoutParams labelParams =
            new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        row.addView(label, labelParams);

        TextView check = new TextView(this);
        check.setText("✓");
        check.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        check.setGravity(Gravity.CENTER);
        int checkSize = dp(24);
        LinearLayout.LayoutParams checkParams = new LinearLayout.LayoutParams(checkSize, checkSize);
        row.addView(check, checkParams);
        renderCheck(check, false);

        row.setOnClickListener(v -> {
            boolean nowSelected = !selected.contains(id);
            if (nowSelected) selected.add(id); else selected.remove(id);
            renderCheck(check, nowSelected);
        });
        return row;
    }

    private void renderCheck(TextView check, boolean isSelected) {
        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        circle.setColor(isSelected ? Color.parseColor("#1A1A1A") : Color.parseColor("#E5E6EA"));
        check.setBackground(circle);
        check.setTextColor(isSelected ? Color.WHITE : Color.parseColor("#B7BAC1"));
    }

    private void saveAndFinish() {
        try {
            SharedPreferences prefs = getSharedPreferences("nook_shares", MODE_PRIVATE);
            JSONArray pending = new JSONArray(prefs.getString("pending", "[]"));
            JSONObject entry = new JSONObject();
            entry.put("text", sharedText);
            entry.put("groups", new JSONArray(selected));
            entry.put("savedAt", System.currentTimeMillis());
            pending.put(entry);
            prefs.edit().putString("pending", pending.toString()).apply();
        } catch (Exception ignored) {
        }
        finish();
    }

    private void openMainApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra("sharedText", sharedText);
        startActivity(intent);
        finish();
    }

    private int dp(int value) {
        return Math.round(
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics()));
    }
}
