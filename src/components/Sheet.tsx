import React, { Suspense, useEffect } from "react";
import { X } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";

// Safe-area top inset shared by every sheet header so it isn't hard-coded
// inline at each call site (was repeated 7× across App.tsx).
const SAFE_TOP = "max(12px, env(safe-area-inset-top))";

const CLOSE_BTN =
  "p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer " +
  "focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center " +
  "justify-center";

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** id for the root overlay (used by tests / deep-link targeting). */
  id?: string;
  /** Animate out instead of in (used while a sheet is mid-close). */
  closing?: boolean;
  /** Wrap children in an ErrorBoundary so one aux screen can't blank the app. */
  faultIsolated?: boolean;
  /** Extra classes for the scrollable body (e.g. "p-4" for padded sheets). */
  bodyClassName?: string;
  /** Provide a custom Suspense fallback (aux views reuse ScreenFallback by default). */
  children: React.ReactNode;
}

/**
 * Single source of truth for the app's full-screen overlay sheets. Replaces the
 * 6 nearly-identical header/close-button blocks that were copy-pasted across
 * App.tsx. Handles the shared chrome, safe-area inset, Esc-to-close, and
 * optional fault isolation.
 */
export default function Sheet({
  open,
  title,
  onClose,
  id,
  closing,
  faultIsolated,
  bodyClassName,
  children,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const body = faultIsolated ? (
    <ErrorBoundary
      name={id ?? "sheet"}
      onError={(err: Error, info: React.ErrorInfo) =>
        console.error(`[ErrorBoundary:${id ?? "sheet"}] caught:`, err, info)
      }
    >
      {children}
    </ErrorBoundary>
  ) : (
    children
  );

  return (
    <div
      className={`fixed inset-0 z-50 bg-page flex flex-col ${closing ? "animate-slide-out" : "animate-slide-in"}`}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0"
        style={{ paddingTop: SAFE_TOP }}
      >
        <span className="text-sm font-semibold text-slate-100">{title}</span>
        <button onClick={onClose} className={CLOSE_BTN} aria-label="Close">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName ?? ""}`}>{body}</div>
    </div>
  );
}
