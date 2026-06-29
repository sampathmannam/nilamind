import { secureLocal } from "../services/secureLocal";
import React, { useState, useEffect } from "react";
import { DiaryCardEntry } from "../types";
import { ALL_DIARY_DBT_SKILLS } from "../data";
import { Check, Clipboard, Calendar, MessageSquare, Sparkles, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import { analyzeQuickNote } from "../services/coachAssist";
import CrisisCard from "./CrisisCard";

export default function DiaryCardScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  const [emotions, setEmotions] = useState({
    misery: 0,
    shame: 0,
    anger: 0,
    fear: 0,
    joy: 0,
    love: 0,
  });

  const [skillsUsed, setSkillsUsed] = useState<string[]>([]);
  const [quickNotes, setQuickNotes] = useState<string>("");
  const [quickNoteTags, setQuickNoteTags] = useState<string[]>([]);
  const [morningIntention, setMorningIntention] = useState<string>("");
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<boolean>(false);

  // Load entry for date
  useEffect(() => {
    setIsSaved(false);
    setAiAnalysis(null);
    setCrisis(false);
    const saved = secureLocal.getItem("nilamind_diary");
    if (saved) {
      try {
        const entries: Record<string, DiaryCardEntry> = JSON.parse(saved);
        const existing = entries[selectedDate];
        if (existing) {
          setEmotions(existing.emotions);
          setSkillsUsed(existing.skillsUsed || []);
          setQuickNotes(existing.quickNotes || "");
          setQuickNoteTags(existing.quickNoteTags || []);
          setMorningIntention(existing.morningIntention || "");
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Default reset
    setEmotions({
      misery: 0,
      shame: 0,
      anger: 0,
      fear: 0,
      joy: 0,
      love: 0,
    });
    setSkillsUsed([]);
    setQuickNotes("");
    setQuickNoteTags([]);
    setMorningIntention("");
  }, [selectedDate]);

  const handleEmotionChange = (key: keyof typeof emotions, val: number) => {
    setEmotions((prev) => ({ ...prev, [key]: val }));
    setIsSaved(false);
  };

  const toggleSkill = (skill: string) => {
    setSkillsUsed((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
    setIsSaved(false);
  };

  const handleSave = () => {
    const saved = secureLocal.getItem("nilamind_diary");
    let entries: Record<string, DiaryCardEntry> = {};
    if (saved) {
      try {
        entries = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    entries[selectedDate] = {
      date: selectedDate,
      emotions,
      skillsUsed,
      quickNotes,
      quickNoteTags,
      morningIntention,
    };

    secureLocal.setItem("nilamind_diary", JSON.stringify(entries));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAnalyze = async () => {
    if (!quickNotes.trim()) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setCrisis(false);
    try {
      const result = await analyzeQuickNote(quickNotes); // §9-gated; crisis text never reaches the model
      if (result.crisis === false) {
        setAiAnalysis(result.analysis || "Unable to analyze right now.");
        // Replace tags with the model's set — an empty array clears now-stale tags from a prior run.
        setQuickNoteTags(result.tags);
        setIsSaved(false); // tags changed → prompt the user to save
      } else {
        setCrisis(true); // §9: surface crisis help, show no analysis
      }
    } catch (e) {
      setAiAnalysis("I couldn't reach Nila right now. Your note is safe — try again in a moment.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto" id="diary-card-screen">
      {/* Date Picker row */}
      <div className="flex justify-between items-center bg-card border border-slate-800 p-4 rounded-xl">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">DBT Diary Card</h1>
          <p className="text-xs text-slate-500">Your daily tracking metrics</p>
        </div>
        <div className="flex items-center gap-1.5 relative bg-page p-2 rounded-xl border border-slate-800">
          <Calendar className="w-4 h-4 text-blue-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer max-w-[110px]"
            aria-label="Diary date"
            id="diary-date-picker"
          />
        </div>
      </div>

      <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-6">
        {/* PART 1: Slide indicators for emotions */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            1. Daily Emotion Peak Ratings (0 to 5)
          </h3>

          {Object.entries(emotions).map(([key, val]) => (
            <div key={key} className="space-y-1.5" id={`diary-slider-row-${key}`}>
              <div className="flex justify-between text-xs font-semibold capitalize text-slate-200">
                <span>{key}</span>
                <span className="font-mono text-blue-400">{val} / 5</span>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={val}
                  onChange={(e) =>
                    handleEmotionChange(key as keyof typeof emotions, parseInt(e.target.value))
                  }
                  className="w-full h-1.5 rounded-lg bg-page accent-blue-500 cursor-pointer"
                  aria-label={`${key} rating (0 to 5)`}
                />
                
                {/* Visual Dot indicators as rapid tags */}
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleEmotionChange(key as keyof typeof emotions, num)}
                      className={`w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center cursor-pointer transition-all ${
                        val === num
                          ? "bg-blue-600 text-white"
                          : "bg-page text-slate-500 border border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PART 2: Skills list checklist */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            2. Skills I Used Today
          </h3>
          
          <div className="grid grid-cols-2 gap-2" id="skills-diary-grid">
            {ALL_DIARY_DBT_SKILLS.map((skill) => {
              const isChecked = skillsUsed.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    isChecked
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-semibold"
                      : "bg-page border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all ${
                    isChecked 
                      ? "bg-emerald-500 border-emerald-500 text-[#171311]" 
                      : "border-slate-800"
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span>{skill}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PART 3: Morning Intention */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            3. Morning Intention
          </h3>
          <input
            type="text"
            value={morningIntention}
            onChange={(e) => {
              setMorningIntention(e.target.value);
              setIsSaved(false);
            }}
            placeholder="e.g. Note to self..."
            aria-label="Morning Intention"
            className="w-full bg-page border border-slate-800 border-l-2 border-l-amber-500/50 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* PART 4: Quick Notes */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            4. Quick Notes
          </h3>
          <p className="text-[11px] text-slate-500">
            Jot down transient thoughts, observations, or brief reflections on your day.
          </p>
          <textarea
            value={quickNotes}
            onChange={(e) => {
              setQuickNotes(e.target.value);
              setIsSaved(false);
            }}
            placeholder="e.g., Felt a bit annoyed this morning before my meeting, but then practiced deep breathing. After lunch, I felt much more grounded."
            aria-label="Quick Notes"
            className="w-full bg-page border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-y"
          />
          
          {quickNoteTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickNoteTags.map((tag, idx) => (
                <span key={idx} className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-medium border border-blue-900/50">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !quickNotes.trim()}
              className="px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-blue-900/50"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Asking Nila...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Ask Nila</>
              )}
            </button>
          </div>

          {crisis && (
            <CrisisCard id="diary-crisis" className="mt-4" heading="What you wrote matters more than this note right now" />
          )}

          {aiAnalysis && !crisis && (
            <div className="mt-4 bg-slate-900/50 border border-blue-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-blue-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Nila's Insights ✨</span>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed markdown-body">
                <Markdown>{aiAnalysis}</Markdown>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <button
          onClick={handleSave}
          className={`w-full font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isSaved
              ? "bg-emerald-500 text-[#171311] font-bold"
              : "bg-blue-600 hover:bg-blue-500 text-white font-bold"
          }`}
          id="save-diary-btn"
        >
          {isSaved ? (
            <>
              <Check className="w-5 h-5 stroke-[2.5]" /> Log Saved Successfully
            </>
          ) : (
            <>
              <Clipboard className="w-4 h-4" /> Save Diary Entry
            </>
          )}
        </button>
      </div>
    </div>
  );
}
