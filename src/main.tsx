import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AgeGate from './components/AgeGate.tsx';
import SecureGate from './components/SecureGate.tsx';
import IdentityGate from './components/IdentityGate.tsx';
import { Capacitor } from '@capacitor/core';
import { initTheme } from './services/theme';
import './index.css';

initTheme(); // apply the saved System/Light/Dark choice before first paint

// Track B: wire the on-device crisis classifier into the §9 input gate. Code-split + lazy (Transformers.js +
// the bundled MiniLM load only on the first crisis check, so no app-startup cost) and FAIL-CLOSED — any load
// error leaves the gate as the keyword scanner (no regression). Enabling it makes §9 catch the euphemistic
// crises the keyword list misses (~40% of real disclosures). See crisisClassifier.ts / crisisEmbedder.ts.
void (async () => {
  try {
    const [{ transformersEmbedder, warmCrisisEmbedder }, cc, pr] = await Promise.all([
      import("./services/crisisEmbedder"),
      import("./services/crisisClassifier"),
      import("./services/psychoedRetrieval"),
    ]);
    cc.setCrisisEmbedder(transformersEmbedder);
    cc.setCrisisClassifierEnabled(true);
    pr.setPsychoedEmbedder(transformersEmbedder);
    // Warm the MiniLM shortly after startup, at idle, so the FIRST crisis check on ANY surface (episode,
    // voice call, self-compassion — not just chat, which warms on mount) doesn't degrade to keyword-only
    // during a cold load. Idle-deferred so it never delays first paint; safe on the plugin thread (this is
    // Transformers.js in the WebView, NOT the native llama.cpp binding).
    const warm = () => { void warmCrisisEmbedder().catch(() => {}); };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(warm, { timeout: 4000 }); else setTimeout(warm, 2500);
  } catch {
    /* classifier stays off → keyword-only §9 gate, no regression */
  }
})();

// Prune old typing/voice session records at idle so the on-device stores can't grow without bound
// (audit 2.19: the 30-day retention was implemented but never called). Best-effort, non-blocking.
void (async () => {
  try {
    const [{ pruneOldSessions }, { pruneVoiceSessions }] = await Promise.all([
      import("./services/typingPatterns"),
      import("./services/voicePatterns"),
    ]);
    const prune = () => { try { pruneOldSessions(); pruneVoiceSessions(); } catch { /* best-effort */ } };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(prune, { timeout: 6000 }); else setTimeout(prune, 4000);
  } catch { /* best-effort — pruning is not critical */ }
})();

// Dev-only: register the Ollama backend so the on-device path can be tested on desktop without
// the phone. Vite tree-shakes this entire block out of production builds (import.meta.env.DEV
// resolves to `false` at build time, so the dynamic import is never bundled).
if ((import.meta as any).env?.DEV) {
  Promise.all([
    import("./services/ollamaLlmAdapter"),
    import("./services/localLlm"),
  ]).then(([{ createOllamaBackend }, { registerLocalLlmBackend }]) => {
    registerLocalLlmBackend(createOllamaBackend());
  });
}

// Native: on-device IS Nila's brain (no cloud). A size-verified on-disk model — the fine-tuned V2 4B
// GGUF (side-loaded OR downloaded in-app), run via llama.cpp — is the brain. findInstalledModel only
// returns a file whose byte length matches the catalog exactly, so a truncated/corrupt file is never
// loaded. If no valid model is on disk yet, mark the brain as needing first-run setup so the user can
// download the 4B in-app (no adb). If nothing is ready, isLocalLlmReady() stays false and the chat is
// the calm offline companion. (No Google/Gemini-Nano path — the app has ZERO proprietary deps so it
// stays cleanly FOSS for the F-Droid ecosystem.) Code-split so the native bindings never enter the web bundle.
if (Capacitor.isNativePlatform()) {
  import("./services/localLlm").then(async () => {
    try {
      const { findInstalledModel, registerDownloadedBackend } = await import("./services/modelDownload");
      const installed = await findInstalledModel();
      if (installed) {
        await registerDownloadedBackend(installed);
        return;
      }
    } catch {
      /* nothing valid on disk → first-run setup */
    }
    const { setBrainStatus } = await import("./services/brainSetup");
    setBrainStatus("needs-setup");
  }).catch(() => {});

  // Async between-sessions brain: run the overnight reflection when the app is idle
  // (opened in the 2am-6am window) or after 5 minutes of idle. Fire-and-forget —
  // never blocks the UI. §9-gated inside runAsyncReflection; skips silently if the
  // model isn't ready, no user turns exist, or the session was a crisis.
  const scheduleReflection = () => {
    const now = new Date();
    const hour = now.getHours();
    // In the overnight window: run after a short idle delay
    if (hour >= 2 && hour <= 6) {
      setTimeout(() => {
        import("./services/asyncReflection").then(({ runAsyncReflection }) => {
          void runAsyncReflection().catch(() => {});
        }).catch(() => {});
      }, 30_000); // 30s after boot, enough for the model to warm
    }
  };
  // Defer off the critical path so first paint is never delayed by this import
  const ric = (globalThis as any).requestIdleCallback as undefined | ((cb: () => void, o?: any) => number);
  if (ric) ric(scheduleReflection, { timeout: 30_000 });
  else setTimeout(scheduleReflection, 15_000);
} else if (!(import.meta as any).env?.DEV) {
  // WEB front door (rung 0): there is no llama.cpp brain in a browser, so register the deterministic,
  // LLM-free reflection backend. isLocalLlmReady() then becomes true and sendToNila routes to it instead
  // of returning the silent-offline empty reply — Nila "listens" (warmth from scripts) while the app's
  // deterministic tools + §9 still carry the actual help. No model, no network. See nilaReflect.ts.
  // (DEV is excluded so desktop dev still points at the Ollama backend registered above.)
  Promise.all([
    import("./services/localLlm"),
    import("./services/nilaReflect"),
  ]).then(([{ registerLocalLlmBackend }, { createReflectBackend }]) => {
    registerLocalLlmBackend(createReflectBackend());
  }).catch(() => { /* stays silent-offline on failure — no regression */ });
}

// Service-worker policy. WEB keeps the PWA (offline). The native Capacitor WebView must NOT run a
// service worker: it serves bundled assets directly, and a leftover SW precache makes it show an OLD
// app shell after an APK update (the recurring "my fix didn't show on device" bug). So on native we
// unregister any existing SW and clear its caches; on web we register sw.js on load.
if ("serviceWorker" in navigator) {
  if (Capacitor.isNativePlatform()) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    if (typeof caches !== "undefined") caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
  } else {
    window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AgeGate>
      <SecureGate>
        <IdentityGate>
          <App />
        </IdentityGate>
      </SecureGate>
    </AgeGate>
  </StrictMode>,
);
