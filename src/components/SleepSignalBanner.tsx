import React from "react";
import { Moon, X } from "lucide-react";

interface SleepSignalBannerProps {
  onDismiss?: () => void;
  onWindDown?: () => void;
}

/** Default-on, pact-independent surface for the short-sleep manic-prodrome signal (audit fix #4).
 *  Deliberately DATALESS: it never states hours or nights, never diagnoses, never alarms — just a soft
 *  invitation to wind down. Tapping opens the wind-down flow; dismissing hides it for this session. */
export default function SleepSignalBanner({ onDismiss, onWindDown }: SleepSignalBannerProps) {
  return (
    <div
      className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3.5 py-3 flex items-start gap-3"
      role="status"
      aria-live="polite"
    >
      <Moon className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-indigo-100/90 leading-relaxed">
          Your rest has been a little short lately. Want to wind down together?
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={onWindDown}
            className="text-[11px] font-medium text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 active:bg-indigo-500/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            Wind down
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] text-indigo-300/80 hover:text-indigo-200 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-indigo-300/70 hover:text-indigo-200 transition-colors p-0.5"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
