// Conversation Memory — stores and retrieves past conversations.
// Research: Wu et al. (2024) "MemLong" — small models benefit from retrieved past context.
// Uses keyword-based retrieval (emotional + topical keywords). Privacy-first: on-device only.
// When MiniLM embedder is available, can be upgraded to embedding-based retrieval.

import { secureLocal } from "./secureLocal";

const KEY = "nilamind_conversation_log";

export interface MemoryEntry {
  id: string;
  timestamp: number;
  userText: string;
  nilaText: string;
  /** Detected emotional keywords from user message. */
  emotionWords: string[];
  /** Detected topic keywords from user message. */
  topicWords: string[];
}

/** Emotional keyword extraction — simple, fast, on-device. */
const EMOTION_KEYWORDS = [
  "anxious", "anxiety", "panic", "worried", "scared", "fear", "terrified",
  "sad", "depressed", "low", "down", "hopeless", "numb", "empty",
  "angry", "frustrated", "irritated", "rage", "annoyed",
  "lonely", "alone", "isolated", "disconnected",
  "happy", "good", "great", "better", "calm", "peaceful",
  "tired", "exhausted", "drained", "worn out",
  "grateful", "thankful", "appreciative",
  "overwhelmed", "stressed", "pressure", "too much",
  "guilty", "ashamed", "embarrassed",
];

/** Topic keyword extraction — covers common conversation themes. */
const TOPIC_KEYWORDS = [
  "work", "job", "boss", "career", "office", "coworker",
  "sleep", "insomnia", "bed", "night", "tired", "rest",
  "medication", "meds", "dose", "side effect", "lithium",
  "therapy", "therapist", "session", "appointment",
  "relationship", "partner", "family", "mom", "dad", "friend", "husband", "wife",
  "health", "body", "pain", "sick", "doctor",
  "money", "financial", "debt", "bills",
  "school", "college", "exam", "study",
  "episode", "manic", "elevated", "cycling", "mixed",
  "self harm", "cutting", "suicide", "dying",
  "drink", "alcohol", "substance", "drug",
  "exercise", "walk", "gym", "run",
  "eat", "food", "appetite", "weight",
];

function extractKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

/** Store a conversation turn in memory. Capped at 365 entries (1 year). */
export function storeConversationMemory(userText: string, nilaText: string): void {
  if (!userText || userText.trim().length < 3) return;

  const entry: MemoryEntry = {
    id: "mem_" + Date.now(),
    timestamp: Date.now(),
    userText: userText.slice(0, 500),
    nilaText: nilaText.slice(0, 500),
    emotionWords: extractKeywords(userText, EMOTION_KEYWORDS),
    topicWords: extractKeywords(userText, TOPIC_KEYWORDS),
  };

  try {
    const all = loadMemories();
    all.push(entry);
    if (all.length > 365) all.shift();
    secureLocal.setItem(KEY, JSON.stringify(all));
  } catch { /* best-effort */ }
}

function loadMemories(): MemoryEntry[] {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/** Retrieve top-k most relevant past conversations. */
export function retrieveConversationMemories(userMessage: string, k = 3): MemoryEntry[] {
  const all = loadMemories();
  if (all.length === 0) return [];

  const inputEmotions = new Set(extractKeywords(userMessage, EMOTION_KEYWORDS));
  const inputTopics = new Set(extractKeywords(userMessage, TOPIC_KEYWORDS));

  // Score each memory by keyword overlap
  const scored = all.map((m) => {
    let score = 0;
    for (const w of m.emotionWords) if (inputEmotions.has(w)) score += 3; // emotion matches weighted higher
    for (const w of m.topicWords) if (inputTopics.has(w)) score += 1;
    // Recency bonus: newer conversations score higher
    const daysAgo = (Date.now() - m.timestamp) / (1000 * 60 * 60 * 24);
    if (daysAgo < 1) score += 2;
    else if (daysAgo < 7) score += 1;
    return { score, entry: m };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.entry);
}

/** Format retrieved memories as a few-shot context block for the model. */
export function formatMemoryBlock(memories: MemoryEntry[]): string {
  if (memories.length === 0) return "";

  const lines = memories.map((m, i) => {
    const date = new Date(m.timestamp).toLocaleDateString();
    const emotions = m.emotionWords.length > 0 ? ` (${m.emotionWords.slice(0, 3).join(", ")})` : "";
    return `${i + 1}. ${date}${emotions}: They said "${m.userText.slice(0, 120)}..." → Nila responded.`;
  });

  return "PAST CONVERSATIONS (you can reference these):\n" + lines.join("\n");
}

/** Get memory count (for debugging/metrics). */
export function getMemoryCount(): number {
  return loadMemories().length;
}
