import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Timer, X } from "lucide-react";
import {
  startNoise,
  stopNoise,
  setVolume,
  getAmbientState,
  getNoiseInfo,
  allNoiseTypes,
  type NoiseType,
} from "../services/ambientSound";
import { hapticLight } from "../hooks/useHaptics";
import { useLanguage } from "../services/i18n";

interface Props {
  onClose?: () => void;
  /** Compact mode for inline display (no close button, smaller layout). */
  compact?: boolean;
}

const TIMER_OPTIONS = [
  { label: "Off", minutes: 0 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "60 min", minutes: 60 },
];

/**
 * SoundPlayer — minimal, beautiful ambient sound player.
 * Uses Web Audio API to generate noise on-device. No files, no network.
 * Inspired by Calm's sound mixer and Headspace's ambient sounds.
 */
export default function SoundPlayer({ onClose, compact = false }: Props) {
  useLanguage();
  const [playing, setPlaying] = useState(false);
  const [selectedType, setSelectedType] = useState<NoiseType>("brown");
  const [volume, setVolumeState] = useState(0.3);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync with actual audio state
  useEffect(() => {
    const state = getAmbientState();
    setPlaying(state.playing);
    if (state.type) setSelectedType(state.type);
    if (state.volume > 0) setVolumeState(state.volume);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timerMinutes > 0 && playing) {
      setTimerRemaining(timerMinutes * 60);
      timerRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            stopNoise();
            setPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setTimerRemaining(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [timerMinutes, playing]);

  const togglePlay = () => {
    hapticLight();
    if (playing) {
      stopNoise();
      setPlaying(false);
    } else {
      startNoise(selectedType, volume);
      setPlaying(true);
    }
  };

  const selectType = (type: NoiseType) => {
    hapticLight();
    setSelectedType(type);
    if (playing) {
      startNoise(type, volume);
    }
  };

  const handleVolume = (v: number) => {
    setVolumeState(v);
    setVolume(v);
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const noiseTypes = allNoiseTypes();

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className={`p-3 rounded-full transition-all cursor-pointer ${
            playing
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          aria-label={playing ? "Pause ambient sound" : "Play ambient sound"}
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <div className="flex gap-1.5">
          {noiseTypes.map((type) => {
            const info = getNoiseInfo(type);
            return (
              <button
                key={type}
                onClick={() => selectType(type)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedType === type
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
                }`}
                title={info.description}
              >
                {info.icon}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="sound-player">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">Ambient sounds</p>
          <p className="text-xs text-slate-500">Generated on-device — no files, no network</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sound grid */}
      <div className="grid grid-cols-2 gap-2">
        {noiseTypes.map((type) => {
          const info = getNoiseInfo(type);
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => selectType(type)}
              className={`glass p-3 rounded-xl text-left transition-all cursor-pointer ${
                isSelected ? "ring-1 ring-blue-500/50 bg-blue-500/5" : "hover:brightness-110"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{info.icon}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${isSelected ? "text-blue-300" : "text-slate-300"}`}>
                    {info.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{info.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Play/Pause */}
      <div className="flex items-center justify-center">
        <button
          onClick={togglePlay}
          className={`p-4 rounded-full transition-all cursor-pointer ${
            playing
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          }`}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleVolume(volume > 0 ? 0 : 0.3)}
          className="text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => handleVolume(Number(e.target.value))}
          className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-400"
          aria-label="Volume"
        />
        <span className="text-xs text-slate-500 w-8 text-right">{Math.round(volume * 100)}%</span>
      </div>

      {/* Timer */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500">Auto-stop</span>
          {timerRemaining > 0 && (
            <span className="text-xs text-amber-400 font-mono ml-auto">{formatTime(timerRemaining)}</span>
          )}
        </div>
        <div className="flex gap-1.5">
          {TIMER_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              onClick={() => { setTimerMinutes(opt.minutes); hapticLight(); }}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                timerMinutes === opt.minutes
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
