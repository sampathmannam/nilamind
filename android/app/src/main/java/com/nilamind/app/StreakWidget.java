package com.nilamind.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * NilaMind home-screen widget (AUTOPILOT Phase 7).
 *
 * Shows the user's gentle check-in streak + a warm label and, on tap, opens the app to a quick
 * check-in. It reads only a small mirror written by the app via Capacitor Preferences
 * (SharedPreferences group "CapacitorStorage") — a day-count, a neutral label, and an emoji.
 * No emotions, intensities, or diary content are ever exposed to native storage; those stay in the
 * app's encrypted store. Tapping opens the app rather than writing in the background, precisely so
 * that all health data continues to flow only through the encrypted-at-rest path.
 */
public class StreakWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateWidget(context, appWidgetManager, id);
        }
    }

    static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String streak = prefs.getString("ma_widget_streak", "0");
        String label = prefs.getString("ma_widget_label", "Tap to check in");
        String emoji = prefs.getString("ma_widget_emoji", "🌱");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.streak_widget);

        String streakText = "NilaMind";
        try {
            int n = Integer.parseInt(streak.trim());
            if (n > 0) {
                streakText = n + (n == 1 ? " day streak" : " day streak");
            }
        } catch (NumberFormatException ignored) {
            // keep the neutral default
        }

        views.setTextViewText(R.id.widget_streak, streakText);
        views.setTextViewText(R.id.widget_label, label);
        views.setTextViewText(R.id.widget_emoji, emoji);

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) {
            launch = new Intent(context, MainActivity.class);
        }
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getActivity(context, 0, launch, flags);
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        manager.updateAppWidget(widgetId, views);
    }
}
