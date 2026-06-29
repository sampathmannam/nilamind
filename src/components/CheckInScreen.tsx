import { secureLocal } from "../services/secureLocal";
import React, { useState } from "react";
import { CheckInEntry } from "../types";
import { 
  PRIMARY_EMOTIONS, 
  SECONDARY_EMOTIONS_MAP, 
  getNeuroExplanation 
} from "../data";
import { Check, ClipboardList, BookOpen, AlertCircle } from "lucide-react";

interface CheckInScreenProps {
  onCheckInSaved: () => void;
  onNavigateToCoach: () => void;
}

// Map primary emotions to safe color tags
const EMOTION_COLORS: Record<string, string> = {
  Fear: "bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30",
  Anger: "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30",
  Sadness: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30",
  Disgust: "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30",
  Surprise: "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30",
  Joy: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30",
  Trust: "bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30",
  Anticipation: "bg-slate-600/20 text-slate-300 border-slate-500/40 hover:bg-slate-600/30",
};

export default function CheckInScreen({ onCheckInSaved, onNavigateToCoach }: CheckInScreenProps) {
  // One tap logger states
  const [oneTapLogged, setOneTapLogged] = useState<string | null>(null);

  // Full checker states
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Pick & Rate, Step 2: Neuroscience overview
  const [selectedEmotion, setSelectedEmotion] = useState<string>("");
  const [selectedSubEmotion, setSelectedSubEmotion] = useState<string>("");
  const [intensity, setIntensity] = useState<number>(5);
  const [context, setContext] = useState<string>("Not sure");
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [socialInteraction, setSocialInteraction] = useState<number>(5);
  const [showSubEmotions, setShowSubEmotions] = useState<boolean>(false);

  // Handle one tap
  const handleOneTap = (label: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newEntry: CheckInEntry = {
      id: "ch_" + Date.now(),
      date: todayStr,
      timestamp: new Date().toLocaleTimeString(),
      emotion: `${label} (One-Tap)`,
      intensity: label === "Low" ? 2 : label === "Anxious" ? 7 : label === "Angry" ? 8 : label === "Numb" ? 6 : 4,
      context: "Quick check-in"
    };

    const saved = secureLocal.getItem("nilamind_checkins");
    let checkins: CheckInEntry[] = [];
    if (saved) {
      try { checkins = JSON.parse(saved); } catch (e) { console.error(e); }
    }
    checkins.push(newEntry);
    secureLocal.setItem("nilamind_checkins", JSON.stringify(checkins));

    setOneTapLogged(label);
    onCheckInSaved();
    setTimeout(() => {
      setOneTapLogged(null);
    }, 4000);
  };

  // Save full flow checkin
  const handleSaveFullCheckIn = () => {
    if (!selectedEmotion) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const finalEmotionName = selectedSubEmotion 
      ? selectedSubEmotion 
      : selectedEmotion;

    const newEntry: CheckInEntry = {
      id: "ch_" + Date.now(),
      date: todayStr,
      timestamp: new Date().toLocaleTimeString(),
      emotion: finalEmotionName,
      intensity: intensity,
      context: context,
      sleepHours: sleepHours,
      socialInteraction: socialInteraction
    };

    const saved = secureLocal.getItem("nilamind_checkins");
    let checkins: CheckInEntry[] = [];
    if (saved) {
      try { checkins = JSON.parse(saved); } catch (e) { console.error(e); }
    }
    checkins.push(newEntry);
    secureLocal.setItem("nilamind_checkins", JSON.stringify(checkins));

    setStep(2); // Progress to neuropsych explanation card
    onCheckInSaved();
  };

  const handleReset = () => {
    setStep(1);
    setSelectedEmotion("");
    setSelectedSubEmotion("");
    setIntensity(5);
    setContext("Not sure");
    setSleepHours(7);
    setSocialInteraction(5);
    setShowSubEmotions(false);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto" id="checkin-screen">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Check-In</h1>
        <p className="text-xs text-slate-500">Logging how you feel creates local data patterns</p>
      </div>

      {/* ONE TAP PANEL */}
      <div className="bg-card border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Or check in with just one tap:</h3>
        
        {oneTapLogged ? (
          <div className="py-2 text-center text-emerald-400 font-medium flex items-center justify-center gap-2 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl transition-all">
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Logged '{oneTapLogged}'. That's enough for right now.</span>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2" id="one-tap-grid">
            {["Low", "Anxious", "Angry", "Numb", "Okay"].map((label) => (
              <button
                key={label}
                onClick={() => handleOneTap(label)}
                className="bg-raised hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium py-3 rounded-xl transition-all active:scale-95 cursor-pointer text-center"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FULL DETAILED CHECK-IN FLOW */}
      {step === 1 ? (
        <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ClipboardList className="text-blue-400 w-5 h-5" />
            <h2 className="text-base font-semibold text-slate-100">Detailed Check-In</h2>
          </div>

          {/* Plutchik's Grid of 8 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
              1. What's the closest primary feeling?
            </label>
            <div className="grid grid-cols-2 gap-2" id="primary-feelings-grid">
              {PRIMARY_EMOTIONS.map((emo) => {
                const isSelected = selectedEmotion === emo;
                const activeColor = EMOTION_COLORS[emo] || "bg-slate-800";

                return (
                  <button
                    key={emo}
                    onClick={() => {
                      setSelectedEmotion(emo);
                      setSelectedSubEmotion(""); // Reset sub-emotion
                    }}
                    className={`border px-4 py-3 rounded-xl text-sm font-semibold transition-all text-center cursor-pointer ${
                      isSelected 
                        ? `${activeColor} ring-2 ring-blue-500/80` 
                        : "bg-raised border-slate-800 text-slate-400 hover:text-slate-100"
                    }`}
                  >
                    {emo}
                  </button>
                );
              })}
            </div>
          </div>

          {/* More details toggle of nested secondary feelings */}
          {selectedEmotion && (
            <div className="space-y-3 bg-page p-4 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setShowSubEmotions(!showSubEmotions)}
                className="text-xs font-semibold text-blue-400 hover:underline flex justify-between items-center w-full focus:outline-none cursor-pointer"
              >
                <span>{showSubEmotions ? "Hide secondary emotions" : "Can you be more specific? (nested secondaries)"}</span>
                <span>{showSubEmotions ? "▼" : "▶"}</span>
              </button>

              {showSubEmotions && (
                <div className="grid grid-cols-2 gap-1.5 pt-2" id="secondary-feelings-grid">
                  {(SECONDARY_EMOTIONS_MAP[selectedEmotion] || []).map((sub) => {
                    const isSubSelected = selectedSubEmotion === sub;
                    return (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubEmotion(sub)}
                        className={`text-xs px-3 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                          isSubSelected
                            ? "bg-blue-500/10 border-blue-500 text-blue-300 font-bold"
                            : "bg-card border-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSubEmotion && (
                <p className="text-xs text-emerald-400 font-sans">
                  Selected specificity: <span className="font-semibold">{selectedSubEmotion}</span> ({selectedEmotion})
                </p>
              )}
            </div>
          )}

          {/* Intensity slider 1-10 */}
          {selectedEmotion && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">
                  2. How strong is it?
                </label>
                <span className="text-base font-black font-mono px-2.5 py-0.5 bg-page text-slate-100 rounded-md border border-slate-800">
                  {intensity}/10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg bg-page accent-blue-500 cursor-pointer"
                aria-label="2. How strong is it?"
                id="checkin-intensity-slider"
              />
              <div className="flex justify-between text-[11px] font-medium text-slate-500 font-sans">
                <span>Barely there</span>
                <span>Moderate</span>
                <span>Overwhelming</span>
              </div>
            </div>
          )}

          {/* Context tagging */}
          {selectedEmotion && (
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-medium text-slate-300">
                3. What's behind it?
              </label>
              <div className="flex flex-wrap gap-2" id="context-tags">
                {[
                  "Sleep",
                  "Relationships",
                  "Work",
                  "Body/Health",
                  "Thoughts",
                  "A specific event",
                  "Not sure",
                ].map((tag) => {
                  const isChecked = context === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setContext(tag)}
                      className={`text-xs px-3.5 py-2 rounded-full border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-blue-600 border-blue-600 text-white font-semibold"
                          : "bg-page border-slate-800 text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* External Factors */}
          {selectedEmotion && (
            <div className="space-y-6 pt-4 border-t border-slate-800">
              <label className="block text-sm font-medium text-slate-300">
                4. External Factors (Optional)
              </label>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">Sleep Last Night</span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-page text-slate-100 rounded-md border border-slate-800">
                    {sleepHours} hrs
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg bg-page accent-blue-500 cursor-pointer"
                  aria-label="Sleep Last Night"
                />
                <div className="flex justify-between text-[11px] font-medium text-slate-500 font-sans">
                  <span>None</span>
                  <span>7 hrs</span>
                  <span>14+ hrs</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">Social Interaction</span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-page text-slate-100 rounded-md border border-slate-800">
                    {socialInteraction}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={socialInteraction}
                  onChange={(e) => setSocialInteraction(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg bg-page accent-blue-500 cursor-pointer"
                  aria-label="Social Interaction"
                />
                <div className="flex justify-between text-[11px] font-medium text-slate-500 font-sans">
                  <span>Completely Isolated</span>
                  <span>Highly Connected</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <button
            onClick={handleSaveFullCheckIn}
            disabled={!selectedEmotion}
            className={`w-full font-semibold py-3.5 rounded-xl transition-all cursor-pointer ${
              selectedEmotion
                ? "bg-blue-600 hover:bg-blue-500 text-white font-bold"
                : "bg-raised text-slate-500 border border-slate-800/30 cursor-not-allowed"
            }`}
            id="save-checkin-btn"
          >
            Save Check-In
          </button>
        </div>
      ) : (
        /* NEUROSCIENCE RETROSPECTIVE CARD (Why might I feel this?) */
        <div className="bg-card border border-slate-800 p-5 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-emerald-400">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-base font-semibold text-slate-100 font-display">Insight & Retrospective</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-page rounded-xl border border-slate-800/80 space-y-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                Log Registered
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Emotion: <span className="text-blue-400">{selectedSubEmotion || selectedEmotion}</span>
              </p>
              <p className="text-sm text-slate-350">
                Intensity: <span className="font-mono text-xs text-slate-200">{intensity}/10</span> | Trigger: <span className="font-sans text-xs text-slate-300">{context}</span>
              </p>
            </div>

            {/* Neuro Explanation Display */}
            <div className="bg-emerald-500/5 border-l-4 border-emerald-500 p-4 rounded-r-xl space-y-2 relative border-y border-r border-slate-800/40">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-sans">
                Neuroscience perspective:
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "{getNeuroExplanation(selectedSubEmotion || selectedEmotion)}"
              </p>
            </div>
          </div>

          {/* Navigation Action Hub */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                handleReset();
                onNavigateToCoach();
              }}
              className="bg-raised border border-slate-800 hover:bg-slate-800 text-blue-400 text-xs font-semibold py-3.5 rounded-xl text-center cursor-pointer"
              id="talk-to-coach-checkin-shortcut"
            >
              Talk with Nila
            </button>
            <button
              onClick={handleReset}
              className="bg-emerald-500 hover:bg-emerald-400 text-xs text-[#171311] font-extrabold py-3.5 rounded-xl text-center cursor-pointer"
              id="done-checkin-shortcut"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
