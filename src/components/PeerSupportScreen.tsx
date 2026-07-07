import React, { useState } from "react";
import { Users, Plus, X } from "lucide-react";
import { createProfile, loadProfile, saveProfile, loadSessions, saveSession, prewrittenTemplates, type PeerProfile, type PeerSession } from "../services/peerSupport";

export default function PeerSupportScreen() {
  const [profile, setProfile] = useState<PeerProfile | null>(loadProfile);
  const [sessions, setSessions] = useState<PeerSession[]>(loadSessions);
  const [showCreate, setShowCreate] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [name, setName] = useState("");
  const [stage, setStage] = useState("early");
  const [goals, setGoals] = useState("");
  const [moodBefore, setMoodBefore] = useState(5);
  const [moodAfter, setMoodAfter] = useState(5);
  const [contactName, setContactName] = useState("");

  const templates = prewrittenTemplates();

  function handleCreateProfile() {
    const p = createProfile(stage, goals.split(",").map((g) => g.trim()).filter(Boolean), "warm", "weekdays");
    saveProfile(p);
    setProfile(p);
    setShowCreate(false);
  }

  function handleLogSession() {
    if (!contactName.trim()) return;
    const s: PeerSession = {
      id: `ps_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      contactName: contactName.trim(),
      moodBefore,
      moodAfter,
      connected: true,
      notes: "",
    };
    const updated = [...sessions, s];
    saveSession(s);
    setSessions(updated);
    setShowLog(false);
    setContactName(""); setMoodBefore(5); setMoodAfter(5);
  }

  if (!profile && !showCreate) {
    return (
      <div className="space-y-4 max-w-md mx-auto" id="peer-support-screen">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-400" /> Peer Support</h2>
        <div className="glass rounded-2xl p-5 text-center text-xs text-slate-400 space-y-3">
          <p>No profile yet. Create one to start tracking your connections.</p>
          <button onClick={() => setShowCreate(true)} className="glass rounded-xl px-4 py-2 text-xs text-emerald-300 cursor-pointer">Create profile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto" id="peer-support-screen">
      <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-400" /> Peer Support</h2>
      <p className="text-xs text-slate-400 leading-relaxed">Practice reaching out and track how connection affects your mood.</p>

      {showCreate ? (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Create your profile</div>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full glass rounded-xl px-3 py-2 text-sm text-slate-200">
            <option value="early">Early — just starting to reach out</option>
            <option value="building">Building — getting more comfortable</option>
            <option value="maintaining">Maintaining — regular connections</option>
          </select>
          <input value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Goals (comma-separated: e.g. call a friend, join a group)" className="w-full glass rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500" />
          <div className="flex gap-2">
            <button onClick={handleCreateProfile} className="flex-1 glass rounded-xl py-2 text-xs text-emerald-300 cursor-pointer">Save</button>
            <button onClick={() => setShowCreate(false)} className="glass rounded-xl px-3 py-2 text-xs text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
      ) : profile && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Your profile</div>
          <p className="text-xs text-slate-300">Stage: {profile.stage}</p>
          <p className="text-xs text-slate-400">Goals: {profile.goals.join(", ")}</p>
          <p className="text-[10px] text-slate-500">Style: {profile.style} · Availability: {profile.availability}</p>
        </div>
      )}

      {showLog ? (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Log a connection</div>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Who did you connect with?" className="w-full glass rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500" />
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-slate-500">Mood before: {moodBefore}/10</label>
              <input type="range" min={1} max={10} value={moodBefore} onChange={(e) => setMoodBefore(+e.target.value)} className="w-full" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-slate-500">Mood after: {moodAfter}/10</label>
              <input type="range" min={1} max={10} value={moodAfter} onChange={(e) => setMoodAfter(+e.target.value)} className="w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleLogSession} className="flex-1 glass rounded-xl py-2 text-xs text-emerald-300 cursor-pointer">Save</button>
            <button onClick={() => setShowLog(false)} className="glass rounded-xl px-3 py-2 text-xs text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowLog(true)} className="w-full glass border-l-4 border-l-emerald-500 rounded-r-2xl p-3 flex items-center gap-2 text-xs text-emerald-300 cursor-pointer hover:border-emerald-400/70 transition-colors">
          <Plus className="w-4 h-4" /> Log a connection
        </button>
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
