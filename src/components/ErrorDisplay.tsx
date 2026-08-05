// ErrorDisplay — a warm, non-intrusive error message for async operations.
// Used to surface errors that were previously swallowed (e.g., "catch { return false }").
// Designed to feel like a gentle companion alert, not a system crash.

import React, { useState, useEffect } from "react";
import { AlertCircle, Info } from "lucide-react";
import { t, useLanguage } from "../services/i18n";

interface ErrorDisplayProps {
  /** Error message to display. */
  message: string;
  /** Type of error for visual styling. */
  type?: "error" | "warning" | "info";
  /** Auto-dismiss duration in ms (null for persistent). */
  dismissDelay?: number;
  /** Whether the error is currently visible. */
  isVisible: boolean;
  /** Callback when error is dismissed. */
  onDismiss: () => void;
}

export default function ErrorDisplay({
  message,
  type = "error",
  dismissDelay,
  isVisible,
  onDismiss,
}: ErrorDisplayProps) {
  const lang = useLanguage();
  const [isVisibleState, setIsVisibleState] = useState(isVisible);

  useEffect(() => {
    setIsVisibleState(isVisible);
    if (isVisible && dismissDelay) {
      const timer = setTimeout(() => {
        setIsVisibleState(false);
        onDismiss();
      }, dismissDelay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, dismissDelay, onDismiss]);

  if (!isVisibleState) return null;

  const typeConfig = {
    error: {
      icon: AlertCircle,
      className: "bg-rose-500/10 border-rose-500/20 text-rose-300",
      label: t("error_default_title", lang) || "Something went wrong",
    },
    warning: {
      icon: AlertCircle,
      className: "bg-warn/10 border-warn/20 text-warn-hi",
      label: t("warning_default_title", lang) || "Heads up",
    },
    info: {
      icon: Info,
      className: "bg-accent/10 border-accent/20 text-accent-hi",
      label: t("info_default_title", lang) || "Information",
    },
  }[type];

  const Icon = typeConfig.icon;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border px-4 py-3 shadow-lg glass animate-fade-in ${typeConfig.className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{typeConfig.label}</p>
          <p className="text-base leading-relaxed mt-0.5">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisibleState(false);
            onDismiss();
          }}
          className="shrink-0 p-1.5 rounded-lg text-ink-faint hover:text-ink-2 hover:bg-fill/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={t("dismiss_error", lang) || "Dismiss"}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}