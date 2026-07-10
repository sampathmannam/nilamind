import React, { useEffect, useState } from "react";
import { getArmedCheckin, armedCheckinPrompt, markCheckinFired } from "../services/armedCheckin";


export default function ArmedCheckInScreen({ onClose }: { onClose?: () => void }) {
  const [entry, setEntry] = useState<ReturnType<typeof getArmedCheckin>>(null);

  useEffect(() => {
    const e = getArmedCheckin();
    setEntry(e);
  }, []);

  if (!entry) {
    return (
      <div className="p-6 text-center text-slate-400" id="armed-checkin-none">
        No pending check‑in.
        {onClose && (
          <button onClick={onClose} className="block mt-4 text-sm text-slate-300 underline">
            Close
          </button>
        )}
      </div>
    );
  }

  const prompt = armedCheckinPrompt(entry);

  const handleDismiss = () => {
    markCheckinFired();
    onClose?.();
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-6" id="armed-checkin-screen">
      <h2 className="text-lg font-semibold text-slate-100">{prompt}</h2>
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 bg-purple-600 hover:bg-purple-500 text-slate-100 py-2 rounded-xl"
        >
          Dismiss
        </button>
        {onClose && (
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-xl">
            Close
          </button>
        )}
      </div>
    </div>
  );
}
