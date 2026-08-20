# nilamind

A mental health professional launcher for Android.

Every feature in nilamind is a faithful implementation of a published
research paper. The verbatim items, response options, and scoring bands
of each instrument are coded in `data/scoring/`, and the citation is
visible on every screen the instrument is used.

This is **not** a patient-facing app. The audience is the clinician —
psychiatrist, therapist, counselor, social worker. The visual direction
is clinical and information-dense: deep teal primary, soft slate
background, monospace for clinical data, serif for emphasis, no
animations on score surfaces.

## v0.1.0 — deep narrow

The v0.1.0 MVP ships four clinical instruments, paper-accurate:

| Instrument | Citation | Items | Score range | Triage |
|------------|----------|-------|-------------|--------|
| PHQ-9 | Spitzer, Kroenke & Williams 1999. J Gen Intern Med 14(9):606-613 | 9 | 0-27 | 5 bands |
| GAD-7 | Spitzer, Kroenke, Williams & Lowe 2006. Arch Intern Med 166(10):1092-1097 | 7 | 0-21 | 4 bands |
| C-SSRS Screener | Posner et al. 2011. Am J Psychiatry 168(12):1266-1277 | 6 yes/no | n/a | Low / Moderate / High |
| Stanley-Brown SPI | Stanley & Brown 2012. Cogn Behav Pract 19(2):256-264 | 6 steps | n/a | patient-authored |

Plus:

- Home screen with bang-command bar
- Research sidebar (full citations for all four papers)
- Bang commands: `!phq9`, `!gad7`, `!cssrs`, `!safety`, `!refs`, `!home`

## Build

```sh
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Requirements: JDK 17, Android SDK with platform 36, build tools 36.

## What is NOT in v0.1.0

- No persistence — scores and safety-plan entries live in the screen
  state only and are lost on process death. Persistence is v0.2.0.
- No ML / inference / model — the "predictive" half of the brief is
  deferred. The v0.1.0 surface is the instruments themselves, not
  derived insights.
- No backend, no cloud, no analytics. Everything on device.
- No user accounts. The clinician owns the device.

## Layout

```
app/src/main/java/org/nilamind/
├── MainActivity.kt              Compose root + navigation
├── data/
│   ├── papers/                  Paper data class + Papers registry
│   └── scoring/                 Phq9, Gad7, CsrsScreener, SafetyPlan
└── ui/
    ├── Home.kt                  Home screen + bang bar
    ├── Phq9.kt                  PHQ-9 instrument
    ├── Gad7.kt                  GAD-7 instrument
    ├── CsrsScreener.kt          C-SSRS screener
    ├── SafetyPlan.kt            Stanley-Brown SPI
    ├── Research.kt              Research sidebar
    ├── BangCommandParser.kt     !-command grammar
    ├── Destination.kt           6 destinations
    ├── components/              CitationChip, InstrumentTopBar
    └── theme/                   Theme.kt
```
