import React from "react";
import NilaCharacter from "./NilaCharacter";
import type { NilaState } from "./NilaCharacter";

interface IllustrationProps {
  size?: number;
}

/**
 * Pre-built empty state illustrations using NilaCharacter.
 * Each shows Nila in a different context with simple geometric background elements.
 * Designed to feel warm and inviting, not clinical.
 */

export function NoCheckinsIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="greeting" size={size} />
      {/* Small calendar icon */}
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center">
        <span className="text-[8px] text-slate-400 font-mono">1</span>
      </div>
    </div>
  );
}

export function NoEpisodesIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="calm" size={size} />
      {/* Peaceful landscape hint */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-emerald-500/10" />
    </div>
  );
}

export function NoMoodDataIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="supporting" size={size} />
      {/* Small chart hint */}
      <div className="absolute -bottom-1 -right-1 flex gap-0.5 items-end">
        <div className="w-1.5 h-3 rounded-sm bg-blue-400/30" />
        <div className="w-1.5 h-5 rounded-sm bg-blue-400/40" />
        <div className="w-1.5 h-4 rounded-sm bg-blue-400/30" />
      </div>
    </div>
  );
}

export function NoCaregiverIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="supporting" size={size * 0.7} />
      {/* Second smaller orb — the "trusted person" */}
      <div className="absolute -right-2 bottom-2">
        <NilaCharacter state="calm" size={size * 0.4} ariaLabel="A trusted person" />
      </div>
      {/* Connection line */}
      <div className="absolute bottom-4 left-1/2 w-8 h-px bg-blue-400/20" />
    </div>
  );
}

export function NoWellbeingIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="calm" size={size} />
      {/* Heart pulse */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
        <svg width={24} height={12} viewBox="0 0 24 12">
          <path d="M0 6 L6 6 L8 2 L10 10 L12 4 L14 8 L16 6 L24 6" fill="none" stroke="rgba(124,107,158,0.3)" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function NoAssessmentsIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="supporting" size={size} />
      {/* Clipboard hint */}
      <div className="absolute -bottom-1 -right-1 w-5 h-6 rounded-sm bg-slate-800/80 border border-slate-700">
        <div className="w-3 h-px bg-slate-600 mx-auto mt-1" />
        <div className="w-2 h-px bg-slate-600 mx-auto mt-0.5" />
      </div>
    </div>
  );
}

export function NoInsightsIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="greeting" size={size} />
      {/* Lightbulb hint */}
      <div className="absolute -top-1 -right-1 text-amber-400/40 text-lg">💡</div>
    </div>
  );
}

export function NoMedicationsIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="calm" size={size} />
      {/* Pill hint */}
      <div className="absolute -bottom-1 -right-1 w-4 h-2 rounded-full bg-blue-400/30 border border-blue-400/20" />
    </div>
  );
}

export function NoProtocolsIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="supporting" size={size} />
      {/* Toolkit hint */}
      <div className="absolute -bottom-1 -right-1 w-5 h-4 rounded-sm bg-amber-400/20 border border-amber-400/15">
        <div className="w-2 h-1 bg-amber-400/30 mx-auto mt-0.5 rounded-full" />
      </div>
    </div>
  );
}

export function NoDiaryIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="calm" size={size} />
      {/* Book hint */}
      <div className="absolute -bottom-1 -right-1 w-5 h-6 rounded-sm bg-purple-400/20 border border-purple-400/15">
        <div className="w-px h-4 bg-purple-400/20 absolute left-1/2 top-1" />
      </div>
    </div>
  );
}

export function NoSleepIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="resting" size={size} />
      {/* Moon hint */}
      <div className="absolute -top-1 -right-1 text-indigo-400/40 text-sm">🌙</div>
    </div>
  );
}

export function NoRhythmIllustration({ size = 80 }: IllustrationProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size * 1.5, height: size }}>
      <NilaCharacter state="calm" size={size} />
      {/* Clock hint */}
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-amber-400/20 flex items-center justify-center">
        <div className="w-px h-2 bg-amber-400/30 origin-bottom" style={{ transform: "rotate(45deg)" }} />
      </div>
    </div>
  );
}

/** Map from illustration key to component. */
export const ILLUSTRATIONS: Record<string, React.FC<IllustrationProps>> = {
  noCheckins: NoCheckinsIllustration,
  noEpisodes: NoEpisodesIllustration,
  noMoodData: NoMoodDataIllustration,
  noCaregiver: NoCaregiverIllustration,
  noWellbeing: NoWellbeingIllustration,
  noAssessments: NoAssessmentsIllustration,
  noInsights: NoInsightsIllustration,
  noMedications: NoMedicationsIllustration,
  noProtocols: NoProtocolsIllustration,
  noDiary: NoDiaryIllustration,
  noSleep: NoSleepIllustration,
  noRhythm: NoRhythmIllustration,
};
