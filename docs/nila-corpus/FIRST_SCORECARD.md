# First real Move-Scorecard (2026-07-13/14)

The move-eval engine, run on **real replies captured on-device this session** (device ZD2232FCR5). This is the
first time Nila's reply quality is a **number**, not an eyeball. Reproduced by
`src/services/moveEval/firstScorecard.test.ts`.

## advice_seeking — "should i quit my job or stick it out"

| System | Move Score | Holistic | What it said |
|---|---|---|---|
| **Qwen2.5-1.5B, pre-registerSteer** | **25%** | 0/3 | 8-sentence generic advice dump ("talk to someone you trust… seek support… explore resources") |
| **Qwen2.5-1.5B, post-registerSteer** | **100%** | 3/3 | "That's not a quick-answer question. What's actually pulling you back—is it about them, or about how alone this feels right now?" |
| **MiniCPM5-1B (untuned raw-ChatML prompt)** | **25%** | 0/3 | degenerate repetition loop ("I like to feel 14. 15. 16…") |

**Read:** `registerSteer` is now a *measured* +75-point win on this probe, not just a qualitative one. MiniCPM5-1B,
with the untuned prompt, sits at the bottom — confirming the spike's finding that it's not a usable drop-in yet.

## Caveats (read before trusting these numbers)

- **Judge = Claude, UNCALIBRATED.** The scores were authored by Claude-as-judge. Before any decision rests on
  a scorecard, the **E2 calibration harness** must show the judge agrees with human labels (≥ threshold). Until
  then these are indicative, not authoritative.
- **Binary Move Score can be gamed by short generic replies.** e.g. the pre-steer short_check_in "Hello! How
  can I assist you today?" passes form/prose/no-preamble/turn and scores deceptively high on the binary
  dimensions — only the **holistic** score (0/3) catches the helpdesk voice. Weight holistic accordingly; don't
  read the binary Move Score alone.
- **n=1 per system on the head-to-head.** A real benchmark needs the full probe matrix (device captures across
  tags × registers × languages) — that's the pending Ash-diff data-collection task.

## What this unblocks

The engine is proven end-to-end on real data. Plugging in a live generator (device/adb or laptop-proxy) + an
`ANTHROPIC_API_KEY` for the real judge + the calibration pass turns this from a hand-scored demonstration into an
automated benchmark that scores any candidate — a MiniCPM template fix, a steer change, or a fine-tune — on
evidence.
