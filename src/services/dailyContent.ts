// Daily wellness content — non-personalized, rotating quotes and tips.
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

const POOL: DailyContent[] = [
  { quote: "No feeling is final.", attribution: "Rainer Maria Rilke", tip: "Try naming the emotion you're feeling right now — just one word.", tipLabel: "Name it" },
  { quote: "You are not your thoughts — you are the one noticing them.", attribution: "Mindfulness teaching", tip: "When a thought pulls you, say 'thinking' quietly to yourself and return to the moment.", tipLabel: "Notice it" },
  { quote: "Small steps are still steps.", attribution: "Recovery wisdom", tip: "Choose one tiny thing that feels doable today and celebrate finishing it.", tipLabel: "One thing" },
  { quote: "The wound is the place where the light enters you.", attribution: "Rumi", tip: "Notice a moment of kindness today — from someone else, or from yourself.", tipLabel: "Kindness watch" },
  { quote: "Rest is not a reward. Rest is part of the work.", attribution: "Tricia Hersey", tip: "Lie down for 5 minutes with no agenda. Just breathe.", tipLabel: "Rest now" },
  { quote: "Be gentle with yourself. You're doing the best you can.", attribution: "Unknown", tip: "Put your hand on your chest and take three slow breaths.", tipLabel: "Self-soothe" },
  { quote: "Between stimulus and response there is a space.", attribution: "Viktor Frankl", tip: "Before reacting to something, count to five. Notice what shifts.", tipLabel: "Pause" },
  { quote: "The only way out is through.", attribution: "Robert Frost", tip: "Write down one thing you've been avoiding — just the name of it.", tipLabel: "Name the wall" },
  { quote: "Your worth is not measured by your productivity.", attribution: "A gentle reminder", tip: "Today, let one non-essential task go unfinished on purpose.", tipLabel: "Let one go" },
  { quote: "Healing is not linear.", attribution: "Unknown", tip: "Look back at the past week — one moment that was better than the rest.", tipLabel: "Find a bright spot" },
  { quote: "You belong among the wildflowers.", attribution: "Tom Petty", tip: "Step outside for 3 minutes. Notice the sky, the air, the ground.", tipLabel: "Step outside" },
  { quote: "It's okay if all you did today was breathe.", attribution: "Unknown", tip: "Tomorrow is a fresh page. Tonight, just rest.", tipLabel: "Let it be" },
  { quote: "Talk to yourself like someone you love.", attribution: "Brené Brown", tip: "Write one kind thing about yourself. Read it aloud.", tipLabel: "Self-talk" },
  { quote: "The greatest glory is not in never falling, but in rising every time we fall.", attribution: "Confucius", tip: "Name a time you bounced back from something hard. You did it once — you can again.", tipLabel: "Remember resilience" },
  { quote: "Feelings are visitors. Let them come and go.", attribution: "Mooji", tip: "Imagine your strong emotion as a cloud passing across the sky — watch it drift.", tipLabel: "Watch the cloud" },
  { quote: "You don't have to fix everything today.", attribution: "Gentle wisdom", tip: "Pick one thing that feels heavy. Set it down mentally for an hour.", tipLabel: "Set it down" },
  { quote: "Just because you're struggling doesn't mean you're failing.", attribution: "Unknown", tip: "Name something you succeeded at this week — no matter how small.", tipLabel: "Find a win" },
  { quote: "Let everything happen to you: beauty and terror. Just keep going.", attribution: "Rilke", tip: "Accept one difficult feeling without fighting it for 60 seconds.", tipLabel: "Ride the wave" },
  { quote: "Nature does not hurry, yet everything is accomplished.", attribution: "Lao Tzu", tip: "Drink a glass of water slowly. Feel the coolness.", tipLabel: "Slow sip" },
  { quote: "There is a crack in everything. That's how the light gets in.", attribution: "Leonard Cohen", tip: "Find one imperfect thing and appreciate it exactly as it is.", tipLabel: "Perfect imperfection" },
  { quote: "You are stronger than you know.", attribution: "A gentle nudge", tip: "Stand up, stretch your arms overhead, and take a deep breath.", tipLabel: "Stretch it out" },
  { quote: "The past does not define the future.", attribution: "Recovery mantra", tip: "Visualize one positive thing that could happen tomorrow.", tipLabel: "Look ahead" },
  { quote: "Every day is a fresh beginning.", attribution: "Emily Dickinson", tip: "Let go of yesterday's mistakes — today is unwritten.", tipLabel: "Fresh start" },
  { quote: "In the middle of difficulty lies opportunity.", attribution: "Albert Einstein", tip: "What's one thing this tough moment is teaching you?", tipLabel: "Find the lesson" },
  { quote: "You've survived 100% of your bad days.", attribution: "Unknown", tip: "Pat yourself on the back — literally. You're still here.", tipLabel: "Own it" },
  { quote: "What you seek is seeking you.", attribution: "Rumi", tip: "Close your eyes and picture the calmest place you've ever been.", tipLabel: "Mental escape" },
  { quote: "The most important conversation is the one you have with yourself.", attribution: "Unknown", tip: "Check your self-talk today. Would you say it to a friend?", tipLabel: "Filter check" },
  { quote: "Don't believe everything you think.", attribution: "Cognitive therapy insight", tip: "Catch one negative thought and ask: is this true, or is this a story?", tipLabel: "Fact-check it" },
  { quote: "Progress, not perfection.", attribution: "Recovery wisdom", tip: "Write down one thing you did better today than yesterday.", tipLabel: "Track progress" },
  { quote: "Stars can't shine without darkness.", attribution: "Unknown", tip: "In the dark moments, remember: stars are still up there.", tipLabel: "Look up" },
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
