// Topic Tracking — clusters conversation themes over time using keyword-based topic detection.
// Research: thematic analysis in psychotherapy (Braun & Clarke 2006). Identifying recurring
// themes helps the companion feel like it understands the person's life, not just their data.
// This feeds into nilaContext as "Over the past 2 weeks, you've talked mostly about..."

import { retrieveConversationMemories, type MemoryEntry } from "./conversationMemory";

const KEY = "nilamind_topic_tracker";

interface TopicCount {
  topic: string;
  count: number;
  lastDiscussed: number;
  avgIntensity: number | null;
}

const TOPICS = [
  { name: "Work stress", keywords: ["work", "job", "boss", "career", "office", "coworker", "deadline"] },
  { name: "Relationship stress", keywords: ["partner", "relationship", "marriage", "husband", "wife", "boyfriend", "girlfriend", "breakup", "divorce"] },
  { name: "Family", keywords: ["mom", "dad", "parent", "mother", "father", "sister", "brother", "family", "child", "kid"] },
  { name: "Sleep problems", keywords: ["sleep", "insomnia", "tired", "exhausted", "night", "wake", "can't sleep"] },
  { name: "Anxiety", keywords: ["anxious", "anxiety", "panic", "worried", "fear", "nervous", "dread"] },
  { name: "Low mood", keywords: ["sad", "depressed", "low", "down", "hopeless", "numb", "empty", "crying"] },
  { name: "Medication", keywords: ["medication", "meds", "dose", "side effect", "lithium", "prescription", "pill"] },
  { name: "Health", keywords: ["health", "body", "pain", "sick", "doctor", "hospital", "symptom"] },
  { name: "Episodes", keywords: ["episode", "manic", "elevated", "cycling", "mixed", "high energy"] },
  { name: "Self-care", keywords: ["exercise", "walk", "gym", "run", "meditation", "breathe", "journal"] },
  { name: "Isolation", keywords: ["lonely", "alone", "isolated", "disconnected", "no one", "nobody"] },
  { name: "Hope", keywords: ["hope", "better", "improving", "progress", "grateful", "thankful", "good day"] },
];

/**
 * Analyze recent conversations and identify recurring topics/themes.
 * Returns the top topic clusters for the past N days.
 */
export function analyzeTopics(days = 14): TopicCount[] {
  const cutoff = Date.now() - days * 86400000;
  const memories = retrieveConversationMemories("", 100)
    .filter((m) => m.timestamp >= cutoff);

  const counts: Record<string, TopicCount> = {};

  for (const mem of memories) {
    const text = mem.userText.toLowerCase();
    for (const topic of TOPICS) {
      const matched = topic.keywords.some((kw) => text.includes(kw));
      if (matched) {
        if (!counts[topic.name]) {
          counts[topic.name] = { topic: topic.name, count: 0, lastDiscussed: 0, avgIntensity: null };
        }
        counts[topic.name].count++;
        counts[topic.name].lastDiscussed = Math.max(counts[topic.name].lastDiscussed, mem.timestamp);
      }
    }
  }

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Format topic analysis as a context block for nilaContext.
 * "Over the past 2 weeks, you've talked mostly about work stress (4 times) and sleep problems (3 times)."
 */
export function topicContextBlock(days = 14): string {
  const topics = analyzeTopics(days);
  if (topics.length < 2) return "";

  const top2 = topics.slice(0, 2);
  const parts = top2.map((t) => `${t.topic} (${t.count} time${t.count > 1 ? "s" : ""})`);
  return `- Over the past ${days} days, they've talked mostly about ${parts.join(" and ")}.`;
}
