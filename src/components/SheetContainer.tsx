// SheetContainer — shared slide-in animation wrapper for all sheet/overlay screens.
// 200ms translateY with ease-out (enters from below, exits downward).
// Research: Apple HIG "transitions provide visual continuity"; Material Design "motion expresses spatial relationships."
import React from "react";

interface SheetContainerProps {
  id: string;
  children: React.ReactNode;
}

export default function SheetContainer({ id, children }: SheetContainerProps) {
  return (
    <>
      <style>{`
        @keyframes sheet-slide-in {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes sheet-slide-out {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes tab-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        id={id}
        className="fixed inset-0 z-50 bg-page flex flex-col"
        style={{ animation: "sheet-slide-in 200ms ease-out" }}
      >
        {children}
      </div>
    </>
  );
}
