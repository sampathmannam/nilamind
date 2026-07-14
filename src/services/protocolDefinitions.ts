// Protocol Definitions — evidence-based structured conversation flows.
// Each protocol has 3-5 steps with deterministic transitions.
// The model generates natural language within each step; the protocol handles therapeutic direction.

import type { ConversationProtocol } from "./conversationProtocols";

export const PROTOCOLS: Record<string, ConversationProtocol> = {
  /**
   * Grounding Protocol — for anxiety, panic, or overwhelm.
   * Research: 5-4-3-2-1 sensory grounding (Najavits 2002, Seeking Safety).
   * Box breathing (Ma et al. 2017, Navy SEALs tactical breathing).
   */
  grounding: {
    id: "grounding",
    name: "Grounding",
    trigger: "user expresses anxiety, panic, or feeling overwhelmed",
    completionMessage: "You did that — you helped yourself feel more grounded. I'm here whenever you need me.",
    steps: [
      {
        id: "acknowledge",
        prompt: "The person is anxious or overwhelmed. Validate their experience warmly in 2 sentences. Do NOT offer solutions yet — just acknowledge.",
        nilaTemplate: "{empathy} I'd like to walk through a quick grounding exercise with you — it takes about 2 minutes and helps calm your body. Want to try?",
        modelFill: "empathy: 1-2 warm sentences acknowledging their distress",
        next: (response: string) => {
          const lower = response.toLowerCase();
          if (lower.includes("yes") || lower.includes("ok") || lower.includes("sure") || lower.includes("try")) return "advance";
          if (lower.includes("no") || lower.includes("not now") || lower.includes("later")) return "exit";
          return "repeat"; // unclear — ask again gently
        },
      },
      {
        id: "breathe",
        prompt: "Guide through slow breathing. Count: breathe in for 4, hold for 4, out for 6. Wait for confirmation before advancing.",
        nilaTemplate: "Let's do this together. Breathe in slowly through your nose... 1-2-3-4. Now hold... 1-2-3-4. And breathe out slowly through your mouth... 1-2-3-4-5-6. {follow_up}",
        modelFill: "follow_up: gentle question like 'How did that feel?' or 'Want to do one more?'",
        next: (response: string) => {
          if (response.toLowerCase().includes("better") || response.toLowerCase().includes("good") || response.toLowerCase().includes("calm")) return "advance";
          return "advance"; // always advance after breathing — don't get stuck here
        },
      },
      {
        id: "ground_54321",
        prompt: "Guide through 5-4-3-2-1 grounding. Ask them to notice: 5 things they can see, 4 they can touch, 3 they can hear, 2 they can smell, 1 they can taste. Go one sense at a time.",
        nilaTemplate: "Now let's ground you in the present. Look around and name 5 things you can see — anything, big or small.",
        modelFill: "encourage: wait for their response, then gently prompt the next sense (4 touch, 3 hear, 2 smell, 1 taste)",
        next: (response: string) => {
          // This step might need multiple exchanges — but for now, advance after they respond
          return "advance";
        },
      },
      {
        id: "close",
        prompt: "The person has completed grounding. Reflect on what they did. End with warmth. Keep it brief.",
        nilaTemplate: "{reflection} You helped yourself feel more grounded. I'm here whenever you need me.",
        modelFill: "reflection: 1 sentence noticing their effort",
        next: () => "exit",
      },
    ],
  },

  /**
   * Mood Check-In Protocol — for exploring current emotional state.
   * Research: DBT emotion regulation (Linehan 2015); CBT mood tracking.
   */
  moodCheckIn: {
    id: "moodCheckIn",
    name: "Mood Check-In",
    trigger: "user wants to explore how they're feeling or mentions emotional confusion",
    completionMessage: "Thank you for sharing that. Naming what's going on is the first step — you did it.",
    steps: [
      {
        id: "name_feeling",
        prompt: "Gently help the person name what they're feeling. Don't list emotions — ask them what's there right now. Validate whatever they say.",
        nilaTemplate: "{empathy} Can you name what you're feeling right now? Just one word, or as many as feel right.",
        modelFill: "empathy: 1 warm sentence if they already expressed something",
        next: () => "advance",
      },
      {
        id: "explore_trigger",
        prompt: "Gently explore what might be behind the feeling. Don't push — just ask. If they don't know, that's okay.",
        nilaTemplate: "{acknowledge} Do you have a sense of what might be behind {feeling}? No pressure if you don't.",
        modelFill: "acknowledge: 1 sentence validating the emotion they named; feeling: repeat what they said",
        next: () => "advance",
      },
      {
        id: "one_thing",
        prompt: "Offer one small, gentle thing they could do right now. Based on what they shared. Keep it tiny and possible.",
        nilaTemplate: "{reflection} Would one small thing help right now? Even just taking three deep breaths or stepping outside for a minute.",
        modelFill: "reflection: 1 sentence connecting what they shared to the suggestion",
        next: () => "exit",
      },
    ],
  },

  /**
   * Sleep Wind-Down Protocol — for evening/ nighttime.
   * Research: CBT-I stimulus control (Bootzin 1972); sleep hygiene (AASM).
   */
  windDown: {
    id: "windDown",
    name: "Sleep Wind-Down",
    trigger: "user mentions sleep trouble or it's evening and they're open to winding down",
    completionMessage: "The day can rest now. You've done enough. I hope tonight brings you gentle sleep.",
    steps: [
      {
        id: "park_day",
        prompt: "Guide them to mentally park the day. Ask if there's anything on their mind they'd like to set down until tomorrow.",
        nilaTemplate: "The day is winding down. Is there anything on your mind you'd like to set down until tomorrow? Even just naming it can help.",
        modelFill: "none — let them answer",
        next: (response: string) => {
          if (response.length < 5) return "advance"; // they don't want to share
          return "advance"; // always advance
        },
      },
      {
        id: "settle_body",
        prompt: "Guide them to settle their body. One minute of slow breathing — out-breath a little longer than in-breath. Keep it simple.",
        nilaTemplate: "Let's settle your body for a moment. Just one minute of slow breathing. In through your nose... and out through your mouth, a little slower than the in-breath. No counting needed.",
        modelFill: "encourage: gentle invitation to breathe",
        next: () => "advance",
      },
      {
        id: "let_go",
        prompt: "Close the day gently. Let them know they've done enough.",
        nilaTemplate: "Let the day be done. You got through today. Nothing more is required of you tonight. I hope you find rest.",
        modelFill: "none",
        next: () => "exit",
      },
    ],
  },

  /**
   * Strengths Protocol — for low mood, drawing on what helped before.
   * Research: DBT build mastery (Linehan 2015); ACT values-based action.
   */
  strengths: {
    id: "strengths",
    name: "Strengths",
    trigger: "user expresses feeling hopeless, worthless, or stuck — low mood with helplessness",
    completionMessage: "That's a real thing you just did — noticing what's helped before and naming one tiny step. That takes strength.",
    steps: [
      {
        id: "acknowledge_low",
        prompt: "Acknowledge their low mood warmly. Don't try to cheer them up — just sit with them in it. Then gently ask.",
        nilaTemplate: "{empathy} I wonder — have there been moments recently where things felt even a little bit less heavy?",
        modelFill: "empathy: 1-2 sentences validating their struggle",
        next: () => "advance",
      },
      {
        id: "recall_strength",
        prompt: "Help them recall what's helped before. Based on their context, gently suggest something they've done that worked.",
        nilaTemplate: "{context_strength} When things felt hard before, what helped even a tiny bit?",
        modelFill: "context_strength: reference something from their data if available — 'You mentioned grounding helped before' or 'Taking a walk seemed to shift things last week'",
        next: () => "advance",
      },
      {
        id: "one_step",
        prompt: "Help them commit to one tiny, possible action. Make it laughably small — not a big goal.",
        nilaTemplate: "{encourage} What's one tiny thing you could do right now or today? Something so small it almost doesn't count.",
        modelFill: "encourage: acknowledge that even tiny steps matter",
        next: () => "exit",
      },
    ],
  },

  /**
   * Connection Protocol — for isolation, loneliness.
   * Research: FTFamily / IPSRT emphasis on social rhythm and connection.
   */
  connection: {
    id: "connection",
    name: "Connection",
    trigger: "user expresses loneliness, isolation, feeling disconnected",
    completionMessage: "Reaching out takes courage. Even thinking about it is a step. You're not alone.",
    steps: [
      {
        id: "acknowledge_lonely",
        prompt: "Acknowledge their loneliness warmly. Don't minimize or offer solutions. Just be with them.",
        nilaTemplate: "{empathy} Loneliness is hard — it's not a flaw, it's a human need that's not being met right now. Is there one person, even someone you haven't talked to in a while, who you'd feel okay reaching out to?",
        modelFill: "empathy: 1-2 warm sentences",
        next: () => "advance",
      },
      {
        id: "draft_message",
        prompt: "Help them think about what they'd say. Keep it tiny — even a one-sentence text counts.",
        nilaTemplate: "{encourage} What would you want to say to them? Even just 'Hey, thinking of you' — that's enough.",
        modelFill: "encourage: remind them that small gestures matter",
        next: () => "exit",
      },
    ],
  },
};
