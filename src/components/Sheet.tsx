import React, { Suspense, useEffect, useRef } from "react";
import { X } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";

// Safe-area top inset shared by every sheet header so it isn't hard-coded
// inline at each call site (was repeated 7× across App.tsx).
const SAFE_TOP = "var(--safe-top)";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move keyboard/screen-reader focus INTO the sheet on open, and restore it to the previously-focused
  // element on close (2026-07-18 design review: sheets never took focus, so keyboard users stayed on the
  // element behind the overlay). Not a full Tab-trap, but it lands focus in the dialog and returns it.
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    dialogRef.current?.focus();
    return () => { try { prevFocusRef.current?.focus?.(); } catch { /* previously-focused node gone */ } };
  }, [open]);

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
      ref={dialogRef}
      tabIndex={-1}
      className={`fixed inset-0 z-50 bg-page flex flex-col outline-none ${closing ? "animate-slide-out" : "animate-slide-in"}`}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0"
        style={{ paddingTop: SAFE_TOP }}
      >
        {/* Heading element (not a bare span) so screen-reader users can navigate by heading and the sheet
            announces a title landmark. aria-label on the dialog still carries the accessible name. */}
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <button onClick={onClose} className={CLOSE_BTN} aria-label="Close">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      {/* Bottom safe-area padding so the last item in long, scrollable sheets (Settings → Advanced,
          Safety Plan → Means-safety coaching) clears the Android gesture bar instead of being cut off
          at the screen edge (device screenshots 2026-07-15). Composes with any bodyClassName padding. */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName ?? ""}`}
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        {body}
      </div>
    </div>
  );
}
