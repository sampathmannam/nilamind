import React, { useState } from "react";
import { Lightbulb, ChevronLeft, Plus } from "lucide-react";
import { createSession, addSolution, setProsCons, chooseSolution, setActionPlan, completeSession, loadSessions, saveSession, type ProblemSession } from "../services/problemSolving";

export default function ProblemSolvingScreen() {
  const [sessions, setSessions] = useState<ProblemSession[]>(loadSessions);
  const [active, setActive] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [editingSolution, setEditingSolution] = useState<string | null>(null);
  const [prosText, setProsText] = useState("");
  const [consText, setConsText] = useState("");
  const [actionSteps, setActionSteps] = useState("");

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
    if (!activeSession || !solutionText.trim()) return;
    const updated = addSolution(activeSession, solutionText.trim());
    saveSession(updated);
    refresh();
    setSolutionText("");
  }

  function handleSaveProsCons(solId: string) {
    if (!activeSession) return;
    const pros = prosText.split(",").map((s) => s.trim()).filter(Boolean);
    const cons = consText.split(",").map((s) => s.trim()).filter(Boolean);
    const updated = setProsCons(activeSession, solId, pros, cons);
    saveSession(updated);
    refresh();
    setEditingSolution(null); setProsText(""); setConsText("");
  }

  function handleChoose(solId: string) {
    if (!activeSession) return;
    const updated = chooseSolution(activeSession, solId);
    saveSession(updated);
    refresh();
  }

  function handleActionPlan() {
    if (!activeSession || !actionSteps.trim()) return;
    const steps = actionSteps.split("\n").map((s) => s.trim()).filter(Boolean);
    const updated = setActionPlan(activeSession, steps);
    saveSession(updated);
    refresh();
    setActionSteps("");
  }

  function handleComplete(solved: boolean) {
    if (!activeSession) return;
    const updated = completeSession(activeSession, solved, "");
    saveSession(updated);
    refresh();
    setActive(null);
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
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Solutions</div>
          {activeSession.solutions.map((sol) => (
            <div key={sol.id} className="glass rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-200 flex-1">{sol.text}</p>
                {!sol.chosen && <button onClick={() => handleChoose(sol.id)} className="text-[10px] text-blue-400 cursor-pointer ml-2">Choose</button>}
                {sol.chosen && <span className="text-[10px] text-emerald-400 font-semibold">✓ Chosen</span>}
              </div>
              {sol.pros.length > 0 && <p className="text-[10px] text-emerald-400">Pros: {sol.pros.join(", ")}</p>}
              {sol.cons.length > 0 && <p className="text-[10px] text-rose-400">Cons: {sol.cons.join(", ")}</p>}
              {editingSolution === sol.id ? (
                <div className="space-y-2">
                  <input value={prosText} onChange={(e) => setProsText(e.target.value)} placeholder="Pros (comma-separated)" className="w-full glass rounded-xl px-3 py-1.5 text-[11px] text-slate-200 placeholder-slate-600" />
                  <input value={consText} onChange={(e) => setConsText(e.target.value)} placeholder="Cons (comma-separated)" className="w-full glass rounded-xl px-3 py-1.5 text-[11px] text-slate-200 placeholder-slate-600" />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveProsCons(sol.id)} className="text-[10px] text-blue-300 cursor-pointer">Save</button>
                    <button onClick={() => setEditingSolution(null)} className="text-[10px] text-slate-500 cursor-pointer">Cancel</button>
                  </div>
                </div>
              ) : sol.pros.length === 0 && sol.cons.length === 0 && !sol.chosen && (
                <button onClick={() => { setEditingSolution(sol.id); setProsText(""); setConsText(""); }} className="text-[10px] text-slate-500 cursor-pointer">Add pros/cons</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={solutionText} onChange={(e) => setSolutionText(e.target.value)} placeholder="Add a solution idea..." className="flex-1 glass rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500" />
          <button onClick={handleAddSolution} className="glass rounded-xl px-3 py-2 text-xs text-blue-300 cursor-pointer"><Plus className="w-4 h-4" /></button>
        </div>

        {activeSession.solutions.some((s) => s.chosen) && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Action plan</div>
            <textarea value={actionSteps} onChange={(e) => setActionSteps(e.target.value)} placeholder="What steps will you take? (one per line)" rows={3} className="w-full glass rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600" />
            <button onClick={handleActionPlan} className="w-full glass rounded-xl py-2 text-xs text-blue-300 cursor-pointer">Save action plan</button>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => handleComplete(true)} className="flex-1 glass rounded-xl py-2 text-xs text-emerald-300 cursor-pointer">Solved ✓</button>
          <button onClick={() => handleComplete(false)} className="flex-1 glass rounded-xl py-2 text-xs text-slate-400 cursor-pointer">Not solved</button>
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
