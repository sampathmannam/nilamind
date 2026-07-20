import React from "react";

/** A calm, one-line narrative strip shown at the top of an expanded dashboard band. It gives the
 *  user the gist before they scroll the cards below (narrative-first for distressed users). */
export default function BandNarrative({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="text-[13px] text-ink-2 leading-relaxed bg-fill/60 border border-line rounded-xl px-3 py-2">
      {text}
    </p>
  );
}
