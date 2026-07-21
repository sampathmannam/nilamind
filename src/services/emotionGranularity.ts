import { familyForBroad } from "../data/emotions";

interface Scored {
  word: string;
  score: number;
}

export function suggestGranularEmotions(broadLabel: string, context?: string): string[] {
  const family = familyForBroad(broadLabel);
  if (!family) return [];

  const ctx = context?.toLowerCase() ?? "";
  const scored: Scored[] = family.words.map((word) => {
    const lower = word.toLowerCase();
    let score = 0;

    if (ctx) {
      const tokens = lower.split(" ").filter((t) => t.length > 2);
      for (const token of tokens) {
        if (ctx.includes(token)) score += 2;
      }
      if (ctx.includes(lower)) score += 3;
    }

    return { word, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((e) => e.word);
}

export function granularityPrompt(suggestions: string[]): string {
  const list = suggestions.map((w, i) => `${i + 1}. ${w}`).join("\n");
  return `Help me name this feeling more precisely. Does it feel more like:\n${list}`;
}
