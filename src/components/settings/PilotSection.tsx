import { useState } from "react";
import { t } from "../../services/i18n";
import { FlaskConical } from "lucide-react";
import {
  getPilotState,
  enrollPilot,
  withdrawPilot,
  computePilotSummary,
  PILOT_ENDPOINT_DAYS,
} from "../../services/pilotStudy";

// Opt-in "Research pilot" section (see docs/PILOT_PROTOCOL.md). Purely on-device and consented; it never
// renders anything for a non-enrolled user beyond this invitation, and nothing is transmitted automatically.
export default function PilotSection() {
  const [state, setState] = useState(() => getPilotState());
  const summary = state?.enrolled ? computePilotSummary() : null;

  const enroll = () => { enrollPilot(); setState(getPilotState()); };
  const withdraw = () => { withdrawPilot(); setState(getPilotState()); };

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2 font-mono flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-success" /> {t("sec_pilot")}
          <span className="text-ink-faint normal-case font-sans text-[11px]">(optional)</span>
        </h2>
        <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
          Help find out whether NilaMind actually helps — by tracking your own progress over about four weeks.
          Everything stays on your device. Nothing is sent anywhere automatically; you only ever share by
          choosing to export your report.
        </p>
      </div>

      {!state?.enrolled ? (
        <div className="border border-line rounded-xl p-3 bg-page space-y-3">
          <ul className="text-[11px] text-ink-muted leading-relaxed list-disc pl-4 space-y-1">
            <li>Take the PHQ-9 / GAD-7 / WHO-5 check-ins now (baseline) and again in ~{PILOT_ENDPOINT_DAYS} days.</li>
            <li>Use the app however you like in between; you'll get one gentle endpoint reminder.</li>
            <li>Your export then includes a private pre/post + retention summary you can share with a researcher.</li>
            <li>It's voluntary and on-device — withdraw any time and the pilot state is deleted.</li>
          </ul>
          <button
            onClick={enroll}
            id="pilot-enroll"
            className="w-full py-2 rounded-xl bg-success hover:opacity-90 text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 focus:ring-offset-page"
          >
            I understand — join the pilot
          </button>
        </div>
      ) : (
        <div className="border border-line rounded-xl p-3 bg-page space-y-2">
          <div className="text-sm font-medium text-ink-2">You're enrolled</div>
          <div className="text-[11px] text-ink-muted leading-relaxed">
            Baseline {state.enrolledDay} · endpoint {state.endpointDueDay}
            {summary && (summary.endpointReached
              ? " · ready — take your endpoint check-in"
              : ` · ${summary.daysRemaining} days to go`)}
          </div>
          <p className="text-xs text-ink-faint leading-relaxed">
            When you're done, export your report from Your Data or the Dashboard to share it.
          </p>
          <button
            onClick={withdraw}
            id="pilot-withdraw"
            className="text-[11px] text-rose-300 hover:text-rose-200 transition-colors"
          >
            Withdraw from the pilot
          </button>
        </div>
      )}
    </div>
  );
}
