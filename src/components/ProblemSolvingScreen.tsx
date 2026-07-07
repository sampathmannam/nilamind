import React, { useState } from "react";
import { Lightbulb, ChevronLeft, Plus } from "lucide-react";
import { createSession, addSolution, loadSessions, saveSession, type ProblemSession } from "../services/problemSolving";

export default function ProblemSolvingScreen() {
  const [sessions, setSessions] = useState<ProblemSession[]>(loadSessions);
  const [active, setActive] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [solutionText, setSolutionText] = useState("");

  const activeSession = sessions.find((s) => s.id === active);

  function refresh() { setSessions(loadSessions()); }

  function handleCreate() {
    if (!problem.trim()) return;
    const s = createSession(problem.trim());
    saveSession(s);
    refresh();
    setActive(s.id);
    setProblem("");
  }

  function handleAddSolution() {
    if (!activeSession) return;
    const updated = addSolution(activeSession, solutionText.trim());
    saveSession(updated);
    refresh();
    setSolutionText("");
  }

  if (activeSession) {
    return (
      <div className="space-y-4 max-w-md mx-auto" id="problem-solving-screen">
        <button onClick={() => setActive(null)} className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 cursor-pointer" aria-label="Back">
          <ChevronLeft className="w-5 h-5" /> All problems
        </button>
        <h2 className="text-lg font-semibold text-slate-100">Problem-Solving</h2>
        <p className="text-sm text-slate-300 glass rounded-xl p-3">{activeSession.problem}</p>

        <div className="space-y-2">
          {activeSession.solutions.map((sol) => (
            <div key={sol.id} className="glass rounded-xl p-3 space-y-1">
              <p className="text-xs text-slate-200">{sol.text}</p>
              {sol.pros.length > 0 && <p className="text-[10px] text-emerald-400">Pros: {sol.pros.join(", ")}</p>}
              {sol.cons.length > 0 && <p className="text-[10px] text-rose-400">Cons: {sol.cons.join(", ")}</p>}
              {sol.chosen && <p className="text-[10px] text-blue-400 font-semibold">✓ Chosen</p>}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={solutionText} onChange={(e) => setSolutionText(e.target.value)} placeholder="Add a solution idea..." className="flex-1 glass rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500" />
          <button onClick={handleAddSolution} className="glass rounded-xl px-3 py-2 text-xs text-blue-300 cursor-pointer"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto" id="problem-solving-screen">
      <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-400" /> Problem-Solving</h2>
      <p className="text-xs text-slate-400 leading-relaxed">Break a problem into steps: define it, brainstorm solutions, pick one, and try it.</p>

      <div className="glass rounded-2xl p-4 space-y-3">
        <input value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="What's the problem?" className="w-full glass rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500" />
        <button onClick={handleCreate} className="w-full glass rounded-xl py-2 text-xs text-blue-300 cursor-pointer">Start problem-solving</button>
      </div>

      <div className="space-y-2">
        {sessions.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)} className="w-full glass border-l-4 border-l-amber-500 rounded-r-2xl p-4 text-left cursor-pointer hover:border-amber-400/70 transition-colors">
            <span className="text-sm font-semibold text-slate-100">{s.problem}</span>
            <p className="text-[10px] text-slate-500 mt-1">{s.solutions.length} solution{s.solutions.length === 1 ? "" : "s"} · {s.completed ? "Completed" : "In progress"}</p>
          </button>
        ))}
        {sessions.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No problems yet. Start by naming one.</p>}
      </div>
    </div>
  );
}
