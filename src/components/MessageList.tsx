import { useRef, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import NilaDot from "./NilaDot";
import InMomentInsightCard from "./InMomentInsightCard";
import { stripChatMarkdown, ensureListBreaks } from "../services/chatText";
import type { NilaUiMessage } from "../services/nilaSend";
import type { Skill } from "../services/skillsLibrary";
import { hapticLight } from "../hooks/useHaptics";

interface MessageListProps {
  messages: NilaUiMessage[];
  expandedFeedbackIndices: Set<number>;
  removableToastIndex: number | null;
  loading: boolean;
  ratedMessages: Set<number>;
  dismissedSkillMessages: Set<number>;
  suggestionPrompt: { index: number; feedbackId: string } | null;
  suggestionText: string;
  onToggleFeedback: (index: number) => void;
  onRateUp: (content: string, index: number) => void;
  onRateDown: (content: string, index: number) => void;
  onDismissSkill: (index: number) => void;
  onTrySkill: (skill: Skill) => void;
  onSetSuggestionText: (text: string) => void;
  onSubmitSuggestion: () => void;
  onCancelSuggestion: () => void;
  onRemoveFromHistory: (index: number) => void;
  onCancelGeneration: () => void;
}

export default function MessageList({
  messages,
  expandedFeedbackIndices,
  removableToastIndex,
  loading,
  ratedMessages,
  dismissedSkillMessages,
  suggestionPrompt,
  suggestionText,
  onToggleFeedback,
  onRateUp,
  onRateDown,
  onDismissSkill,
  onTrySkill,
  onSetSuggestionText,
  onSubmitSuggestion,
  onCancelSuggestion,
  onRemoveFromHistory,
  onCancelGeneration,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevAssistantCountRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    const assistantCount = messages.filter((m) => m.role === "assistant").length;
    if (assistantCount > prevAssistantCountRef.current) hapticLight();
    prevAssistantCountRef.current = assistantCount;
  }, [messages, loading]);

  return (
    <div className="w-full max-w-sm space-y-3" role="log" aria-live="polite">
      {messages.map((m, i) => {
        const ts = m.timestamp
          ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : null;
        const isUser = m.role === "user";
        return (
          <div key={i} className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            {m.role === "assistant" && (
              <div className="mb-3" aria-label="Nila">
                <NilaDot size={12} />
              </div>
            )}
            <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                  isUser
                    ? "bg-accent/90 text-white rounded-br-md"
                    : "bg-card border border-accent/15 text-ink-2 rounded-bl-md"
                }`}
              >
                {isUser ? m.content : ensureListBreaks(stripChatMarkdown(m.content))}
              </div>
              <div className={`flex items-center gap-2 mt-1.5 ${isUser ? "justify-end" : ""}`}>
                {ts && <span className="text-[10px] text-ink-faint tabular-nums">{ts}</span>}
                {m.role === "assistant" && (
                  <button
                    onClick={() => onToggleFeedback(i)}
                    className="text-[11px] text-ink-faint hover:text-ink-2 transition-colors cursor-pointer min-h-[32px] focus-ring"
                    aria-label={expandedFeedbackIndices.has(i) ? "Hide feedback" : "Show feedback"}
                  >
                    {expandedFeedbackIndices.has(i) ? "−Feedback" : "+Feedback"}
                  </button>
                )}
              </div>
              {m.role === "assistant" && expandedFeedbackIndices.has(i) && (
                <>
                  {ratedMessages.has(i) ? (
                    <span className="text-[11px] text-accent mt-1" aria-live="polite">
                      Thanks for your feedback
                    </span>
                  ) : (
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => onRateUp(m.content, i)}
                        className="p-2 rounded text-ink-faint hover:text-ink-2 hover:bg-fill/50 active:scale-90 transition-all cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                        aria-label="Mark as helpful"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRateDown(m.content, i)}
                        className="p-2 rounded text-ink-faint hover:text-ink-2 hover:bg-fill/50 active:scale-90 transition-all cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                        aria-label="Mark as not helpful"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {m.insight && (
                    <InMomentInsightCard
                      explainerTitle={m.insight.explainer?.title ?? ""}
                      explainerSummary={m.insight.explainer?.summary ?? ""}
                      explainerBasis={m.insight.explainer?.basis ?? ""}
                      skillEmoji={m.insight.skill?.emoji ?? ""}
                      skillName={m.insight.skill?.skill.name ?? ""}
                      skillReason={m.insight.skill?.reason ?? ""}
                      skillDismissed={dismissedSkillMessages.has(i)}
                      onDismissSkill={() => onDismissSkill(i)}
                      onTrySkill={m.insight.skill ? () => onTrySkill(m.insight!.skill!.skill) : undefined}
                    />
                  )}
                  {suggestionPrompt?.index === i && (
                    <div
                      id="feedback-suggestion-prompt"
                      className="mt-1.5 p-3 rounded-xl bg-card border border-line-strong text-xs space-y-2"
                    >
                      <p className="text-ink-2">What would've helped?</p>
                      <input
                        type="text"
                        value={suggestionText}
                        onChange={(e) => onSetSuggestionText(e.target.value)}
                        placeholder="What would've helped? (optional)"
                        className="w-full px-3 py-2 rounded-lg bg-fill border border-line text-ink-2 placeholder:text-ink-faint focus:outline-none focus:border-accent text-xs"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={onCancelSuggestion}
                          className="px-3 py-2 rounded-lg text-ink-muted hover:text-ink-2 hover:bg-fill transition-colors cursor-pointer min-h-[44px] focus-ring"
                          aria-label="Not now"
                        >
                          Not now
                        </button>
                        <button
                          onClick={onSubmitSuggestion}
                          className="px-3 py-2 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent font-medium transition-colors cursor-pointer min-h-[44px] focus-ring"
                          aria-label="Share what would help"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}