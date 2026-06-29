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

// Native: on-device IS Nila's brain now (no cloud). Load the side-loaded V2 4B GGUF (therapy-tuned
// Gemma-3-4B QLoRA) and register the llama.cpp backend on every native launch — if no model is present
// initLlama fails and isLocalLlmReady() stays false, so the chat is the calm offline companion until a
// model is installed. Code-split so llama-cpp-capacitor never enters the web bundle.
// (capgoLlmAdapter.ts is kept in the tree as the instant 1B rollback — swap the import to revert.)
if (Capacitor.isNativePlatform()) {
  Promise.all([
    import("./services/llamaCppLlmAdapter"),
    import("./services/localLlm"),
  ]).then(([{ createLlamaCppBackend }, { registerLocalLlmBackend }]) => {
    registerLocalLlmBackend(createLlamaCppBackend());
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
