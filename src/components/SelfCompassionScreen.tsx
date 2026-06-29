import { secureLocal } from "../services/secureLocal";
import React, { useState, useEffect, useRef } from "react";
import { CriticEntry, CompassionateLetter, ShameReflectEntry } from "../types";
import { Play, Pause, RefreshCw, Feather, Book, Heart, Sparkles } from "lucide-react";

export default function SelfCompassionScreen() {
  const [activeTab, setActiveTab] = useState<"soothing" | "critic" | "letter" | "shame">("soothing");

  // Soothing breath timer states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [breathPhase, setBreathPhase] = useState<"In" | "Out">("In");
  const [breathCount, setBreathCount] = useState<number>(1);
  const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form states and saved logs status
  const [savedStatus, setSavedStatus] = useState<boolean>(false);

  // 1. Critic state
  const [criticVoice, setCriticVoice] = useState<string>("");
  const [criticTrigger, setCriticTrigger] = useState<string>("");
  const [criticFriendResp, setCriticFriendResp] = useState<string>("");

  // 2. Letter state
  const [letterContent, setLetterContent] = useState<string>("");

  // 3. Shame protect state
  const [shameName, setShameName] = useState<string>("");
  const [shameOrigin, setShameOrigin] = useState<string>("");
  const [shameProtection, setShameProtection] = useState<string>("");
  const [shameKinderView, setShameKinderView] = useState<string>("");

  // Breathing loop effects (4 in, 6 out)
  useEffect(() => {
    if (isPlaying) {
      breathTimerRef.current = setInterval(() => {
        setBreathCount((prev) => {
          const limit = breathPhase === "In" ? 4 : 6;
          if (prev >= limit) {
            setBreathPhase((p) => p === "In" ? "Out" : "In");
            return 1;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (breathTimerRef.current) {
        clearInterval(breathTimerRef.current);
        breathTimerRef.current = null;
      }
    }
    return () => {
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, [isPlaying, breathPhase]);

  const saveCriticLog = () => {
    if (!criticVoice || !criticTrigger || !criticFriendResp) return;
    const newEntry: CriticEntry = {
      id: "crit_" + Date.now(),
      date: new Date().toLocaleDateString(),
      criticalVoice: criticVoice,
      trigger: criticTrigger,
      friendResponse: criticFriendResp
    };

    const saved = secureLocal.getItem("nilamind_critic_logs");
    let logs: CriticEntry[] = [];
    if (saved) {
      try { logs = JSON.parse(saved); } catch (e) { console.error(e); }
    }
    logs.push(newEntry);
    secureLocal.setItem("nilamind_critic_logs", JSON.stringify(logs));

    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      setCriticVoice("");
      setCriticTrigger("");
      setCriticFriendResp("");
    }, 1800);
  };

  const saveCompassionateLetter = () => {
    if (!letterContent) return;
    const newEntry: CompassionateLetter = {
      id: "let_" + Date.now(),
      date: new Date().toLocaleDateString(),
      content: letterContent
    };

    const saved = secureLocal.getItem("nilamind_compassionate_letters");
    let letters: CompassionateLetter[] = [];
    if (saved) {
      try { letters = JSON.parse(saved); } catch (e) { console.error(e); }
    }
    letters.push(newEntry);
    secureLocal.setItem("nilamind_compassionate_letters", JSON.stringify(letters));

    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      setLetterContent("");
    }, 1800);
  };

  const saveShameLog = () => {
    if (!shameName || !shameOrigin || !shameProtection || !shameKinderView) return;
    const newEntry: ShameReflectEntry = {
      id: "shm_" + Date.now(),
      date: new Date().toLocaleDateString(),
      shameName,
      shameOrigin,
      shameProtection,
      kinderView: shameKinderView
    };

    const saved = secureLocal.getItem("nilamind_shame_protect_logs");
    let logs: ShameReflectEntry[] = [];
    if (saved) {
      try { logs = JSON.parse(saved); } catch (e) { console.error(e); }
    }
    logs.push(newEntry);
    secureLocal.setItem("nilamind_shame_protect_logs", JSON.stringify(logs));

    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      setShameName("");
      setShameOrigin("");
      setShameProtection("");
      setShameKinderView("");
    }, 1800);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto" id="self-compassion-section">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Feather className="text-purple-400 w-5 h-5" />
            <span>Self-Compassion Area</span>
          </h1>
          <p className="text-xs text-slate-500">Compassion-Focused Therapy (CFT)</p>
        </div>
        {savedStatus && (
          <span className="text-xs text-purple-400 font-mono animate-pulse bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-1">
            Log Saved!
          </span>
        )}
      </div>

      <div className="text-xs text-slate-300 p-4 rounded-r-xl bg-purple-500/5 border-l-4 border-purple-500 border-y border-r border-slate-800/40 leading-relaxed">
        Self-criticism keeps your threat system switched on. Self-compassion switches on your soothing system — the one that actually triggers physiological safety and helps you cope.
      </div>

      {/* Tabs list */}
      <div className="grid grid-cols-4 bg-page p-1 gap-1 border border-slate-800 rounded-xl text-center" id="cft-navigation-tabs">
        <button
          onClick={() => { setActiveTab("soothing"); setIsPlaying(false); }}
          className={`text-[10px] py-2 rounded-lg font-bold uppercase transition-all cursor-pointer ${
            activeTab === "soothing" ? "bg-purple-650 bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Soothing
        </button>
        <button
          onClick={() => { setActiveTab("critic"); setIsPlaying(false); }}
          className={`text-[10px] py-2 rounded-lg font-bold uppercase transition-all cursor-pointer ${
            activeTab === "critic" ? "bg-purple-650 bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Critic
        </button>
        <button
          onClick={() => { setActiveTab("letter"); setIsPlaying(false); }}
          className={`text-[10px] py-2 rounded-lg font-bold uppercase transition-all cursor-pointer ${
            activeTab === "letter" ? "bg-purple-650 bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Letter
        </button>
        <button
          onClick={() => { setActiveTab("shame"); setIsPlaying(false); }}
          className={`text-[10px] py-2 rounded-lg font-bold uppercase transition-all cursor-pointer ${
            activeTab === "shame" ? "bg-purple-650 bg-purple-600 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Shame
        </button>
      </div>

      {/* CFT TAB PANELS */}
      <div className="bg-card border border-slate-800 p-5 rounded-2xl relative">
        {/* 1. Soothing rhythm breathing tab */}
        {activeTab === "soothing" && (
          <div className="space-y-6" id="cft-soothing-tab">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Feather className="text-purple-400 w-4 h-4" /> Soothing Rhythm Breathing
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Breathe in for 4 beats, out for 6. The prolonged exhale triggers parasympathetic vagal nerves for calming the heartbeat.
              </p>
            </div>

            {/* Breathing Guide circle */}
            <div className="flex flex-col items-center gap-4 py-3 bg-page rounded-2xl border border-slate-800">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <div
                  className={`absolute rounded-full bg-purple-500/10 border border-purple-500/40 transition-all duration-1000 ${
                    isPlaying
                      ? breathPhase === "In"
                        ? "w-32 h-32 bg-purple-500/20"
                        : "w-16 h-16 bg-purple-500/5"
                      : "w-24 h-24"
                  }`}
                />
                
                <div className="z-10 text-center">
                  <p className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                    {isPlaying ? (breathPhase === "In" ? "Inhale" : "Exhale") : "Ready"}
                  </p>
                  <p className="text-3xl font-black text-slate-100 font-mono mt-0.5">
                    {isPlaying ? breathCount : "0"}
                  </p>
                </div>
              </div>

              {/* Action play rows */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-card text-slate-300 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-lg cursor-pointer transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-purple-400" />}
                  <span>{isPlaying ? "Pause Timer" : "Begin Pacing"}</span>
                </button>
                <button
                  aria-label="Reset breathing timer"
                  onClick={() => {
                    setIsPlaying(false);
                    setBreathPhase("In");
                    setBreathCount(1);
                  }}
                  className="bg-card hover:bg-slate-800 border border-slate-800 p-2.5 rounded-lg cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Neff's Compassion cards */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
                Neff's Self-Compassion Break:
              </h4>
              <div className="p-4 bg-page border-l-4 border-purple-500 border-y border-r border-slate-800/55 rounded-r-xl space-y-2.5">
                <p className="text-xs text-slate-200 font-medium italic">
                  1. "This is a moment of suffering." <span className="text-slate-500 font-sans block not-italic text-[10px] font-normal mt-0.5">Acknowledge current pain or distress without denial.</span>
                </p>
                <p className="text-xs text-slate-200 font-medium italic">
                  2. "Suffering is part of being human." <span className="text-slate-500 font-sans block not-italic text-[10px] font-normal mt-0.5">Understand you are not isolated; struggles are universal.</span>
                </p>
                <p className="text-xs text-slate-200 font-medium italic">
                  3. "May I be kind to myself right now." <span className="text-slate-500 font-sans block not-italic text-[10px] font-normal mt-0.5">Commit to warm self-evaluation in this moment.</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Critic form logs */}
        {activeTab === "critic" && (
          <div className="space-y-4" id="cft-critic-tab">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-1">
              <Feather className="text-purple-400 w-4 h-4" /> Inner Critic Workbook
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  What did the critical voice say?
                </label>
                <textarea
                  aria-label="What did the critical voice say?"
                  value={criticVoice}
                  onChange={(e) => setCriticVoice(e.target.value)}
                  className="w-full h-16 bg-page border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all resize-none"
                  placeholder="e.g. 'You ruined this connection just like you ruin everything because of your insecurity...'"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  What set it off? (The trigger)
                </label>
                <input
                  type="text"
                  aria-label="What set it off? (The trigger)"
                  value={criticTrigger}
                  onChange={(e) => setCriticTrigger(e.target.value)}
                  className="w-full bg-page border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  placeholder="e.g. My message was left on read for four hours."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  What would you tell a beloved friend who felt this way?
                </label>
                <textarea
                  aria-label="What would you tell a beloved friend who felt this way?"
                  value={criticFriendResp}
                  onChange={(e) => setCriticFriendResp(e.target.value)}
                  className="w-full h-16 bg-page border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all resize-none"
                  placeholder="e.g. 'You were anxious. Waiting is hard. Friend is likely busy, not leaving. You deserve patience.'"
                />
              </div>
            </div>

            <button
              onClick={saveCriticLog}
              disabled={!criticVoice || !criticTrigger || !criticFriendResp}
              className={`w-full py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                criticVoice && criticTrigger && criticFriendResp
                  ? "bg-purple-600 hover:bg-purple-500 text-white font-bold"
                  : "bg-raised text-slate-500 border border-slate-800/80 cursor-not-allowed"
              }`}
            >
              Save Compassion Log
            </button>
          </div>
        )}

        {/* 3. Letter form draft */}
        {activeTab === "letter" && (
          <div className="space-y-4" id="cft-letter-tab">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-1">
              <Feather className="text-purple-400 w-4 h-4" /> Compassionate Letter Writing
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 block leading-relaxed">
                Write a brief letter to yourself the way a loving, completely accepting observer would (someone who does not judge you):
              </label>
              <textarea
                aria-label="Write a brief letter to yourself the way a loving, completely accepting observer would (someone who does not judge you):"
                value={letterContent}
                onChange={(e) => setLetterContent(e.target.value)}
                className="w-full h-44 bg-page border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all resize-none"
                placeholder="Dear Sampath... I know you are in immense pain right now. That is okay. You are doing your best, even when it feels like everything is falling apart... you are lovable."
              />
            </div>

            <button
              onClick={saveCompassionateLetter}
              disabled={!letterContent}
              className={`w-full py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                letterContent
                  ? "bg-purple-600 hover:bg-purple-500 text-white font-bold"
                  : "bg-raised text-slate-500 border border-slate-800/80 cursor-not-allowed"
              }`}
            >
              Save my letter
            </button>
          </div>
        )}

        {/* 4. Shame protector worksheet */}
        {activeTab === "shame" && (
          <div className="space-y-4" id="cft-shame-tab">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-1">
              <Feather className="text-purple-400 w-4 h-4" /> What Shame Protects
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Name the shame:
                </label>
                <input
                  type="text"
                  aria-label="Name the shame:"
                  value={shameName}
                  onChange={(e) => setShameName(e.target.value)}
                  className="w-full bg-page border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  placeholder="e.g. Feeling like a burden to my partner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Where do you think this shame arose from?
                </label>
                <input
                  type="text"
                  aria-label="Where do you think this shame arose from?"
                  value={shameOrigin}
                  onChange={(e) => setShameOrigin(e.target.value)}
                  className="w-full bg-page border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  placeholder="e.g. Childhood environment where emotional needs were mocked"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  What is it attempting to protect you from?
                </label>
                <textarea
                  aria-label="What is it attempting to protect you from?"
                  value={shameProtection}
                  onChange={(e) => setShameProtection(e.target.value)}
                  className="w-full h-14 bg-page border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all resize-none"
                  placeholder="e.g. Keeping me quiet so I don't risk getting rejected or being disappointed again."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  A kinder, more realistic way to view this protective driver:
                </label>
                <textarea
                  aria-label="A kinder, more realistic way to view this protective driver:"
                  value={shameKinderView}
                  onChange={(e) => setShameKinderView(e.target.value)}
                  className="w-full h-14 bg-page border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all resize-none"
                  placeholder="e.g. My nervous system is trying to keep me safe. I can thank it for protecting me, but choose to express my needs anyway."
                />
              </div>
            </div>

            <button
              onClick={saveShameLog}
              disabled={!shameName || !shameOrigin || !shameProtection || !shameKinderView}
              className={`w-full py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                shameName && shameOrigin && shameProtection && shameKinderView
                  ? "bg-purple-600 hover:bg-purple-500 text-white font-bold"
                  : "bg-raised text-slate-500 border border-slate-800/80 cursor-not-allowed"
              }`}
            >
              Log Shame Reflection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
