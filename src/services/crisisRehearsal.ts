import { secureLocal } from "./secureLocal";

const REHEARSAL_KEY = "nilamind_crisis_rehearsal";

export interface RehearsalScenario {
  id: string;
  title: string;
  description: string;
  steps: string[];
}

export const DEFAULT_SCENARIOS: RehearsalScenario[] = [
  {
    id: "suicidal_thoughts",
    title: "I'm having suicidal thoughts",
    description: "Practice what to do when thoughts of ending your life feel overwhelming.",
    steps: [
      "1. Pause. Remove yourself from immediate danger. Put down anything harmful.",
      "2. Use TIPP: splash ice-cold water on your face for 30 seconds.",
      "3. Call or text 988 (or your local crisis line). Say: 'I'm having thoughts of suicide. I need to talk to someone.'",
      "4. Reach out to your trusted person. Say: 'I'm not okay right now. Can you stay on the phone with me?'",
      "5. Go somewhere safe — a busy place, a friend's house, or an ER waiting room.",
      "6. Use your safety plan. Distract with grounding: 5 things you see, 4 you feel, 3 you hear.",
      "7. Remember: these thoughts are a symptom, not a truth. They pass. You've survived 100% of your worst days.",
    ],
  },
  {
    id: "panic_attack",
    title: "I'm having a panic attack",
    description: "Practice grounding yourself when panic hits hard and fast.",
    steps: [
      "1. Acknowledge it: 'This is a panic attack. It's uncomfortable but not dangerous. It will pass.'",
      "2. Ground yourself: 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
      "3. Breathe: in for 4 seconds, hold for 4, out for 6. Repeat 5 times.",
      "4. Hold something cold — an ice cube, a cold drink can. Focus on the sensation.",
      "5. Move your body: walk, shake out your hands, stretch. Discharge the adrenaline.",
      "6. Remind yourself: 'My body is doing its job. This feeling will peak and then fade.'",
      "7. Call a friend if you need grounding. Say: 'I'm having a panic attack. Can you just talk to me about something ordinary?'",
    ],
  },
  {
    id: "urge_to_self_harm",
    title: "I have an urge to self-harm",
    description: "Practice riding the wave of an urge without acting on it.",
    steps: [
      "1. Delay: set a timer for 15 minutes. Tell yourself: 'I can revisit this urge in 15 minutes.'",
      "2. Distract with intense sensation: hold ice, take a cold shower, snap a rubber band on your wrist.",
      "3. Distract mentally: count backwards from 100 by 7s, name all the countries you can think of.",
      "4. Connect: call or text someone. You don't have to tell them why. Just connect.",
      "5. Move: do 20 jumping jacks, run in place, dance aggressively to one song.",
      "6. Ride it out: urges are like waves — they peak and then fall. Your job is to stay on the surfboard, not fight the urge.",
      "7. After 15 minutes: is the urge still as strong? If yes, reset the timer and try a different skill.",
    ],
  },
];

export interface RehearsalLog {
  scenarioId: string;
  completedAt: string;
  completedSteps: number;
  totalSteps: number;
}

export function loadRehearsalLogs(): RehearsalLog[] {
  try {
    const raw = secureLocal.getItem(REHEARSAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRehearsalLog(log: RehearsalLog): void {
  const logs = loadRehearsalLogs();
  logs.push(log);
  secureLocal.setItem(REHEARSAL_KEY, JSON.stringify(logs));
}

export function rehearsalCompletionRate(logs: RehearsalLog[]): number {
  if (logs.length === 0) return 0;
  const rate = logs.map((l) => l.completedSteps / l.totalSteps).reduce((a, b) => a + b, 0) / logs.length;
  return Math.round(rate * 100);
}
