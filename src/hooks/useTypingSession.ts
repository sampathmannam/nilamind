import { useRef, useCallback, useEffect } from "react";
import { startTypingSession, recordKeystroke, endTypingSession } from "../services/typingPatterns";

/**
 * Hook to attach typing-pattern capture to a text input.
 * Privacy: captures only timing, never content. Sessions are stored encrypted.
 */
export function useTypingSession(targetId: string) {
  const sessionIdRef = useRef<string | null>(null);
  const activeRef = useRef(false);

  const start = useCallback(() => {
    if (activeRef.current) return;
    sessionIdRef.current = startTypingSession(targetId);
    activeRef.current = true;
  }, [targetId]);

  const stop = useCallback((finalLength: number) => {
    if (!activeRef.current || !sessionIdRef.current) return;
    endTypingSession(sessionIdRef.current, finalLength);
    sessionIdRef.current = null;
    activeRef.current = false;
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!activeRef.current) start();
    recordKeystroke({ ts: Date.now(), key: e.key, type: "down", targetId });
  }, [start, targetId]);

  const onKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    recordKeystroke({ ts: Date.now(), key: e.key, type: "up", targetId });
  }, [targetId]);

  const onBlur = useCallback((length: number) => {
    stop(length);
  }, [stop]);

  // End session on unmount
  useEffect(() => () => {
    if (sessionIdRef.current) endTypingSession(sessionIdRef.current, 0);
  }, []);

  return { onKeyDown, onKeyUp, onBlur, start, stop };
}
