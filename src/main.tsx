import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AgeGate from './components/AgeGate.tsx';
import SecureGate from './components/SecureGate.tsx';
import IdentityGate from './components/IdentityGate.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
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
    const [{ transformersEmbedder, warmCrisisEmbedder }, cc, pr, er, af] = await Promise.all([
      import("./services/crisisEmbedder"),
      import("./services/crisisClassifier"),
      import("./services/psychoedRetrieval"),
      import("./services/exemplarRetrieval"),
      import("./services/affectHead"),
    ]);
    cc.setCrisisEmbedder(transformersEmbedder);
    cc.setCrisisClassifierEnabled(true);
    pr.setPsychoedEmbedder(transformersEmbedder);
    er.setExemplarEmbedder(transformersEmbedder); // dynamic few-shot for the on-device reply (shares the MiniLM)
    // Orb affect accent (2026-07-19, Phase 1): reuses this SAME shared MiniLM instance — no second model
    // load. The embedder is wired now so the head is ready to use, but setAffectAccentEnabled(true) is
    // deliberately NOT called here — it's a manual flip after an on-device sanity pass (see
    // docs/superpowers/plans/2026-07-19-orb-affect-accent.md Task 9 / the spec's Rollout section).
    af.setAffectEmbedder(transformersEmbedder);
    // Warm the MiniLM shortly after startup, at idle, so the FIRST crisis check on ANY surface (episode,
    // voice call, self-compassion — not just chat, which warms on mount) doesn't degrade to keyword-only
    // during a cold load. Idle-deferred so it never delays first paint; safe on the plugin thread (this is
    // Transformers.js in the WebView, NOT the native llama.cpp binding).
    const warm = () => { void warmCrisisEmbedder().catch(() => {}); };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(warm, { timeout: 4000 }); else setTimeout(warm, 2500);
  } catch {
    /* classifier/affect head stay off → keyword-only §9 gate, no affect accent, no regression */
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

// Capture a daily phone-behaviour snapshot (screen-time, app categories, location variance) and persist
// it to IndexedDB. Runs after idle at app start, then every 4 hours while the app is alive, so the
// pattern-insights engine (patternInsights.ts) has data to correlate against mood. Gracefully handles
// non-Android / permission-missing — the snapshot always returns a valid object with nulls for
// unavailable signals. Best-effort, never blocks the UI.
const CAPTURE_INTERVAL_MS = 4 * 3600_000;
let captureTimer: ReturnType<typeof setInterval> | null = null;
void (async () => {
  try {
    const [{ getTodaySnapshot }, { saveSnapshot }] = await Promise.all([
      import("./services/phoneBehaviour"),
      import("./db/behaviourDb"),
    ]);
    const capture = async () => {
      try {
        const snapshot = await getTodaySnapshot();
        await saveSnapshot(snapshot);
      } catch { /* best-effort — capture failure is non-critical */ }
    };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(() => { void capture(); captureTimer = setInterval(capture, CAPTURE_INTERVAL_MS); }, { timeout: 8000 });
    else setTimeout(() => { void capture(); captureTimer = setInterval(capture, CAPTURE_INTERVAL_MS); }, 6000);
  } catch { /* best-effort — phone-behaviour capture is non-critical */ }
})();

// Populate "What Nila remembers" with durable, on-device memory consolidated from the
// day's activity. runReflection (the durable-insight generator) was previously computed but
// NEVER CALLED in production — so the reflection memory that makes that screen feel alive
// was dead. Fire-and-forget at idle; it's throttled to once/local-day internally and tolerates
// an unready model (retries later). Native-gated: the real model runs there; the web reflect
// backend would only consume the day without producing real insights.
void (async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [{ runReflection }, { buildReflectionDigest }] = await Promise.all([
      import("./services/nilaInsights"),
      import("./services/nilaContext"),
    ]);
    const reflect = () => { void runReflection(buildReflectionDigest()).catch(() => {}); };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(reflect, { timeout: 30000 });
    else setTimeout(reflect, 20000);
  } catch { /* best-effort — memory consolidation is non-critical */ }
})();

// Clean up the capture timer when the app is about to be unloaded (prevents leaks in dev HMR).
window.addEventListener("beforeunload", () => { if (captureTimer) clearInterval(captureTimer); });

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

// Optional: register a free API LLM backend when explicitly enabled via Vite env variables.
// Useful for testing against a cloud model (e.g., OpenAI) without relying on on‑device
// inference. The backend respects the same {@link LocalLlmBackend} contract.
// DEV-gated like the Ollama block above: a release build must NEVER be able to route the
// conversation to a remote endpoint via a build-time env var — the only sanctioned cloud path is
// the user-consented Settings tier at the localLlm seam. The DEV gate also lets Vite tree-shake
// the adapter chunk out of production bundles entirely.
if ((import.meta as any).env?.DEV && (import.meta as any).env?.VITE_USE_FREE_API_LLM) {
  Promise.all([
    import("./services/freeApiLlmAdapter"),
    import("./services/localLlm"),
  ]).then(([{ createFreeApiBackend }, { registerLocalLlmBackend }]) => {
    const apiUrl = (import.meta as any).env?.VITE_FREE_API_URL ?? "https://api.openai.com/v1/chat/completions";
    const apiKey = (import.meta as any).env?.VITE_FREE_API_KEY ?? "";
    registerLocalLlmBackend(createFreeApiBackend(apiUrl, apiKey));
  });
}

// The opt-in cloud API tier needs NO boot-time registration: localLlm.ts consults the user's
// Settings preference (cloudApi.ts) LIVE on every conversational call, so the toggle takes effect
// on the next message. (A previous boot-time registration here RACED the native model load for the
// single backend slot — whichever async chain resolved last won — so cloud silently never activated
// on device. Routing at the seam removes the race entirely.)

// Native: on-device IS Nila's brain (no cloud). A size-verified on-disk model — by default the stock
// Gemma-3-1B-it GGUF (a fine-tuned V2 4B GGUF is an optional revert/side-load), run via llama.cpp — is
// the brain. findInstalledModel only returns a file whose byte length matches the catalog exactly, so a
// truncated/corrupt file is never loaded. If no valid model is on disk yet, mark the brain as needing
// first-run setup so the user can download the model in-app (no adb). If nothing is ready, isLocalLlmReady() stays false and the chat is
// the calm offline companion. (No Google/Gemini-Nano path — the app has ZERO proprietary deps so it
// stays cleanly FOSS for the F-Droid ecosystem.) Code-split so the native bindings never enter the web bundle.
if (Capacitor.isNativePlatform()) {
  import("./services/localLlm").then(async () => {
    try {
      const { findInstalledModel, registerDownloadedBackend, cleanupOrphanedModelFiles, backgroundVerifyIfNeeded } = await import("./services/modelDownload");
      const installed = await findInstalledModel();
      // Reclaim disk from model files left by a since-removed catalog entry (a swapped-out model's
      // orphaned .part). Fire-and-forget after the install check so it never delays brain routing.
      void cleanupOrphanedModelFiles().catch(() => {});
      if (installed) {
        await registerDownloadedBackend(installed);
        // Close the recovery-path SHA bypass: if this file was promoted by the self-heal (never marked
        // verified), re-hash it in the BACKGROUND. On a definitive mismatch the file is deleted — send the
        // user back to first-run setup for a clean re-download. Never blocks the chat that's now usable.
        void backgroundVerifyIfNeeded(installed).then(async (r) => {
          if (r === "quarantined") {
            const { setBrainStatus } = await import("./services/brainSetup");
            setBrainStatus("needs-setup");
          }
        }).catch(() => {});
        return;
      }
    } catch {
      /* nothing valid on disk → first-run setup */
    }
    const { setBrainStatus, shouldRespectModelDownloadSkip } = await import("./services/brainSetup");
    if (!shouldRespectModelDownloadSkip()) {
      setBrainStatus("needs-setup");
    }
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
  // Conversational check-in capture: shortly after boot (any time of day), if there's a conversation and no
  // check-in yet today, let the on-device model draft one from what the person already told Nila — so they
  // can confirm with one tap instead of filling the mood form. Guarded + §9-gated inside maybeDraftCheckin;
  // uses the shared model thread (defers if busy) so it never competes with interactive chat.
  const scheduleCheckinDraft = () => {
    setTimeout(() => {
      Promise.all([
        import("./services/checkinDraft"),
        import("./services/sessionChat"),
      ]).then(([{ maybeDraftCheckin }, { getSessionChat }]) => {
        const turns = getSessionChat().filter((m) => m.role === "user").map((m) => m.content);
        void maybeDraftCheckin(turns).catch(() => {});
      }).catch(() => {});
    }, 45_000); // after the reflection warm-up; model likely ready and the user likely idle
  };

  // Defer off the critical path so first paint is never delayed by these imports
  const ric = (globalThis as any).requestIdleCallback as undefined | ((cb: () => void, o?: any) => number);
  const schedule = () => { scheduleReflection(); scheduleCheckinDraft(); };
  if (ric) ric(schedule, { timeout: 30_000 });
  else setTimeout(schedule, 15_000);
// Fire-and-forget GitHub auto‑update check (Android only)
if (Capacitor.isNativePlatform()) {
  import("./services/autoUpdate").then(({ checkForGitHubUpdate }) => {
    void checkForGitHubUpdate();
  }).catch(() => {});
}
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
    <ErrorBoundary name="root" onError={(err: Error, info: React.ErrorInfo) => console.error("[ErrorBoundary:root] caught:", err, info)}>
      <AgeGate>
        <SecureGate>
          <IdentityGate>
            <App />
          </IdentityGate>
        </SecureGate>
      </AgeGate>
    </ErrorBoundary>
  </StrictMode>,
);
