package com.nilamind.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * NilaMind quick voice check-in widget.
 *
 * Answers a Product Hunt launch-day request (docs/FEATURES_PLAN.md "User-requested" U1): one tap
 * from the home screen straight into Nila's voice input, for grounding moments that can't wait for
 * app navigation. Tapping opens the app via the nilamind://voice deep link, which App.tsx's
 * appUrlOpen listener routes straight to the Nila tab — one tap from the mic instead of wherever
 * the app last was.
 *
 * Deliberately does NOT capture audio from the widget itself (no foreground service, no
 * background mic access) — the mic tap stays an explicit in-app action, same as opening the app
 * normally, so first-run/permission/model-load states and the crisis-safety pipeline are never
 * bypassed. Reads no app data — this widget is stateless, unlike StreakWidget.
 */
public class QuickVoiceWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateWidget(context, appWidgetManager, id);
        }
    }

    static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quick_voice_widget);

        Intent launch = new Intent(Intent.ACTION_VIEW, Uri.parse("nilamind://voice"));
        launch.setPackage(context.getPackageName());
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getActivity(context, 0, launch, flags);
        views.setOnClickPendingIntent(R.id.quick_voice_widget_root, pending);

        manager.updateAppWidget(widgetId, views);
    }
}
