import { useState } from "react";
import { Lightbulb, ChevronLeft, Plus } from "lucide-react";
import { createSession, addSolution, setProsCons, chooseSolution, setActionPlan, completeSession, loadSessions, saveSession, type ProblemSession } from "../services/problemSolving";

// `draft` pre-fills the "define a problem" input from a worry the on-device model structured out of the
// chat (problemSolvingDraft.safeDraftProblem). The user edits it and brainstorms solutions themselves.
export default function ProblemSolvingScreen({ draft }: { draft?: { problem: string } } = {}) {
  const [sessions, setSessions] = useState<ProblemSession[]>(loadSessions);
  const [active, setActive] = useState<string | null>(null);
  const [problem, setProblem] = useState(draft?.problem ?? "");
  const [solutionText, setSolutionText] = useState("");
  const [editingSolution, setEditingSolution] = useState<string | null>(null);
  const [prosText, setProsText] = useState("");
  const [consText, setConsText] = useState("");
  const [actionSteps, setActionSteps] = useState("");
  const [implementationIntention, setImplementationIntention] = useState("");
  const [barrierPlan, setBarrierPlan] = useState("");

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
    const updated = setActionPlan(activeSession, steps, {
      implementationIntention: implementationIntention.trim() || undefined,
      barrierPlan: barrierPlan.trim() || undefined,
    });
    saveSession(updated);
    refresh();
    setActionSteps("");
    setImplementationIntention("");
    setBarrierPlan("");
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
        <button onClick={() => setActive(null)} className="flex items-center gap-1.5 text-ink-2 hover:text-white font-semibold py-3 px-1 -ml-1 cursor-pointer" aria-label="Back">
          <ChevronLeft className="w-5 h-5" /> All problems
        </button>
        <h2 className="text-lg font-semibold text-ink">Problem-Solving</h2>
        <p className="text-sm text-ink-2 glass rounded-xl p-3">{activeSession.problem}</p>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
          <p className="text-xs text-ink-faint leading-relaxed">
            Aim for at least 3 ideas before judging any of them — quantity first, evaluate later. Even ideas
            that feel silly or unlikely can spark a better one. (Bell & D'Zurilla, 2009)
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase font-mono tracking-widest text-ink-faint">
            Solutions{activeSession.solutions.length > 0 && activeSession.solutions.length < 3 ? ` · ${activeSession.solutions.length}/3+` : ""}
          </div>
          {activeSession.solutions.map((sol) => (
            <div key={sol.id} className="glass rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-ink-2 flex-1">{sol.text}</p>
                {!sol.chosen && <button onClick={() => handleChoose(sol.id)} className="text-xs text-blue-400 cursor-pointer ml-2">Choose</button>}
                {sol.chosen && <span className="text-xs text-emerald-400 font-semibold">✓ Chosen</span>}
              </div>
              {sol.pros.length > 0 && <p className="text-xs text-emerald-400">Pros: {sol.pros.join(", ")}</p>}
              {sol.cons.length > 0 && <p className="text-xs text-rose-400">Cons: {sol.cons.join(", ")}</p>}
              {editingSolution === sol.id ? (
                <div className="space-y-2">
                  <input value={prosText} onChange={(e) => setProsText(e.target.value)} placeholder="Pros (comma-separated)" className="w-full glass rounded-xl px-3 py-1.5 text-[11px] text-ink-2 placeholder-slate-600" />
                  <input value={consText} onChange={(e) => setConsText(e.target.value)} placeholder="Cons (comma-separated)" className="w-full glass rounded-xl px-3 py-1.5 text-[11px] text-ink-2 placeholder-slate-600" />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveProsCons(sol.id)} className="text-xs text-blue-300 cursor-pointer">Save</button>
                    <button onClick={() => setEditingSolution(null)} className="text-xs text-ink-faint cursor-pointer">Cancel</button>
                  </div>
                </div>
              ) : sol.pros.length === 0 && sol.cons.length === 0 && !sol.chosen && (
                <button onClick={() => { setEditingSolution(sol.id); setProsText(""); setConsText(""); }} className="text-xs text-ink-faint cursor-pointer">Add pros/cons</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={solutionText} onChange={(e) => setSolutionText(e.target.value)} placeholder="Add a solution idea..." className="flex-1 glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-ink-faint" />
          <button onClick={handleAddSolution} aria-label="Add solution" className="glass rounded-xl px-3 py-2 text-xs text-blue-300 cursor-pointer"><Plus className="w-4 h-4" /></button>
        </div>

        {activeSession.solutions.some((s) => s.chosen) && (
          <div className="space-y-2">
            <div className="text-xs uppercase font-mono tracking-widest text-ink-faint">Action plan</div>
            <textarea value={actionSteps} onChange={(e) => setActionSteps(e.target.value)} placeholder="What steps will you take? (one per line)" rows={3} className="w-full glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-slate-600" />
            <div className="space-y-1">
              <label htmlFor="pst-if-then" className="text-xs text-ink-faint">Make it concrete (optional) — plans with an if-then are more likely to happen</label>
              <input id="pst-if-then" value={implementationIntention} onChange={(e) => setImplementationIntention(e.target.value)} placeholder="If [time/place], then I will [action]..." className="w-full glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-slate-600" />
            </div>
            <div className="space-y-1">
              <label htmlFor="pst-barrier" className="text-xs text-ink-faint">What might get in the way — and your backup move (optional)</label>
              <input id="pst-barrier" value={barrierPlan} onChange={(e) => setBarrierPlan(e.target.value)} placeholder="What might get in the way, and what will you do?" className="w-full glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-slate-600" />
            </div>
            <button onClick={handleActionPlan} className="w-full glass rounded-xl py-2 text-xs text-blue-300 cursor-pointer">Save action plan</button>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => handleComplete(true)} className="flex-1 glass rounded-xl py-2 text-xs text-emerald-300 cursor-pointer">Solved ✓</button>
          <button onClick={() => handleComplete(false)} className="flex-1 glass rounded-xl py-2 text-xs text-ink-muted cursor-pointer">Not solved</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto" id="problem-solving-screen">
      <h2 className="text-xl font-semibold text-ink flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-400" /> Problem-Solving</h2>
      <p className="text-xs text-ink-muted leading-relaxed">Break a problem into steps: define it, brainstorm solutions, pick one, and try it.</p>
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
        <p className="text-xs text-ink-faint leading-relaxed">
          Having a problem is a normal part of life, not a sign something's wrong with you — and most problems
          have more than one workable solution. Coming at it with curiosity, rather than dread, is itself part
          of what makes this work. (Bell & D'Zurilla, 2009)
        </p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <input value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="What's the problem?" className="w-full glass rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ink-faint" />
        <button onClick={handleCreate} className="w-full glass rounded-xl py-2 text-xs text-blue-300 cursor-pointer">Start problem-solving</button>
      </div>

      <div className="space-y-2">
        {sessions.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)} className="w-full glass border-l-4 border-l-amber-500 rounded-r-2xl p-4 text-left cursor-pointer hover:border-amber-400/70 transition-colors">
            <span className="text-sm font-semibold text-ink">{s.problem}</span>
            <p className="text-xs text-ink-faint mt-1">{s.solutions.length} solution{s.solutions.length === 1 ? "" : "s"} · {s.completed ? "Completed" : "In progress"}</p>
          </button>
        ))}
        {sessions.length === 0 && <p className="text-xs text-ink-faint text-center py-8">No problems yet. Start by naming one.</p>}
      </div>
    </div>
  );
}
