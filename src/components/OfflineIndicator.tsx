import React, { useEffect, useState } from "react";
import { onOnlineChange, getOnlineStatus, getQueueLength } from "../services/offlineQueue";

function WifiOffIcon(): React.ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 12 18.5c-3.14 0-5.96-1.37-7.87-3.53" />
      <path d="M5 19.5A10.88 10.88 0 0 1 12 16.5" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function CloudOffIcon(): React.ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22.61 16.95A7.1 7.1 0 0 0 18 14h-2.5m-2.73 5.27A9.34 9.34 0 0 1 3 12c0-2.1.86-4.1 2.28-5.59" />
      <path d="M21 12c0 1.54-.62 2.94-1.6 3.9" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export function OfflineIndicator(): React.ReactElement | null {
  const [online, setOnline] = useState(getOnlineStatus());
  const [queueLength, setQueueLength] = useState(getQueueLength());

  useEffect(() => {
    const unsubOnline = onOnlineChange((online) => setOnline(online));
    const checkQueue = () => setQueueLength(getQueueLength());

    // Check queue periodically
    const interval = setInterval(checkQueue, 5000);
    checkQueue();

    return () => {
      unsubOnline();
      clearInterval(interval);
    };
  }, []);

  if (online && queueLength === 0) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
        online
          ? "bg-amber-500/90 text-amber-50"
          : "bg-red-500/90 text-red-50 animate-pulse"
      }`}
      role="status"
      aria-live="polite"
      aria-label={online ? "Syncing pending changes" : "Offline - changes will sync when online"}
    >
      {online ? (
        <React.Fragment>
          <span className="flex items-center gap-1">
            <WifiOffIcon />
            <span>Syncing {queueLength} change{queueLength !== 1 ? "s" : ""}...</span>
          </span>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <span className="flex items-center gap-1">
            <CloudOffIcon />
            <span>Offline</span>
          </span>
          {queueLength > 0 && (
            <span className="bg-black/30 px-2 py-0.5 rounded-full">
              {queueLength} pending
            </span>
          )}
        </React.Fragment>
      )}
    </div>
  );
}