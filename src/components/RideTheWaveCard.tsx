import { useState } from "react";
import { Waves, Snowflake } from "lucide-react";

// "Ride out the next few minutes" — the de-escalation content the crisis screen was missing (user
// complaint: the app just pushes the safety gate and the person is left with nothing). Structure and
// copy grounded in: Simon et al. 2001 and Deisenhammer et al. 2009 (the acute decision-to-act window is
// usually minutes, not hours — the temporal fact is itself therapeutic content); Jungmann et al. 2018,
// JMIR Form Res (cold facial/neck stimulation raises HRV via the dive reflex); Now Matters Now
// (Whiteside et al. 2019, JMIR 21(5):e13183 — a self-administered skills page is associated with
// in-the-moment reduction in suicidal-thought intensity, incl. in the highest-severity subgroup);
// Papageno effect (Niederkrotenthaler et al. 2010) — coping-focused, method-free narratives, framed
// honestly as a common/composite experience rather than a fabricated named testimonial. All copy here
// is curated and static — never model-generated (matches the app's existing crisis-copy invariant).
const URGE_SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function RideTheWaveCard() {
  const [ratings, setRatings] = useState<number[]>([]);

  const rate = (value: number) => setRatings((prev) => [...prev, value]);

  return (
    <div className="space-y-4" id="ride-the-wave-card">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
        Ride out the next few minutes
      </h2>

      <div className="bg-card border border-line p-4 rounded-xl space-y-3 text-sm text-ink-2 leading-relaxed">
        <p>
          What you're feeling right now is real, and it's a lot. You're still here reading this — that matters.
        </p>
        <p>
          Intense urges like this tend to rise, peak, and pass — even when it doesn't feel that way from
          inside it. The next few minutes matter more than the rest of tonight does. Your only job right
          now is to get through them.
        </p>
        <div className="flex items-start gap-2 bg-blue-500/10 border border-accent/20 rounded-lg p-3">
          <Snowflake className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
          <p className="text-ink-2">
            One thing that can help fast: fill a bowl or sink with cold water, take a breath, and put your
            face in for 15 to 30 seconds. It sounds strange — your body has a built-in calming reflex this
            triggers. Heart condition or on beta blockers? Use a cold pack on your cheeks instead.
          </p>
        </div>
      </div>

      <div className="bg-card border border-line p-4 rounded-xl space-y-3">
        <p className="text-sm text-ink-2 font-medium">How strong does it feel right now, 0 to 10?</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rate your current urge intensity, 0 to 10">
          {URGE_SCALE.map((n) => (
            <button
              key={n}
              onClick={() => rate(n)}
              aria-label={`Rate intensity ${n} out of 10`}
              className="w-8 h-8 rounded-lg bg-fill hover:bg-line-strong text-ink-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              {n}
            </button>
          ))}
        </div>
        {ratings.length > 0 && (
          <p className="text-xs text-ink-faint" id="urge-rating-history">
            Your check-ins: {ratings.join(" → ")}
            {ratings.length > 1
              ? " — come back and rate it again whenever you want."
              : " — noted. Try checking again in a little while; it often shifts."}
          </p>
        )}
      </div>

      <div className="bg-card border border-line p-4 rounded-xl text-sm text-ink-2 leading-relaxed space-y-2">
        <div className="flex items-center gap-1.5 text-ink-muted text-xs font-semibold uppercase tracking-wider">
          <Waves className="w-3.5 h-3.5" /> Something people say afterward
        </div>
        <p className="italic">
          "I didn't want to die — I just wanted the pain to stop for a while. I put my face in cold water
          and counted my breaths until the worst of it passed. It did pass."
        </p>
      </div>

      <div className="bg-card border border-line p-4 rounded-xl text-sm text-ink-2 leading-relaxed">
        <p>
          If anything nearby could hurt you, putting some distance between you and it — a locked drawer,
          another room, asking someone to hold onto it for a while — is one of the strongest things you can
          do right now.
        </p>
      </div>
    </div>
  );
}
