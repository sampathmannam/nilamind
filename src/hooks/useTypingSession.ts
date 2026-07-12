import { useRef, useCallback, useEffect } from "react";
import { startTypingSession, endTypingSession, classifyKey } from "../services/typingPatterns";
import type { KeystrokeEvent } from "../services/typingPatterns";

/**
 * Hook to attach typing-pattern capture to a text input.
 * Privacy: captures only timing + a COARSE key class (backspace/space/enter/char) — never the literal
 * character typed. Events are buffered in-memory during the session and attached on endTypingSession,
 * so there is no per-keystroke re-encryption overhead.
 */
export function useTypingSession(targetId: string) {
  const sessionIdRef = useRef<string | null>(null);
  const activeRef = useRef(false);
  const eventsRef = useRef<KeystrokeEvent[]>([]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    sessionIdRef.current = startTypingSession(targetId);
    eventsRef.current = [];
    activeRef.current = true;
  }, [targetId]);

  const stop = useCallback((finalLength: number) => {
    if (!activeRef.current || !sessionIdRef.current) return;
    endTypingSession(sessionIdRef.current, finalLength, eventsRef.current);
    sessionIdRef.current = null;
    eventsRef.current = [];
    activeRef.current = false;
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!activeRef.current) start();
    eventsRef.current.push({ ts: Date.now(), keyClass: classifyKey(e.key), type: "down", targetId });
  }, [start, targetId]);

  const onKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    eventsRef.current.push({ ts: Date.now(), keyClass: classifyKey(e.key), type: "up", targetId });
  }, [targetId]);

  const onBlur = useCallback((length: number) => {
    stop(length);
  }, [stop]);

  // End session on unmount
  useEffect(() => () => {
    if (sessionIdRef.current) endTypingSession(sessionIdRef.current, 0, eventsRef.current);
  }, []);

  return { onKeyDown, onKeyUp, onBlur, start, stop };
}
