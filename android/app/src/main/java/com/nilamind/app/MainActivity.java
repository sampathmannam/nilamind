package com.nilamind.app;

import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

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
