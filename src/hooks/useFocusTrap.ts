// useFocusTrap — traps keyboard focus within a modal dialog element.
// Returns a ref to attach to the dialog container and handles Tab/Shift+Tab cycling.
// Also handles Escape key to close and returns focus to the previously focused element.

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onClose?: () => void,
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remember what had focus before the dialog opened
    previousFocus.current = document.activeElement as HTMLElement;

    // Focus the first focusable element inside the container (or the container itself)
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const first = containerRef.current.querySelector<HTMLElement>(FOCUSABLE);
      if (first) {
        first.focus();
      } else {
        containerRef.current.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      // Return focus to the element that triggered the dialog
      if (previousFocus.current && typeof previousFocus.current.focus === "function") {
        previousFocus.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if at first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if at last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return containerRef;
}
