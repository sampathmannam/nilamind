/**
 * Peer Support Screen — practice reaching out to real people.
 *
 * The service (peerSupport.ts) provides profile creation, session logging,
 * prewritten templates, streak tracking, and mood improvement analytics.
 * This screen surfaces the templates and session history to the user.
 *
 * Research basis: Social connection is the strongest protective factor against
 * depression relapse in bipolar disorder (Sylvies et al., 2019). Low-friction
 * templates reduce the activation energy for reaching out.
 */

import React, { useMemo } from "react";
import { ChevronLeft, Users, Copy, TrendingUp } from "lucide-react";
import { prewrittenTemplates, loadSessions, sessionStreak, averageMoodImprovement, type PeerSession } from "../services/peerSupport";

interface PeerSupportScreenProps {
  go: (target: string) => void;
  onCopy?: (text: string) => void;
  sessions?: PeerSession[];
}

export default function PeerSupportScreen({ go, onCopy, sessions: propSessions }: PeerSupportScreenProps) {
  const sessions = propSessions ?? useMemo(() => loadSessions(), []);
  const templates = useMemo(() => prewrittenTemplates(), []);
  const streak = useMemo(() => sessionStreak(sessions), [sessions]);
  const avgImprovement = useMemo(() => averageMoodImprovement(sessions), [sessions]);

  const handleCopy = (text: string) => {
    if (onCopy) {
      onCopy(text);
    } else {
      try {
        navigator.clipboard?.writeText(text);
      } catch { /* best-effort */ }
    }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="peer-support-screen">
      <header className="space-y-1">
        <button
          onClick={() => go("tools")}
          className="text-xs font-semibold text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Tools
        </button>
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" /> Peer Support
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Reaching out to people you trust is one of the most powerful things you can do for your wellbeing.
          These templates make the first message easier.
        </p>
      </header>

      {/* Session stats */}
      {sessions.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <h3 className="text-xs uppercase font-mono tracking-widest text-slate-400">Your connections</h3>
          <div className="flex gap-4">
            <div>
              <p className="text-lg font-bold text-slate-100">{sessions.length}</p>
              <p className="text-[11px] text-slate-400">session{sessions.length === 1 ? "" : "s"}</p>
            </div>
            {streak > 0 && (
              <div>
                <p className="text-lg font-bold text-emerald-400">{streak}</p>
                <p className="text-[11px] text-slate-400">streak</p>
              </div>
            )}
            {avgImprovement !== null && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-sm font-bold text-emerald-400">
                    {avgImprovement > 0 ? "+" : ""}{avgImprovement}
                  </p>
                  <p className="text-[11px] text-slate-400">avg mood change</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-400">No sessions yet — pick a template below to reach out to someone.</p>
        </div>
      )}

      {/* Prewritten templates */}
      <div className="space-y-2">
        <h3 className="text-xs uppercase font-mono tracking-widest text-slate-400">Quick messages</h3>
        {templates.map((tpl) => (
          <div key={tpl.id} className="glass rounded-xl p-3 space-y-2">
            <p className="text-sm font-semibold text-slate-200">{tpl.label}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">{tpl.text}</p>
            <button
              onClick={() => handleCopy(tpl.text)}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            >
              <Copy className="w-3 h-3" /> Copy to clipboard
            </button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed text-center">
        These are prompts — use your own words if that feels more natural. The point is reaching out, not perfect wording.
      </p>
    </div>
  );
}
