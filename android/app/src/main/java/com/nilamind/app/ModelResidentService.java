package com.nilamind.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/**
 * Keep-resident foreground service.
 *
 * The ~2.3 GB on-device model is expensive to get into usable memory on a slow-storage phone
 * (~2 min per cold start — it's read off flash at ~10-20 MB/s; see docs/NILA_SPEED_PLAN.md). Once the
 * process is loaded + its page cache warmed (MainActivity.precacheModelWeights), the costly part is done —
 * but Android evicts a BACKGROUNDED process (and its page cache) under memory pressure, forcing the whole
 * ~2 min re-load on the next open. This service exists ONLY to hold the process at foreground priority so
 * that doesn't happen: every reply after the first-per-reboot stays fast.
 *
 * It does NO work of its own (it never touches the llama plugin — running inference in the background is the
 * warm-starvation trap). Android requires any foreground service to post an ongoing notification; we keep it
 * gentle and low-priority — a warm "Nila's here" rather than a cold "running" notice. On a tight-RAM device
 * Android may still evict under extreme pressure (benefit is partial, never harmful).
 */
public class ModelResidentService extends Service {
  private static final String CHANNEL_ID = "nila_resident";
  private static final int NOTIF_ID = 4201;

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    // Must call startForeground promptly (within ~5s) or the system kills the app.
    startForeground(NOTIF_ID, buildNotification());
    return START_STICKY; // re-create if the system kills the service, so keep-resident survives
  }

  private Notification buildNotification() {
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel ch = new NotificationChannel(
          CHANNEL_ID, "Nila stays ready", NotificationManager.IMPORTANCE_LOW); // LOW = quiet, no sound/peek
      ch.setDescription("Keeps Nila loaded so she can reply quickly.");
      ch.setShowBadge(false);
      if (nm != null) nm.createNotificationChannel(ch);
    }

    Intent open = new Intent(this, MainActivity.class);
    open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pi = PendingIntent.getActivity(
        this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Notification.Builder b = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        ? new Notification.Builder(this, CHANNEL_ID)
        : new Notification.Builder(this);
    return b
        .setContentTitle("Nila's here whenever you need")
        .setContentText("Tap to talk — she's ready.")
        .setSmallIcon(R.drawable.ic_stat_nila)
        .setContentIntent(pi)
        .setOngoing(true)
        .build();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null; // not a bound service
  }
}
