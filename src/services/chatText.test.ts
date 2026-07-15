import { describe, it, expect } from "vitest";
import { stripChatMarkdown, trimToLastSentence, stripSpeakerLabel, ensureListBreaks } from "./chatText";

describe("ensureListBreaks", () => {
  it("breaks an inline numbered list onto separate lines", () => {
    const inline = "Here are a few suggestions: 1. Progressive Muscle Relaxation: tense then release. 2. Mindfulness Meditation: sit quietly. 3. Deep breathing helps.";
    const out = ensureListBreaks(inline);
    expect(out).toContain("suggestions:\n1. Progressive");
    expect(out).toContain("release.\n2. Mindfulness");
    expect(out).toContain("quietly.\n3. Deep");
  });
  it("does NOT break decimals, times, or sentences that merely end in a number", () => {
    expect(ensureListBreaks("Hold it for about 5 seconds. Then release over 30-60 seconds."))
      .toBe("Hold it for about 5 seconds. Then release over 30-60 seconds.");
    expect(ensureListBreaks("Your distress was 9.0 out of 10.")).toBe("Your distress was 9.0 out of 10.");
  });
  it("preserves newlines a model already emitted", () => {
    expect(ensureListBreaks("1. First\n2. Second")).toBe("1. First\n2. Second");
  });
  it("breaks before an inline bullet glyph", () => {
    expect(ensureListBreaks("Try these • breathing • grounding")).toBe("Try these\n• breathing\n• grounding");
  });
});

describe("stripChatMarkdown", () => {
  it("removes bold, italics, bullets, headers — keeps the words", () => {
    expect(stripChatMarkdown("That's **great** news.")).toBe("That's great news.");
    expect(stripChatMarkdown("the *why* behind it")).toBe("the why behind it");
    expect(stripChatMarkdown("# Heading\ntext")).toBe("Heading\ntext");
    expect(stripChatMarkdown("* **Reduced Stress:** Calm helps."))
      .toBe("Reduced Stress: Calm helps.");
    expect(stripChatMarkdown("- item one\n- item two")).toBe("item one\nitem two");
    expect(stripChatMarkdown("use `code` here")).toBe("use code here");
  });
  it("leaves plain prose and snake_case untouched", () => {
    expect(stripChatMarkdown("Just a normal sentence.")).toBe("Just a normal sentence.");
    expect(stripChatMarkdown("read snake_case_var now")).toBe("read snake_case_var now");
  });
});

describe("trimToLastSentence", () => {
  it("trims a dangling fragment back to the last complete sentence", () => {
    expect(trimToLastSentence("I hear you. That sounds really")).toBe("I hear you.");
    expect(trimToLastSentence("Calm helps. Your body relaxes. But there")).toBe("Calm helps. Your body relaxes.");
  });
  it("leaves clean or boundary-less text unchanged", () => {
    expect(trimToLastSentence("I hear you.")).toBe("I hear you.");
    expect(trimToLastSentence("What's the hardest part")).toBe("What's the hardest part");
    expect(trimToLastSentence('He said "hi." And then')).toBe('He said "hi."');
  });
});

describe("stripSpeakerLabel", () => {
  it("strips a copied speaker label and unwraps a fully-quoted reply (the real device artifact)", () => {
    // exact shape observed on-device after the exemplar relabel
    expect(stripSpeakerLabel('Nila: "It\'s like a little voice inside you that keeps whispering, \'Don\'t!\'"'))
      .toBe("It's like a little voice inside you that keeps whispering, 'Don't!'");
    expect(stripSpeakerLabel("You: hey there")).toBe("hey there");
  });
  it("keeps inner quotes and leaves clean text alone", () => {
    expect(stripSpeakerLabel("I hear you.")).toBe("I hear you.");
    expect(stripSpeakerLabel("Sounds like you're stuck.")).toBe("Sounds like you're stuck.");
  });
  it("does not unwrap a partially-quoted reply", () => {
    expect(stripSpeakerLabel('"just this part" and then more')).toBe('"just this part" and then more');
  });
});
