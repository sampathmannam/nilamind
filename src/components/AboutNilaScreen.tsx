import { Sparkles, Shield, BookOpen, HeartHandshake, Cpu } from "lucide-react";

export default function AboutNilaScreen() {
  return (
    <div className="space-y-5 max-w-md mx-auto px-4 pb-8" id="about-nila-screen">
      {/* Header */}
      <div className="glass rounded-2xl p-5 text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7 text-blue-400" />
        </div>
        <h1 className="editorial text-xl text-slate-100">About Nila</h1>
        <p className="text-xs text-slate-400">Your on-device AI companion</p>
      </div>

      {/* What Nila is */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-blue-400" /> What Nila is
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Nila is a private, on-device AI companion designed for the harder moments. She listens, suggests
          evidence-based tools, and helps you notice patterns in how you're doing — all without any data
          leaving your phone.
        </p>
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" /> How it works
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Nila's brain is a small language model that runs entirely on your device — there is no cloud,
          no server, no internet round-trip. Everything you type is processed locally and stored encrypted.
          When you check in, Nila adapts her suggestions to your state and the time of day.
        </p>
      </div>

      {/* What Nila can do */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> What Nila can do
        </h2>
        <ul className="text-xs text-slate-400 leading-relaxed space-y-1.5 list-disc list-inside">
          <li>Listen and respond with empathy, anytime</li>
          <li>Suggest evidence-based coping tools (grounding, breathing, thought records, and more)</li>
          <li>Help you notice patterns in mood, sleep, and behaviour</li>
          <li>Guide you through structured protocols (behavioural activation, self-compassion)</li>
          <li>Adapt to your state — calming when elevated, gentle when low</li>
        </ul>
      </div>

      {/* What Nila cannot do */}
      <div className="glass rounded-2xl p-4 border-l-4 border-l-rose-500 space-y-2">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" /> What Nila cannot do
        </h2>
        <ul className="text-xs text-slate-400 leading-relaxed space-y-1.5 list-disc list-inside">
          <li>Nila is <strong className="text-slate-300">not a therapist, doctor, or crisis service</strong></li>
          <li>She cannot diagnose, treat, or prescribe</li>
          <li>She cannot replace professional mental health care</li>
          <li>If you're in crisis, please use the crisis resources — always reachable at the bottom of every screen</li>
        </ul>
      </div>

      {/* Anti-sycophancy: Nila won't always agree */}
      <div className="glass rounded-2xl p-4 border-l-4 border-l-amber-500 space-y-2">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> Nila won't always agree with you
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          This is by design. If you're in a manic or elevated state — feeling like you don't need sleep,
          that rules don't apply, that you should spend everything, quit your job, or that everyone is
          against you — Nila will gently <strong className="text-slate-300">not validate</strong> those beliefs.
          Sycophancy (an AI just agreeing with you) is a documented harm in mental-health AI.
          Nila's job is to hold the line with warmth, not to make you feel good in the moment at the
          cost of your safety.
        </p>
      </div>

      {/* Privacy */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" /> Privacy
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          NilaMind is designed so <strong className="text-slate-300">nothing leaves your phone</strong>.
          All data — chats, check-ins, diary entries, insights — is stored locally and encrypted at rest.
          There are no accounts, no cloud sync, no analytics SDKs, and no data collection.
        </p>
      </div>

      {/* Research basis */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" /> Research basis
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Every tool and feature in NilaMind is grounded in peer-reviewed research — CBT, DBT, behavioural
          activation, social rhythm therapy, and more. You can explore the full evidence base and citations
          in the Learn section.
        </p>
      </div>

      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-4">
        NilaMind is a support alongside — not a substitute for — professional care.
      </p>
    </div>
  );
}
