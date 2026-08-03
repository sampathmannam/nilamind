import { Sparkles, Shield, BookOpen, HeartHandshake, Cpu } from "lucide-react";
import { NILA_ORIGIN } from "../services/personaConfig";

export default function AboutNilaScreen() {
  return (
    <div className="space-y-5 max-w-md mx-auto px-4 pb-8" id="about-nila-screen">
      {/* Header */}
      <div className="glass rounded-2xl p-5 text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-accent" />
        </div>
        <h1 className="editorial text-xl text-ink">About Nila</h1>
        <p className="text-xs text-ink-muted">Your on-device AI companion</p>
      </div>

      {/* What Nila is */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-accent" /> What Nila is
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          Nila is a private, on-device AI companion designed for the harder moments. She listens, suggests
          evidence-based tools, and helps you notice patterns in how you're doing — all without any data
          leaving your phone.
        </p>
      </div>

      {/* Origin story */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" /> Nila's story
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed italic">
          "{NILA_ORIGIN}"
        </p>
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Cpu className="w-4 h-4 text-success" /> How it works
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          Nila's brain is an on-device language model (Qwen2.5-1.5B) that runs entirely on your phone — there is no cloud,
          no server, no internet round-trip. Everything you type is processed locally and stored encrypted.
          Nila adapts her responses to your state, time of day, and what she remembers from past conversations.
        </p>
      </div>

      {/* What Nila can do */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-warn" /> What Nila can do
        </h2>
        <ul className="text-xs text-ink-muted leading-relaxed space-y-1.5 list-disc list-inside">
          <li>Listen and respond with empathy, anytime</li>
          <li>Suggest evidence-based coping tools (grounding, breathing, thought records, and more)</li>
          <li>Help you notice patterns in mood, sleep, behaviour, and social rhythm</li>
          <li>Guide you through structured protocols (behavioural activation, social rhythm therapy, self-compassion, ACT, and more)</li>
          <li>Adapt to your state — calming when elevated, gentle when low</li>
          <li>Reflect back what Nila remembers so your history isn't forgotten between conversations</li>
        </ul>
      </div>

      {/* What Nila cannot do */}
      <div className="glass rounded-2xl p-4 border-l-4 border-l-rose-500 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" /> What Nila cannot do
        </h2>
        <ul className="text-xs text-ink-muted leading-relaxed space-y-1.5 list-disc list-inside">
          <li>Nila is <strong className="text-ink-2">not a therapist, doctor, or crisis service</strong></li>
          <li>She cannot diagnose, treat, or prescribe</li>
          <li>She cannot replace professional mental health care</li>
          <li>If you're in crisis, use the crisis resources in the Learn or Reach Out screens</li>
        </ul>
      </div>

      {/* Anti-sycophancy: Nila won't always agree */}
      <div className="glass rounded-2xl p-4 border-l-4 border-l-amber-500 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-warn" /> Nila won't always agree with you
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          This is by design. If you're in a manic or elevated state — feeling like you don't need sleep,
          that rules don't apply, that everyone is against you, or that you should make big impulsive
          decisions — Nila will gently <strong className="text-ink-2">not validate</strong> those beliefs.
          The same holds for harsh self-beliefs: calling yourself a failure or saying everyone hates you.
          Sycophancy (an AI just agreeing with you) is a documented harm in mental-health AI.
          Nila's job is to hold the line with warmth, not to make you feel good in the moment at the
          cost of your safety.
        </p>
      </div>

      {/* Privacy */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Shield className="w-4 h-4 text-success" /> Privacy
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          NilaMind is designed so <strong className="text-ink-2">nothing leaves your phone</strong>.
          All data — chats, check-ins, diary entries, insights — is stored locally and encrypted at rest.
          There are no accounts, no cloud sync, no analytics SDKs, and no data collection.
        </p>
      </div>

      {/* Research basis */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent" /> Research basis
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          Every tool and feature in NilaMind is grounded in peer-reviewed research — CBT, DBT, behavioural
          activation, social rhythm therapy, ACT, self-compassion, and more. You can explore the full
          evidence base and citations in the Learn section.
        </p>
      </div>

       <p className="text-[11px] text-ink-faint text-center leading-relaxed px-4">
         NilaMind is a support alongside — not a substitute for — professional care.
       </p>
       <p className="text-[10px] text-slate-600 text-center">
         Version {typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev"}
       </p>
    </div>
  );
}
