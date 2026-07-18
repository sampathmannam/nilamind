import React, { Suspense } from "react";
import { X } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Safe-area top inset shared by every sheet header so it isn't hard-coded
// inline at each call site (was repeated 7× across App.tsx).
const SAFE_TOP = "var(--safe-top)";

// Re-architecture Phase 0: this shared overlay is the reference migration from remapped Tailwind ramps
// to semantic role tokens (text-ink, border-line, ring-accent, bg-fill). Values are the same; the classes
// now say what they mean. (hover:text-ink is a single imperceptible shade brighter than the old
// slate-200 — the hover-to-primary-ink role — an intentional simplification.)
const CLOSE_BTN =
  "p-2 rounded-full hover:bg-fill text-ink-muted hover:text-ink cursor-pointer " +
  "focus-visible:ring-2 focus-visible:ring-accent min-w-[44px] min-h-[44px] flex items-center " +
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
  // Focus-trap + scoped Escape + focus restore, shared with every other modal (crisis overlay, pickers).
  // Only the topmost open trap responds to Escape/Tab, so stacked sheets don't all close at once.
  const dialogRef = useFocusTrap<HTMLDivElement>(open, onClose);

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
        className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0"
        style={{ paddingTop: SAFE_TOP }}
      >
        {/* Heading element (not a bare span) so screen-reader users can navigate by heading and the sheet
            announces a title landmark. aria-label on the dialog still carries the accessible name. */}
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
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
