import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
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
    const [{ transformersEmbedder }, cc] = await Promise.all([
      import("./services/crisisEmbedder"),
      import("./services/crisisClassifier"),
    ]);
    cc.setCrisisEmbedder(transformersEmbedder);
    cc.setCrisisClassifierEnabled(true);
  } catch {
    /* classifier stays off → keyword-only §9 gate, no regression */
  }
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

// Native: on-device IS Nila's brain (no cloud). QUALITY-FIRST: a size-verified on-disk model — the
// fine-tuned V2 4B GGUF (side-loaded OR downloaded in-app), run via llama.cpp — is the brain whenever
// present. Only if there's NO valid local model do we fall back to Gemini Nano (Gemma-4 lineage,
// provided by Android AICore) as a graceful bridge so a fresh install isn't brain-dead; and if there's
// no Nano either, mark the brain as needing first-run setup so the user can download the 4B (no adb).
// If none is ready, isLocalLlmReady() stays false and the chat is the calm offline companion.
// Code-split so the native bindings never enter the web bundle.
if (Capacitor.isNativePlatform()) {
  import("./services/localLlm").then(async ({ registerLocalLlmBackend }) => {
    // 1. PREFER the local 4B specialist (the user's quality choice). findInstalledModel only returns a
    //    file whose byte length matches the catalog exactly, so a truncated/corrupt file is never loaded.
    try {
      const { findInstalledModel, registerDownloadedBackend } = await import("./services/modelDownload");
      const installed = await findInstalledModel();
      if (installed) {
        await registerDownloadedBackend(installed);
        return;
      }
    } catch {
      /* nothing valid on disk → try Nano, then first-run setup */
    }
    // 2. No local model: Gemini Nano as a bridge brain. If only 'downloadable', ask AICore to provision
    //    it in the background (it fetches when the device is charging + on Wi-Fi + idle); it becomes
    //    'available' on a later launch.
    try {
      const { LocalLLM } = await import("@capacitor/local-llm");
      const { status } = await LocalLLM.systemAvailability();
      if (status === "available") {
        const { createNanoBackend } = await import("./services/nanoLlmAdapter");
        registerLocalLlmBackend(createNanoBackend());
        return;
      }
      if (status === "downloadable") {
        LocalLLM.download().catch(() => {});
      }
    } catch {
      /* no Nano on this device */
    }
    // 3. Neither: first-run setup → download the 4B in-app (no adb).
    const { setBrainStatus } = await import("./services/brainSetup");
    setBrainStatus("needs-setup");
  }).catch(() => {});
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
    <SecureGate>
      <IdentityGate>
        <App />
      </IdentityGate>
    </SecureGate>
  </StrictMode>,
);
