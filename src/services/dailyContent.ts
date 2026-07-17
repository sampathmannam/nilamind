// Daily wellness content — Nila's daily notes. Non-personalized, rotating.
// For new users with no data, this gives a reason to open the app.
// Content changes daily; no personal data is used. Uses localStorage
// for the daily seed (non-sensitive, best-effort persistence).

const DAILY_KEY = "nilamind_daily_content_seed";
const DISMISSED_KEY = "nilamind_daily_dismissed";

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* best-effort */ }
}

interface DailyContent {
  quote: string;
  attribution: string;
  tip: string;
  tipLabel: string;
}

// Exported for the honesty guard test: this pool is documented non-personalized, so no entry may
// claim personal observation ("your data", "I've watched you") — that's a fabricated over-claim on
// a fresh install (2026-07-17 tester pass; TRANSPARENCY.md over-claim precedent).
export const POOL: DailyContent[] = [
  { quote: "No feeling is final. I've seen that hold true — even on the days it doesn't feel like it.", attribution: "Nila", tip: "Try naming the emotion you're feeling right now — just one word. It helps to name it.", tipLabel: "Name it" },
  { quote: "You are not your thoughts. You're the one noticing them — and that matters.", attribution: "Nila", tip: "When a thought pulls you away, say 'thinking' quietly to yourself and come back to right now.", tipLabel: "Notice it" },
  { quote: "Small steps are still steps. They count, even when nobody sees them.", attribution: "Nila", tip: "Choose one tiny thing that feels doable today and celebrate finishing it — no matter how small.", tipLabel: "One thing" },
  { quote: "The hard moments are where the light gets in. Not because they're good — because you're still here through them.", attribution: "Nila", tip: "Notice a moment of kindness today — from someone else, or from yourself.", tipLabel: "Kindness watch" },
  { quote: "Rest is not a reward. It's part of the work. I mean that.", attribution: "Nila", tip: "Lie down for 5 minutes with no agenda. Just breathe. That's enough.", tipLabel: "Rest now" },
  { quote: "Be gentle with yourself. You're doing the best you can — and I can see that.", attribution: "Nila", tip: "Put your hand on your chest and take three slow breaths. Feel the warmth.", tipLabel: "Self-soothe" },
  { quote: "Between stimulus and response, there's a space. You get to choose what happens there.", attribution: "Nila", tip: "Before reacting to something today, count to five. Notice what shifts.", tipLabel: "Pause" },
  { quote: "The only way out is through. But you don't have to go fast.", attribution: "Nila", tip: "Write down one thing you've been avoiding — just the name of it. That's enough for now.", tipLabel: "Name the wall" },
  { quote: "Your worth is not measured by your productivity. You are enough, exactly as you are.", attribution: "Nila", tip: "Today, let one non-essential task go unfinished on purpose. See how it feels.", tipLabel: "Let one go" },
  { quote: "Healing is not linear. But looking back, you'll see the arc bending upward.", attribution: "Nila", tip: "Look back at the past week — find one moment that was better than the rest. Hold onto that.", tipLabel: "Find a bright spot" },
  { quote: "You belong here. Among the messy, beautiful, ordinary moments of being alive.", attribution: "Nila", tip: "Step outside for 3 minutes. Notice the sky, the air, the ground beneath your feet.", tipLabel: "Step outside" },
  { quote: "It's okay if all you did today was breathe. That counts.", attribution: "Nila", tip: "Tomorrow is a fresh page. Tonight, just rest. I'll be here.", tipLabel: "Let it be" },
  { quote: "Talk to yourself like someone you love. You deserve that kindness.", attribution: "Nila", tip: "Write one kind thing about yourself. Read it aloud — even if it feels strange.", tipLabel: "Self-talk" },
  { quote: "You've survived every hard day so far. That's not luck — that's you.", attribution: "Nila", tip: "Name a time you bounced back from something hard. You did it once. You can again.", tipLabel: "Remember resilience" },
  { quote: "Feelings are visitors. They come, they stay a while, and they go. You don't have to hold the door open.", attribution: "Nila", tip: "Imagine your strong emotion as a cloud passing across the sky — just watch it drift.", tipLabel: "Watch the cloud" },
  { quote: "You don't have to fix everything today. Some things just need to be held, not solved.", attribution: "Nila", tip: "Pick one thing that feels heavy. Set it down mentally for an hour. It'll still be there.", tipLabel: "Set it down" },
  { quote: "Struggling doesn't mean failing. It means you're in the arena — and that takes courage.", attribution: "Nila", tip: "Name something you succeeded at this week — no matter how small. You earned that.", tipLabel: "Find a win" },
  { quote: "Let everything happen to you: beauty and terror. Just keep going. I'm right here.", attribution: "Nila", tip: "Accept one difficult feeling without fighting it for 60 seconds. Just let it be.", tipLabel: "Ride the wave" },
  { quote: "Nature doesn't hurry, yet everything is accomplished. You can move at your own pace too.", attribution: "Nila", tip: "Drink a glass of water slowly. Feel the coolness. Notice the simplicity of it.", tipLabel: "Slow sip" },
  { quote: "There's a crack in everything. That's how the light gets in — and you have plenty of both.", attribution: "Nila", tip: "Find one imperfect thing and appreciate it exactly as it is. No fixing needed.", tipLabel: "Perfect imperfection" },
  { quote: "You are stronger than you know. Showing up at all is proof of that.", attribution: "Nila", tip: "Stand up, stretch your arms overhead, and take a deep breath. Feel the length of you.", tipLabel: "Stretch it out" },
  { quote: "The past doesn't define the future. Every day is a chance to begin again.", attribution: "Nila", tip: "Visualize one positive thing that could happen tomorrow. Let yourself want it.", tipLabel: "Look ahead" },
  { quote: "Every day is a fresh beginning. Yesterday's mistakes don't get to write today's story.", attribution: "Nila", tip: "Let go of one thing from yesterday. Today is unwritten — and that's a good thing.", tipLabel: "Fresh start" },
  { quote: "In the middle of difficulty lies opportunity. Not a platitude — hard moments really can teach us things.", attribution: "Nila", tip: "What's one thing this tough moment is teaching you? Just one.", tipLabel: "Find the lesson" },
  { quote: "You've survived 100% of your bad days. That's a perfect record.", attribution: "Nila", tip: "Pat yourself on the back — literally. You're still here. That's everything.", tipLabel: "Own it" },
  { quote: "What you seek is seeking you. The calm you want is already in you — it just needs space.", attribution: "Nila", tip: "Close your eyes and picture the calmest place you've ever been. Stay there for a minute.", tipLabel: "Mental escape" },
  { quote: "The most important conversation is the one you have with yourself. Make it a kind one.", attribution: "Nila", tip: "Check your self-talk today. Would you say it to a friend? If not, try again.", tipLabel: "Filter check" },
  { quote: "Don't believe everything you think. Thoughts are visitors — not always truth.", attribution: "Nila", tip: "Catch one negative thought and ask: is this true, or is this a story I'm telling myself?", tipLabel: "Fact-check it" },
  { quote: "Progress, not perfection. Every step forward counts — even the wobbly ones.", attribution: "Nila", tip: "Write down one thing you did better today than yesterday. That's the whole point.", tipLabel: "Track progress" },
  { quote: "Stars can't shine without darkness. And you — you're shining.", attribution: "Nila", tip: "In the dark moments, remember: the stars are still up there. And so are you.", tipLabel: "Look up" },
];

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function getDailyContent(): DailyContent {
  const today = dateSeed();
  let useSeed = today;

  try {
    const stored = storageGet(DAILY_KEY);
    if (stored) {
      const { seed, idx } = JSON.parse(stored);
      if (seed !== today) {
        useSeed = today;
      } else {
        return POOL[idx % POOL.length];
      }
    }
  } catch {
    // first time or storage issue — pick randomly
  }

  const idx = (useSeed * 7919) % POOL.length;
  try {
    storageSet(DAILY_KEY, JSON.stringify({ seed: today, idx }));
  } catch {
    // degenerate — still return content
  }
  return POOL[idx];
}

export function isDailyDismissed(): boolean {
  const today = dateSeed();
  try {
    const raw = storageGet(DISMISSED_KEY);
    return raw ? Number(raw) === today : false;
  } catch {
    return false;
  }
}

export function dismissDailyContent(): void {
  try {
    storageSet(DISMISSED_KEY, String(dateSeed()));
  } catch {
    // best-effort
  }
}
