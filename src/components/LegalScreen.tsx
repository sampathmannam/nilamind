import { useState } from "react";
import { useLanguage, t } from "../services/i18n";
import { Shield, FileText, Scale } from "lucide-react";

// i18n scope note (2026-08-06): only the CHROME below (tab labels, heading, "last updated") is
// localized. PRIVACY_CONTENT/TERMS_CONTENT/OSS_CONTENT stay English-only deliberately -- this is
// genuine legal text (privacy policy, terms of service, liability/governing-law clauses, and
// OSS license attributions that must not be altered from their original wording for license
// compliance). Machine-translating binding legal text without professional/legal review carries
// real risk; that's a distinct workstream from UI copy localization.

type LegalTab = "privacy" | "terms" | "oss";

const PRIVACY_CONTENT = [
  { heading: "The short version", body: [
    "No account. No email, no password, no sign-up. Your space is identified only by a recovery phrase that you hold.",
    "Your entries stay on your device, encrypted at rest wherever your device supports a secure keystore. Check-ins, diary entries, screening scores, and settings are stored locally and are not sent to us or anyone else.",
    "We have no server. There is no NilaMind backend and no account database.",
    "Even the AI companion (Nila) runs on your device.",
  ]},
  { heading: "What is stored, and where", body: [
    "Everything you create in the app — mood check-ins, diary cards, PHQ-9/GAD-7 scores, values, reminder preferences — is stored only on your device, in an encrypted store. It is decrypted only inside the app, using a key derived from your device or an optional PIN. If you uninstall the app or wipe your data, it is gone (so keep your recovery phrase if you want to restore).",
    "On the rare device or browser where a secure keystore (Web Crypto / IndexedDB) isn't available, the app falls back to storing your data locally but unencrypted — rather than locking you out of your safety plan. It still never leaves your device, and the in-app Privacy screen shows a clear warning when this happens.",
  ]},
  { heading: "The AI companion (Nila) runs on your device", body: [
    "Nila — the AI companion — runs entirely on your device. The language model executes locally on your phone, so your messages to Nila are never sent to us, to any server, or to any third-party AI provider.",
    "Safety scanning for crisis language also happens on your device.",
    "There is no cloud AI, no API call, and no account behind Nila — the model answers locally.",
    "Everything works offline. Chat, screening, behavioural activation, values work, grounding, diary, voice check-ins, and the dashboard all run fully on-device.",
    "Nothing you say to Nila leaves your phone.",
  ]},
  { heading: "What we do NOT do", body: [
    "We do not collect analytics, advertising identifiers, or location for tracking.",
    "We do not sell or share your data.",
    "We do not build a profile of you on a server.",
  ]},
  { heading: "Permissions", body: [
    "Internet — not used to send your conversations or entries anywhere; Nila runs on-device.",
    "Notifications — only for the gentle reminders you opt into.",
    "Microphone — only when you choose to answer a check-in or talk to Nila by voice.",
  ]},
  { heading: "Play Data Safety summary", body: [
    "Data collected: none. Nothing you create — including your messages to Nila — leaves the device.",
    "Data shared/sold: none.",
    "Data stored on device: your check-ins, diary, scores, and settings — encrypted.",
    "Data deletion: uninstalling the app or using \"Delete everything\" in the app removes your local data.",
  ]},
  { heading: "Not a medical device", body: [
    "NilaMind is a self-help support tool. It is not a medical device, not a diagnostic tool, and not a replacement for professional care. If you are in crisis, please use the in-app crisis resources or contact your local emergency services.",
  ]},
  {
    heading: "Contact",
    body: [
      "Questions about this policy: please open an issue at https://github.com/sampathmannam/nilamind/issues.",
    ],
  },
];

const TERMS_CONTENT = [
  { heading: "Acceptance of Terms", body: [
    "By using NilaMind (\"the App\"), you agree to these Terms of Service. If you do not agree, please do not use the App.",
  ]},
  { heading: "Age Requirement", body: [
    "The App is intended for users 18 years and older. By using the App, you confirm you are at least 18 years of age.",
  ]},
  { heading: "Wellness Tool, Not Therapy", body: [
    "NilaMind is a self-help wellness companion. It is not a licensed therapist, psychologist, psychiatrist, or medical professional. It does not provide medical advice, diagnosis, or treatment. Always seek the advice of a qualified mental health professional with any questions about a medical condition.",
    "The App is not intended for use in a mental health crisis. In an emergency, use the in-app crisis resources or contact your local emergency services.",
  ]},
  { heading: "No Professional Relationship", body: [
    "Use of the App does not create a therapist-patient, doctor-patient, or any other professional relationship. The AI companion is a tool for self-reflection and wellness support, not a substitute for professional care.",
  ]},
  { heading: "Privacy", body: [
    "All your data stays on your device. The App has no backend servers, no account database, and no third-party analytics. Your conversations with Nila are never sent anywhere. See the Privacy Policy tab for full details.",
  ]},
  { heading: "Disclaimer of Warranties", body: [
    "The App is provided \"as is\" without warranty of any kind, either express or implied. We do not warrant that the App will be uninterrupted, error-free, or meet your specific requirements.",
  ]},
  { heading: "Limitation of Liability", body: [
    "To the fullest extent permitted by law, NilaMind's authors and contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.",
    "The App is an open-source project provided for free under the Apache 2.0 license. You use it at your own risk.",
  ]},
  { heading: "Open Source", body: [
    "NilaMind is open-source software licensed under Apache-2.0. You are free to view, modify, and distribute the source code under the terms of that license.",
  ]},
  { heading: "Changes to Terms", body: [
    "These terms may be updated from time to time. Continued use of the App after changes constitutes acceptance of the new terms.",
  ]},
  { heading: "Governing Law", body: [
    "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.",
  ]},
];

const OSS_CONTENT = [
  { heading: "llama.cpp", body: ["MIT License — High-performance LLM inference. Copyright (c) 2023 Georgi Gerganov."] },
  { heading: "Qwen2.5", body: ["Apache-2.0 License — Language model by Alibaba Cloud. Copyright The Qwen Team."] },
  { heading: "React", body: ["MIT License — UI library. Copyright (c) Meta Platforms, Inc."] },
  { heading: "Capacitor", body: ["MIT License — Native bridge. Copyright (c) Ionic."] },
  { heading: "Vosk", body: ["Apache-2.0 License — Offline speech recognition. Copyright Alpha Cephei Inc."] },
  { heading: "ONNX Runtime Web", body: ["MIT License — ML model inference. Copyright (c) Microsoft Corporation."] },
  { heading: "Transformers.js", body: ["Apache-2.0 License — ML pipeline runtime. Copyright (c) Hugging Face."] },
  { heading: "Dexie.js", body: ["Apache-2.0 License — IndexedDB wrapper. Copyright (c) David Fahlander."] },
  { heading: "TailwindCSS", body: ["MIT License — Utility CSS framework. Copyright (c) Tailwind Labs Inc."] },
  { heading: "Lucide", body: ["ISC License — Icon library. Copyright (c) Lucide Contributors."] },
  { heading: "Fontsource", body: ["OFL-1.1 License — Self-hosted fonts."] },
  { heading: "OnnxRuntimeNode", body: ["MIT License — ONNX Runtime Node.js bindings."] },
];

export default function LegalScreen() {
  const [tab, setTab] = useState<LegalTab>("privacy");
  useLanguage();

  const tabs: { id: LegalTab; label: string; Icon: React.ElementType }[] = [
    { id: "privacy", label: t("privacyPolicy"), Icon: Shield },
    { id: "terms", label: t("legal_termsTab"), Icon: Scale },
    { id: "oss", label: t("legal_ossTab"), Icon: FileText },
  ];

  const content = tab === "privacy" ? PRIVACY_CONTENT : tab === "terms" ? TERMS_CONTENT : OSS_CONTENT;

  return (
    <div className="space-y-5 max-w-md mx-auto text-ink pb-8" id="legal-screen">
      <div>
        <h1 className="text-xl font-semibold text-ink font-sans tracking-tight">{t("sec_legal")}</h1>
        <p className="text-xs text-ink-muted mt-1">{t("sec_legalSub")}</p>
      </div>

      <div className="flex gap-1.5 border-b border-line pb-0">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer ${
              tab === id
                ? "text-accent border-b-2 border-accent bg-accent/5"
                : "text-ink-faint hover:text-ink-2"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-5 animate-fade-in" key={tab}>
        {tab === "privacy" && (
          <p className="text-[11px] text-ink-faint">{t("legal_lastUpdated")} 2026-07-09</p>
        )}
        {content.map((section) => (
          <div key={section.heading} className="space-y-1.5">
            <h2 className="text-sm font-semibold text-ink-2">{section.heading}</h2>
            {section.body.map((para, i) => (
              <p key={i} className="text-[12px] text-ink-muted leading-relaxed">{para}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
