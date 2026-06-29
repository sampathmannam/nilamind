import React, { useState, useEffect, useRef } from "react";
import { Moon, Wind, Heart, Bell, BellOff, Play, Pause, LifeBuoy, ChevronRight } from "lucide-react";
import {
  WINDDOWN_STEPS,
  nightlyTip,
  getWindDownReminder,
  setWindDownReminder,
  checkWindDownText,
} from "../services/windDown";
import { getCrisisReply } from "../safety";
import CrisisLines from "./CrisisLines";
import { scheduleIfAllowed, formatTime } from "../services/notifications";

type Stage = "park" | "settle" | "close" | "crisis";

export default function WindDownScreen() {
  const [stage, setStage] = useState<Stage>("park");
  const [worry, setWorry] = useState("");
  const tip = nightlyTip();

  // ── inline soothing breath (4 in / 6 out) — self-contained, same pattern as SelfCompassion's breather ──
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState<"In" | "Out">("In");
  const [count, setCount] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (breathing) {
      timer.current = setInterval(() => {
        setCount((prev) => {
          const limit = phase === "In" ? 4 : 6;
          if (prev >= limit) {
            setPhase((p) => (p === "In" ? "Out" : "In"));
            return 1;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [breathing, phase]);

  // ── reminder pref ──
  const [reminder, setReminder] = useState(getWindDownReminder());
  const [reminderMsg, setReminderMsg] = useState<string>("");
  async function toggleReminder() {
    const next = { ...reminder, enabled: !reminder.enabled };
    setReminder(next);
    setWindDownReminder(next);
    if (next.enabled) {
      const [h, m] = next.time.split(":").map((n) => parseInt(n, 10));
      const when = new Date();
      when.setHours(h || 22, m || 0, 0, 0);
      if (when.getTime() <= Date.now()) when.setDate(when.getDate() + 1);
      const r = await scheduleIfAllowed(when, "A gentle nudge to wind down for sleep 🌙", "NilaMind");
      setReminderMsg(
        r.ok ? `Set for ${formatTime(when)}.` : r.reason === "denied" ? "Turn on notifications to enable this." : "Reminders run in the installed app.",
      );
    } else {
      setReminderMsg("");
    }
  }
  function setTime(t: string) {
    const next = { ...reminder, time: t };
    setReminder(next);
    setWindDownReminder(next);
  }

  function submitWorry() {
    const crisis = checkWindDownText(worry);
    setWorry(""); // §9: never keep/persist the worry text, even on a crisis hit
    setBreathing(false);
    setStage(crisis ? "crisis" : "settle");
  }

  const park = WINDDOWN_STEPS.find((s) => s.id === "park")!;
  const close = WINDDOWN_STEPS.find((s) => s.id === "close")!;

  return (
    <div className="space-y-5 max-w-md mx-auto" id="winddown-section">
      <div className="bg-card p-4 rounded-xl border border-slate-800">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Moon className="text-indigo-400 w-5 h-5" />
          <span>Wind down</span>
        </h1>
        <p className="text-xs text-slate-500">A calm few minutes before sleep — gentle, never medical.</p>
      </div>

      {/* ── CRISIS surface (deterministic; worry text already cleared) ── */}
      {stage === "crisis" && (
        <div className="bg-card border border-rose-500/30 p-5 rounded-2xl space-y-3" id="winddown-crisis">
          <h3 className="text-sm font-semibold text-rose-200 flex items-center gap-1.5">
            <LifeBuoy className="w-4 h-4" /> Your safety matters more than sleep right now
          </h3>
          <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{getCrisisReply()}</p>
          <CrisisLines tone="rose" compact />
          <button
            onClick={() => setStage("settle")}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            I'm okay — take me to the breathing
          </button>
        </div>
      )}

      {/* ── PARK the day (skippable) ── */}
      {stage === "park" && (
        <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Moon className="text-indigo-400 w-4 h-4" /> {park.title}
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">{park.body}</p>
          </div>
          <textarea
            aria-label={park.title}
            value={worry}
            onChange={(e) => setWorry(e.target.value)}
            className="w-full h-28 bg-page border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
            placeholder="e.g. The email I'm dreading → I'll draft two lines after coffee."
          />
          <div className="flex gap-2">
            <button
              onClick={submitWorry}
              className="flex-1 py-3 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              Set it down <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setWorry("");
                setStage("settle");
              }}
              className="px-4 py-3 rounded-xl font-semibold text-xs bg-page text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
            >
              Skip to breathing
            </button>
          </div>
        </div>
      )}

      {/* ── SETTLE the body ── */}
      {stage === "settle" && (
        <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-5">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Wind className="text-sky-400 w-4 h-4" /> Settle your body
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Breathe in for 4, out for 6 — the longer out-breath calms the nervous system.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 py-3 bg-page rounded-2xl border border-slate-800">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div
                className={`absolute rounded-full bg-sky-500/10 border border-sky-500/40 transition-all duration-1000 ${
                  breathing ? (phase === "In" ? "w-32 h-32 bg-sky-500/20" : "w-16 h-16 bg-sky-500/5") : "w-24 h-24"
                }`}
              />
              <div className="z-10 text-center">
                <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                  {breathing ? (phase === "In" ? "Inhale" : "Exhale") : "Ready"}
                </p>
                <p className="text-3xl font-black text-slate-100 font-mono mt-0.5">{breathing ? count : "0"}</p>
              </div>
            </div>
            <button
              onClick={() => setBreathing((b) => !b)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-card text-slate-300 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-lg cursor-pointer transition-all"
            >
              {breathing ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-sky-400" />}
              <span>{breathing ? "Pause" : "Begin"}</span>
            </button>
          </div>
          <button
            onClick={() => {
              setBreathing(false);
              setStage("close");
            }}
            className="w-full py-3 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            Done <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── CLOSE + nightly tip + reminder ── */}
      {stage === "close" && (
        <>
          <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Heart className="text-indigo-400 w-4 h-4" /> {close.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">{close.body}</p>
          </div>

          <div className="p-4 rounded-r-xl bg-indigo-500/5 border-l-4 border-indigo-500 border-y border-r border-slate-800/40 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">One gentle habit</p>
            <p className="text-xs text-slate-200 leading-relaxed">{tip.text}</p>
            <p className="text-[10px] text-slate-500 italic">{tip.basis}</p>
          </div>

          <div className="bg-card border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {reminder.enabled ? <Bell className="w-4 h-4 text-indigo-400" /> : <BellOff className="w-4 h-4 text-slate-500" />}
                <span className="text-xs font-semibold text-slate-300">Nightly wind-down nudge</span>
              </div>
              <button
                onClick={toggleReminder}
                className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer ${
                  reminder.enabled
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-page border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {reminder.enabled ? "On" : "Off"}
              </button>
            </div>
            {reminder.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">at</span>
                <input
                  type="time"
                  aria-label="Reminder time"
                  value={reminder.time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-page border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                />
                {reminderMsg && <span className="text-[10px] text-slate-500">{reminderMsg}</span>}
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-600 leading-relaxed px-1">
            These are gentle habits, not rules. If sleep stays hard for weeks — or your body clock feels far off — a
            GP or sleep clinician can help more than tips can.
          </p>

          <button
            onClick={() => {
              setStage("park");
              setBreathing(false);
            }}
            className="w-full py-2.5 rounded-xl font-semibold text-xs bg-page text-slate-400 border border-slate-800 hover:text-slate-200 transition-all cursor-pointer"
          >
            Start again
          </button>
        </>
      )}
    </div>
  );
}
