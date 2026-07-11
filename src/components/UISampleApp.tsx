import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  LayoutGrid,
  User,
  LifeBuoy,
  Sun,
  Moon,
  Heart,
  Zap,
  Brain,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  Download,
  Trash2,
  Settings,
  ChevronDown,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Database,
  Mic,
  Send,
  ExternalLink,
} from "lucide-react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { hapticLight } from "../hooks/useHaptics";

const TODAY = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const GREETING = ["Good morning", "Good afternoon", "Good evening"][
  new Date().getHours() < 12 ? 0 : new Date().getHours() < 17 ? 1 : 2
];

const QUICK_ACTIONS = [
  { id: "mood", label: "Log mood", icon: Heart, desc: "2 taps, no typing" },
  { id: "chat", label: "Talk to Nila", icon: MessageCircle, desc: "Protocol-first chat" },
  { id: "skill", label: "Try a skill", icon: Sparkles, desc: "CBT / ACT / DBT / CFT" },
  { id: "grounding", label: "Ground now", icon: Zap, desc: "Breathing / 5-4-3-2-1" },
];

const COLLAPSIBLE_SECTIONS = [
  {
    id: "skills",
    label: "Quick Skills",
    icon: Sparkles,
    items: ["Box breathing", "5-4-3-2-1 grounding", "Thought record", "Values clarification"],
  },
  {
    id: "screenings",
    label: "Screenings",
    icon: ClipboardList,
    items: ["PHQ-9", "GAD-7", "WHO-5", "PSS-4"],
  },
  {
    id: "ba",
    label: "Behavioural Activation",
    icon: TrendingUp,
    items: ["Schedule activity", "Log mastery/pleasure", "View insights"],
  },
];

function CrisisPill({ isDark }: { isDark: boolean }) {
  const prefersReduced = useReducedMotion();
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${useReducedMotion() ? "transition-none" : ""}`}
      role="region"
      aria-label="Crisis support"
    >
      <button
        onClick={() => alert("CrisisOverlay would open — deterministic, §9-gated")}
        className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-xl border border-rose-500/30 tap-target focus-ring ${
          isDark ? "bg-rose-600/90 text-rose-50" : "bg-rose-500/90 text-rose-50"
        }`}
        aria-label="Need help? Crisis resources"
      >
        <LifeBuoy className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold">Need help?</span>
        <div className="w-1 h-1 rounded-full bg-rose-300 animate-pulse" aria-hidden="true" />
      </button>
    </div>
  );
}

function NilaOrb({ isDark }: { isDark: boolean }) {
  return (
    <div className="relative w-20 h-20 rounded-full flex items-center justify-center nila-orb">
      <div className="absolute inset-0 rounded-full bg-blue-500/20 orb-aura" />
      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <MessageSquare className="w-8 h-8 text-white" aria-hidden="true" />
      </div>
    </div>
  );
}

function MoodChip({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`tap-target px-4 py-2 rounded-full text-sm font-medium transition-all ${color} focus-ring`}
      aria-label={`Log mood: ${label}`}
    >
      {label}
    </button>
  );
}

function QuickActionCard({ icon: Icon, label, desc, onClick, color }: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`group relative p-4 rounded-2xl border border-slate-800 bg-card text-left transition-all ${color} focus-ring`}
      aria-label={label}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl ${color} flex-shrink-0 group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-100">{label}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
      </div>
    </button>
  );
}

function CollapsibleSection({ section, isOpen, onToggle }: { section: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; items: string[] }; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-card">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left" aria-expanded={isOpen}>
        <div className="flex items-center gap-3">
          <section.icon className="w-5 h-5 text-blue-400" aria-hidden="true" />
          <span className="font-semibold text-slate-100">{section.label}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-700 text-slate-300">
            {section.items.length}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-2">
            {section.items.map((item, i) => (
              <button key={i} className="p-3 rounded-xl bg-page border border-slate-800 text-left text-sm text-slate-300 hover:bg-raised transition-colors tap-target">
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodayHome({ isDark, onSettings }: { isDark: boolean; onSettings: () => void }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-6 max-w-md mx-auto px-4 pb-24">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-100 editorial">{GREETING}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{TODAY}</p>
          </div>
          <button onClick={onSettings} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700" aria-label="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>
      <div className="flex items-center justify-center mb-2">
        <NilaOrb isDark={isDark} />
      </div>
      <div className="space-y-3" role="group" aria-label="Mood">
        <p className="text-xs text-slate-500 font-mono uppercase tracking-wider px-1">How are you feeling?</p>
        <div className="flex flex-wrap gap-2">
          {["Calm", "Anxious", "Low", "Irritable", "Energetic"].map((m, i) => (
            <button
              key={i}
              onClick={() => hapticLight()}
              className={`tap-target px-4 py-2 rounded-full text-sm font-medium transition-all ${
                i === 0
                  ? "bg-emerald-500/20 text-emerald-400"
                  : i === 1
                  ? "bg-amber-500/20 text-amber-400"
                  : i === 2
                  ? "bg-blue-500/20 text-blue-400"
                  : i === 3
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-emerald-500/20 text-emerald-400"
              } focus-ring`}
              aria-label={`Log mood: ${m}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <QuickActionCard
            key={action.id}
            icon={action.icon}
            label={action.label}
            desc={action.desc}
            onClick={() => hapticLight()}
            color={action.id === "chat" ? "bg-blue-500/10 border-blue-500/20" : "bg-slate-800/50 border-slate-700"}
          />
        ))}
      </div>
      <div className="space-y-3">
        {COLLAPSIBLE_SECTIONS.map((section) => (
          <CollapsibleSection
            key={section.id}
            section={section}
            isOpen={false}
            onToggle={() => {}}
          />
        ))}
      </div>
      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-4 mt-4">
        Understanding can help — it isn't a substitute for professional care.
      </p>
    </div>
  );
}

function NilaChatView({ isDark }: { isDark: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NilaOrb isDark={true} />
          <div>
            <div className="font-semibold text-slate-100">Nila</div>
            <div className="text-xs text-slate-400">Protocol-first • On-device</div>
          </div>
        </div>
        <button className="p-2 rounded-xl bg-slate-800 text-slate-300" aria-label="Crisis">
          <LifeBuoy className="w-5 h-5 text-rose-400" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm">Start a conversation with Nila</p>
            <p className="text-xs text-slate-500 mt-1">
              Protocol-first, on-device, private
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-blue-500/20 text-slate-100 rounded-br-none"
                    : "bg-slate-800 text-slate-100 rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl bg-slate-800 text-slate-300" aria-label="Voice">
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && input.trim() && (setMessages((m) => [...m, { role: "user", content: input }]), setInput(""))
            }
            placeholder="Message Nila…"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              if (input.trim()) {
                setMessages((m) => [...m, { role: "user", content: input }]);
                setInput("");
              }
            }}
            disabled={!input.trim()}
            className="p-2 rounded-xl bg-blue-500/20 text-blue-400 disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function YouDashboard({ isDark }: { isDark: boolean }) {
  return (
    <div className="space-y-6 max-w-md mx-auto px-4 pb-24">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          You
        </h1>
        <p className="text-xs text-slate-400">Your insights, data & settings</p>
      </header>
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Encrypted at rest and never uploaded. There is no server copy — if you wipe it here, it's gone.
        </p>
      </div>
      <div className="space-y-4">
        <div className="glass rounded-2xl divide-y divide-slate-800/70">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-bold text-slate-200">Streak</span>
            <span className="text-sm font-mono font-bold text-emerald-400">12 days</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-bold text-slate-200">Avg mood</span>
            <span className="text-sm font-mono font-bold text-blue-400">6.2 / 10</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-bold text-slate-200">Check-ins</span>
            <span className="text-sm font-mono font-bold text-slate-100">47</span>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Insights
          </h3>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <p className="text-sm text-slate-300">Mood trending up this week (+1.2 avg)</p>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            What Nila remembers
          </h3>
          <button
            className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
          >
            <span className="shrink-0 text-fuchsia-400">
              <Brain className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100">View Nila's memory</span>
              <span className="block text-[11px] text-slate-400">
                See, edit, or delete what she knows
              </span>
            </span>
          </button>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Your data
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
            >
              <span className="shrink-0 text-emerald-400">
                <Download className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-100">Export everything</span>
                <span className="block text-[11px] text-slate-400">
                  Encrypted backup or readable CSV/PDF
                </span>
              </span>
            </button>
            <button
              className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
            >
              <span className="shrink-0 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-100">Delete all my data</span>
                <span className="block text-[11px] text-slate-400">
                  Erase everything and return to onboarding
                </span>
              </span>
            </button>
          </div>
          <button
            className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
          >
            <span className="shrink-0 text-blue-400">
              <Settings className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100">Settings</span>
              <span className="block text-[11px] text-slate-400">
                Voice, reminders, recovery phrase
              </span>
            </span>
          </button>
          <a
            href="https://github.com/sampathmannam/nilamind/blob/main/PRIVACY_POLICY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left no-underline"
          >
            <span className="shrink-0 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100">Privacy Policy</span>
              <span className="block text-[11px] text-slate-400">
                How your data stays private
              </span>
            </span>
            <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function UISampleApp() {
  const [activeTab, setActiveTab] = useState<"today" | "nila" | "you">("today");
  const [isDark, setIsDark] = useState(true);
  const prefersReduced = useReducedMotion();

  const tabs = [
    { id: "today", label: "Today", Icon: LayoutGrid },
    { id: "nila", label: "Nila", Icon: MessageSquare },
    { id: "you", label: "You", Icon: User },
  ];

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("theme-light");
    } else {
      document.documentElement.classList.add("theme-light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen flex flex-col bg-page text-slate-100">
      <div className="flex-1 flex flex-col">
        {activeTab === "today" && (
          <div className="flex-1 overflow-y-auto">
            <div className="pb-24">
              <TodayHome isDark={isDark} onSettings={() => alert("Settings")} />
            </div>
          </div>
        )}
        {activeTab === "nila" && (
          <div className="flex-1 flex flex-col">
            <div className="pb-24">
              <NilaChatView isDark={isDark} />
            </div>
          </div>
        )}
        {activeTab === "you" && (
          <div className="flex-1 overflow-y-auto">
            <div className="pb-24">
              <YouDashboard isDark={isDark} />
            </div>
          </div>
        )}
      </div>
      <nav
        className="shrink-0 flex items-center justify-around border-t border-slate-800 bg-page/95 backdrop-blur pb-[max(8px,env(safe-area-inset-bottom))]"
        aria-label="Main navigation"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as "today" | "nila" | "you");
              hapticLight();
            }}
            className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors ${
              activeTab === tab.id ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
            }`}
            aria-selected={activeTab === tab.id}
            aria-label={tab.label}
          >
            <tab.Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          prefersReduced ? "transition-none" : ""
        }`}
        role="region"
        aria-label="Crisis support"
      >
        <button
          onClick={() => alert("CrisisOverlay would open — deterministic, §9-gated")}
          className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-xl border border-rose-500/30 bg-rose-600/90 text-rose-50 tap-target focus-ring`}
          aria-label="Need help? Crisis resources"
        >
          <LifeBuoy className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold">Need help?</span>
          <div className="w-1 h-1 rounded-full bg-rose-300 animate-pulse" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}