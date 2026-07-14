package com.nilamind.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Process;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileInputStream;

public class MainActivity extends BridgeActivity {

  // The on-device model file warmed at launch — must match the llama.cpp adapter's path
  // (llamaCppLlmAdapter.ts DEFAULT_MODEL_PATH).
  private static final String MODEL_FILE = "gemma-3-1b-it-Q4_K_M.gguf";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    createNotificationChannels();
    precacheModelWeights();
    startResidentServiceIfModelPresent();
  }

  // ── World-class notification channels (Phase 20) ───────────────────────────
  // Android 8+ requires every notification to be posted to a channel. These give the
  // user OS-level granularity: they can silence medication reminders but keep check-ins
  // audible, or vice versa. Each channel maps to a user-facing notification category.
  private void createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (nm == null) return;

    // Gentle daily nudges — silent, low-priority, never interrupt
    NotificationChannel gentle = new NotificationChannel(
      "nila_gentle", "Gentle nudges", NotificationManager.IMPORTANCE_LOW);
    gentle.setDescription("Daily check-in prompts, wind-down reminders, and weekly digests. Silent and non-interruptive.");
    gentle.setShowBadge(false);
    gentle.enableVibration(false);
    gentle.setSound(null, null);
    nm.createNotificationChannel(gentle);

    // Medication reminders — high-importance, must be noticed
    NotificationChannel medication = new NotificationChannel(
      "nila_medication", "Medication reminders", NotificationManager.IMPORTANCE_HIGH);
    medication.setDescription("Medication schedule alerts. These are health-critical and appear with sound.");
    medication.setShowBadge(true);
    nm.createNotificationChannel(medication);

    // Nila replied — default importance, gentle ping when backgrounded
    NotificationChannel reply = new NotificationChannel(
      "nila_reply", "Nila's replies", NotificationManager.IMPORTANCE_DEFAULT);
    reply.setDescription("A gentle ping when Nila has replied. Medium priority with short vibration.");
    reply.setShowBadge(false);
    nm.createNotificationChannel(reply);

    // Quick EMA check-ins — default importance
    NotificationChannel ema = new NotificationChannel(
      "nila_ema", "Quick check-ins", NotificationManager.IMPORTANCE_DEFAULT);
    ema.setDescription("2-minute micro-check-ins scattered through your day. Medium priority.");
    ema.setShowBadge(false);
    nm.createNotificationChannel(ema);

    // Crisis follow-up — high importance
    NotificationChannel crisis = new NotificationChannel(
      "nila_crisis", "Safety follow-ups", NotificationManager.IMPORTANCE_HIGH);
    crisis.setDescription("Post-crisis aftercare check-ins. These are time-sensitive safety prompts and appear with sound.");
    crisis.setShowBadge(true);
    nm.createNotificationChannel(crisis);
  }

  @Override
  public void onStart() {
    super.onStart();
  }

  // Keep-resident: once a model is on disk, hold the process at foreground priority (ModelResidentService)
  // so Android doesn't evict it + its warmed page cache between sessions → replies stay fast after the first
  // per reboot. Gated on the model existing, so first-run (no model yet) never shows the notification.
  private void startResidentServiceIfModelPresent() {
    try {
      final File model = new File(getExternalFilesDir(null), MODEL_FILE);
      if (!model.exists() || model.length() == 0) return;
      Intent svc = new Intent(this, ModelResidentService.class);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc);
      else startService(svc);
    } catch (Throwable t) {
      Log.w("NilaResident", "resident service not started: " + t.getMessage());
    }
  }

  // ── Cold-start mitigation ───────────────────────────────────────────────────
  // The ~2.3GB GGUF cold-mmaps on the FIRST inference, paging every weight in from flash
  // → a multi-minute first reply. Warm the OS page cache at launch by sequentially READING
  // the file on a low-priority background thread, so llama.cpp's later mmap page-faults hit
  // RAM instead of flash.
  //
  // CRITICAL: this is a plain FILE READ, NOT model inference. It must never call completion()
  // / the llama plugin — running inference in the background blocks Capacitor's single shared
  // plugin thread and starves STT/TTS (the warm-starvation lesson). Reading bytes touches no
  // plugin and stays on its own thread. Bytes are discarded into a reused buffer, so the app
  // heap never holds the model; the warmth lives in the kernel page cache (reclaimable under
  // memory pressure → on a low-RAM device the benefit may be partial, never harmful).
  private void precacheModelWeights() {
    final File model = new File(getExternalFilesDir(null), MODEL_FILE);
    new Thread(() -> {
      try {
        Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND);
        if (!model.exists() || model.length() == 0) return;
        long total = 0L;
        final long start = System.currentTimeMillis();
        final byte[] buf = new byte[8 * 1024 * 1024]; // 8MB chunks, reused (no heap blowup)
        try (FileInputStream in = new FileInputStream(model)) {
          int n;
          while ((n = in.read(buf)) != -1) total += n;
        }
        Log.i("NilaPrecache", "warmed " + (total / (1024 * 1024)) + "MB in "
            + (System.currentTimeMillis() - start) + "ms");
      } catch (Throwable t) {
        Log.w("NilaPrecache", "precache skipped: " + t.getMessage());
      }
    }, "nila-model-precache").start();
  }

  // ── Activity lifecycle ──────────────────────────────────────────────────────

  @Override
  public void onResume() {
    super.onResume();

    // ── WebChromeClient setup ──────────────────────────────────────────────
    // IMPORTANT: A bare WebChromeClient is required here — NOT BridgeWebChromeClient.
    // BridgeWebChromeClient's constructor calls registerForActivityResult, which is
    // illegal once the activity is STARTED (crashes in onResume with
    // IllegalStateException). A bare WebChromeClient is required here; the tradeoff
    // is losing Capacitor's console/file-chooser bridging on this client, which is
    // acceptable.
    //
    // We override ONLY onPermissionRequest, granting RESOURCE_AUDIO_CAPTURE
    // (and only that resource) when the WebView asks for it — this is required
    // so getUserMedia / SpeechRecognition can access the mic even after the OS
    // RECORD_AUDIO permission has been granted at the app level.
    Bridge bridge = getBridge();
    if (bridge != null && bridge.getWebView() != null) {
      bridge.getWebView().setWebChromeClient(
          new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
              // Selectively grant only RESOURCE_AUDIO_CAPTURE; any other
              // resource types (camera, MIDI, …) are left ungranted.
              // Do NOT call super — the bare WebChromeClient's default would
              // deny the request. The app only needs audio capture.
              String[] requested = request.getResources();
              boolean hasAudio = false;
              for (String r : requested) {
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                  hasAudio = true;
                  break;
                }
              }
              if (hasAudio) {
                // Grant only the audio resource, even if other resources
                // were requested alongside it, to follow least-privilege.
                request.grant(new String[]{ PermissionRequest.RESOURCE_AUDIO_CAPTURE });
              }
              // Non-audio requests: leave ungranted (no super call needed).
            }
          });
    }
  }
}
