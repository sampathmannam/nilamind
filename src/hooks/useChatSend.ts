import { useCallback } from "react";
import type { NilaUiMessage } from "../services/nilaSend";
import type { UserState } from "../types/modes";
import { shouldBlockForCrisisAsync } from "../services/nilaSend";
import { noteChatElevation } from "../services/chatElevation";
import { detectElevationRisk } from "../services/elevationGuard";
import { scoreAffect, affectAccentActive } from "../services/affectHead";
import { blendAffect } from "../services/affectBlend";
import { noteChatAffect } from "../services/chatAffect";
import { sendToNila } from "../services/sendToNila";
import { deriveInMomentInsight } from "../services/inMomentInsight";
import { speakIfEnabled } from "../services/voice";
import { notifyReplyReady } from "../services/notifications";
import { logNilaTurn } from "../services/nilaSessions";
import { looksLikeArmRequest, requestArmedCheckin } from "../services/armedCheckin";
import { protocolOfferCard, type ProtocolCard } from "../services/protocolChat";
import { isCloudApiEnabled, getCloudApiKey } from "../services/cloudApi";
import { offlineBrainMessage } from "../services/nilaReflect";
import { localLlmLoadState } from "../services/localLlm";
import { hapticLight } from "./useHaptics";

function msg(role: "user" | "assistant", content: string, extra: Partial<Pick<NilaUiMessage, "insight" | "synthetic">> = {}): NilaUiMessage {
  return { role, content, timestamp: Date.now(), ...extra };
}

interface ChatSendDeps {
  inputText: string;
  setInputText: (v: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  messages: NilaUiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<NilaUiMessage[]>>;
  setProtocolCard: (v: ProtocolCard | null) => void;
  protocolCard: ProtocolCard | null;
  setSoftCrisisCard: (v: boolean) => void;
  modeUserState: UserState | null;
  recomputeMode: () => void;
  setAffectAccent: (v: { valence: number; arousal: number } | null) => void;
  openCrisis: (latch?: boolean, tier?: "full" | "soft" | null) => void;
  chatTyping: { stop: (len: number) => void };
  setRemovableToastIndex: (v: number | null) => void;
  cancelRequestedRef: React.MutableRefObject<boolean>;
  abortRef: React.MutableRefObject<AbortController | null>;
  crisisPendingRef: React.MutableRefObject<boolean>;
}

export function useChatSend({
  inputText,
  setInputText,
  loading,
  setLoading,
  messages,
  setMessages,
  setProtocolCard,
  protocolCard,
  setSoftCrisisCard,
  modeUserState,
  recomputeMode,
  setAffectAccent,
  openCrisis,
  chatTyping,
  setRemovableToastIndex,
  cancelRequestedRef,
  abortRef,
  crisisPendingRef,
}: ChatSendDeps) {
  const handleSendMessage = useCallback(async (text?: string) => {
    const textToSend = text || inputText.trim();
    if (!textToSend || loading) return;

    chatTyping.stop(textToSend.length);
    setInputText("");
    hapticLight();
    const userMsg: NilaUiMessage = msg("user", textToSend);
    crisisPendingRef.current = true;
    setMessages((prev) => [...prev, userMsg]);
    logNilaTurn("coach", textToSend);

    if (looksLikeArmRequest(textToSend)) {
      setLoading(true);
      try {
        if (await shouldBlockForCrisisAsync(textToSend)) { openCrisis(true); return; }
        crisisPendingRef.current = false;
        const armResult = requestArmedCheckin(textToSend, [...messages, userMsg]);
        if (armResult.ok) {
          setMessages((prev) => [
            ...prev,
            msg("assistant", `Got it — I'll check in with you ${armResult.triggerLabel}.`),
          ]);
        } else if (armResult.reason === "crisis") {
          openCrisis(true);
        } else {
          const reply =
            armResult.reason === "elevation"
              ? "Let's slow down a little before I set a check-in — what you're describing sounds elevated, and I don't want to nudge you at the wrong moment."
              : armResult.reason === "quiet"
              ? "I'll stay quiet — no check-ins unless you ask again."
              : armResult.reason === "frequency"
              ? "You already have a check-in set. I'll keep that one."
              : null;
          if (reply) {
            setMessages((prev) => [...prev, msg("assistant", reply)]);
          }
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    setProtocolCard(protocolOfferCard(textToSend));

    setLoading(true);
    const abortController = new AbortController();
    abortRef.current = abortController;
    cancelRequestedRef.current = false;

    try {
      const allMessages = [...messages, userMsg];
      const result = await sendToNila(allMessages, "companion", {
        onDelta: (t: string) => {},
        signal: abortController.signal,
      });
      if (result.blocked) {
        openCrisis(true, result.crisisTier ?? "full");
        if (result.reply) setMessages((prev) => [...prev, msg("assistant", result.reply)]);
        return;
      }
      if (result.softCrisis) {
        setSoftCrisisCard(true);
      }
      crisisPendingRef.current = false;
      noteChatElevation(detectElevationRisk(textToSend).level);
      let turnAffectAccent: { valence: number; arousal: number } | null = null;
      if (affectAccentActive() && result.reply) {
        const [userScore, nilaScore] = await Promise.all([scoreAffect(textToSend), scoreAffect(result.reply)]);
        if (userScore && nilaScore) {
          turnAffectAccent = blendAffect(userScore, nilaScore);
          noteChatAffect(turnAffectAccent);
        }
      }
      setAffectAccent(turnAffectAccent);
      const previousExplainerId =
        [...messages].reverse().find((m) => m.role === "assistant")?.insight?.explainer?.id ?? null;
      const insight = await deriveInMomentInsight(textToSend, modeUserState, previousExplainerId);
      if (result.reply) {
        setMessages((prev) => [...prev, msg("assistant", result.reply, { insight: insight ?? undefined })]);
        if (result.reachedAI) {
          speakIfEnabled(result.reply);
          if (document.hidden) void notifyReplyReady();
        }
      } else if (!result.reachedAI) {
        const content = isCloudApiEnabled() && getCloudApiKey()
          ? "Cloud API returned an empty response — check your API key and endpoint in Settings → Advanced → Cloud API."
          : offlineBrainMessage(localLlmLoadState());
        setMessages((prev) => [...prev, msg("assistant", content)]);
      }
      setProtocolCard(protocolOfferCard(textToSend));
      recomputeMode();
      setRemovableToastIndex(messages.length);
    } catch (err) {
      crisisPendingRef.current = false;
      if (cancelRequestedRef.current) {
        cancelRequestedRef.current = false;
        setLoading(false);
        return;
      }
      const isCloud = isCloudApiEnabled() && getCloudApiKey();
      const fallbackText = isCloud
        ? "Cloud API isn't responding — check your API key and endpoint in Settings → Advanced → Cloud API. Your conversations are still private on-device in the meantime."
        : "I'm having a quiet moment — my model isn't responding right now. Your phone might be low on memory or the model needs a moment. Try typing again? 💙";
      setMessages((prev) => [
        ...prev,
        msg("assistant", fallbackText),
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [inputText, loading, messages, protocolCard, modeUserState, chatTyping, setInputText, setLoading, setMessages, setProtocolCard, setSoftCrisisCard, recomputeMode, setAffectAccent, openCrisis, setRemovableToastIndex, abortRef, cancelRequestedRef, crisisPendingRef]);

  const handleCancelGeneration = useCallback(() => {
    cancelRequestedRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, [setLoading, abortRef, cancelRequestedRef]);

  return { handleSendMessage, handleCancelGeneration };
}