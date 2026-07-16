// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import InMomentInsightCard from "./InMomentInsightCard";

describe("InMomentInsightCard", () => {
  afterEach(cleanup);
  it("renders the explainer + skill with citation and a Try this skill button", () => {
    const onTry = vi.fn();
    render(
      <InMomentInsightCard
        explainerTitle="Why anxiety shows up in the body"
        explainerSummary="A racing heart is the body's alarm switching on."
        explainerBasis="Barlow (false-alarm model of anxiety)."
        skillEmoji="🫀"
        skillName="TIPP"
        skillReason="Racing heart or panic sensation"
        onTrySkill={onTry}
      />,
    );
    expect(screen.getByText("Why you might feel this way")).toBeTruthy();
    expect(screen.getByText("Why anxiety shows up in the body")).toBeTruthy();
    expect(screen.getByText(/Barlow/)).toBeTruthy();
    expect(screen.getByText("A skill that may help")).toBeTruthy();
    expect(screen.getByText("TIPP")).toBeTruthy();
    const btn = screen.getByText("Try this skill");
    btn.click();
    expect(onTry).toHaveBeenCalledOnce();
  });

  it("hides the explainer section when no explainer is passed", () => {
    render(
      <InMomentInsightCard
        explainerTitle=""
        explainerSummary=""
        explainerBasis=""
        skillEmoji="💙"
        skillName="Opposite Action"
        skillReason="Low mood or emptiness"
      />,
    );
    expect(screen.queryByText("Why you might feel this way")).toBeNull();
    expect(screen.getByText("A skill that may help")).toBeTruthy();
    expect(screen.getByText("Opposite Action")).toBeTruthy();
  });

  it("hides the skill section + Try button when no skill is passed", () => {
    render(
      <InMomentInsightCard
        explainerTitle="Why anxiety shows up in the body"
        explainerSummary="A racing heart is the body's alarm switching on."
        explainerBasis="Barlow (false-alarm model of anxiety)."
        skillEmoji=""
        skillName=""
        skillReason=""
      />,
    );
    expect(screen.getByText("Why you might feel this way")).toBeTruthy();
    expect(screen.queryByText("A skill that may help")).toBeNull();
    expect(screen.queryByText("Try this skill")).toBeNull();
  });

  it("clicking Not now calls onDismissSkill", () => {
    const onDismiss = vi.fn();
    render(
      <InMomentInsightCard
        explainerTitle=""
        explainerSummary=""
        explainerBasis=""
        skillEmoji="💙"
        skillName="Opposite Action"
        skillReason="Low mood or emptiness"
        onTrySkill={() => {}}
        onDismissSkill={onDismiss}
      />,
    );
    screen.getByText("Not now").click();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("hides the skill section entirely when skillDismissed is true, but keeps the explainer", () => {
    render(
      <InMomentInsightCard
        explainerTitle="Why anxiety shows up in the body"
        explainerSummary="A racing heart is the body's alarm switching on."
        explainerBasis="Barlow (false-alarm model of anxiety)."
        skillEmoji="🫀"
        skillName="TIPP"
        skillReason="Racing heart or panic sensation"
        onTrySkill={() => {}}
        skillDismissed
      />,
    );
    expect(screen.getByText("Why you might feel this way")).toBeTruthy();
    expect(screen.queryByText("A skill that may help")).toBeNull();
    expect(screen.queryByText("TIPP")).toBeNull();
  });
});
