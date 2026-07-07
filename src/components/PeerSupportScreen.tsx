import React from "react";
import { Users } from "lucide-react";
import { loadProfile, loadSessions, prewrittenTemplates } from "../services/peerSupport";

export default function PeerSupportScreen() {
  const profile = loadProfile();
  const sessions = loadSessions();
  const templates = prewrittenTemplates();

  return (
    <div className="space-y-4 max-w-md mx-auto" id="peer-support-screen">
      <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-400" /> Peer Support</h2>
      <p className="text-xs text-slate-400 leading-relaxed">Practice reaching out and track how connection affects your mood.</p>

      {profile && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Your profile</div>
          <p className="text-xs text-slate-300">Stage: {profile.stage}</p>
          <p className="text-xs text-slate-300">Style: {profile.style}</p>
          <p className="text-xs text-slate-400">Goals: {profile.goals.join(", ")}</p>
          <p className="text-[10px] text-slate-500">Availability: {profile.availability}</p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Recent sessions</div>
          {sessions.slice(-5).reverse().map((s) => (
            <div key={s.id} className="glass rounded-xl p-3 text-xs text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-200 font-semibold">{s.contactName}</span>
                <span>{new Date(s.date).toLocaleDateString()}</span>
              </div>
              <p className="mt-1">Mood: {s.moodBefore}/10 → {s.moodAfter != null ? `${s.moodAfter}/10` : "—"}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Message templates</div>
        {templates.map((t) => (
          <div key={t.id} className="glass border-l-4 border-l-emerald-500 rounded-r-2xl p-3">
            <p className="text-sm font-semibold text-slate-100">{t.label}</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
