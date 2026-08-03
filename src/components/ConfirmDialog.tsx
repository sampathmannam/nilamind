import React from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger",
}: Props) {
  if (!open) return null;

  const confirmColor =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-500 text-white"
      : variant === "warning"
      ? "bg-warn hover:opacity-90 text-white"
      : "bg-accent hover:opacity-90 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-fill border border-line-strong rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4 animate-fade-in">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink-muted leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold text-ink-muted hover:text-ink-2 border border-line hover:border-line-strong transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold transition-colors cursor-pointer ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
