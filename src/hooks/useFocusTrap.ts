// useFocusTrap — traps keyboard focus within a modal dialog element.
// Returns a ref to attach to the dialog container and handles Tab/Shift+Tab cycling.
// Also handles Escape key to close and returns focus to the previously focused element.
//
// STACK-AWARE (2026-07-18 design review): every open trap registers on a shared stack, and a SINGLE
// window-level keydown listener dispatches only to the TOP trap. So when overlays nest (e.g. a sheet with
// the crisis overlay above it), Escape closes just the topmost layer and Tab cycles only within it —
// instead of every open dialog's own listener firing at once ("Esc closes ALL layers"). The listener is
// installed on the first trap and removed when the last one unmounts.

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type TrapEntry = {
  container: () => HTMLElement | null;
  onClose?: () => void;
};

const trapStack: TrapEntry[] = [];
let listenerInstalled = false;

function visibleFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

function handleKeyDown(e: KeyboardEvent) {
  const top = trapStack[trapStack.length - 1];
  if (!top) return;

  if (e.key === "Escape") {
    if (top.onClose) {
      e.preventDefault();
      e.stopPropagation(); // don't let a lower overlay's own handler also close
      top.onClose();
    }
    return;
  }

  if (e.key !== "Tab") return;
  const container = top.container();
  if (!container) return;

  const focusable = visibleFocusable(container);
  if (focusable.length === 0) {
    // Nothing focusable inside — keep focus on the container so Tab can't escape the dialog.
    e.preventDefault();
    container.focus({ preventScroll: true });
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;
  const inside = container.contains(active);

  if (e.shiftKey) {
    if (active === first || !inside) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (active === last || !inside) {
      e.preventDefault();
      first.focus();
    }
  }
}

export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onClose?: () => void,
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  // Keep the latest onClose without re-running the mount effect (inline arrows change identity each render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const hasOnClose = onClose != null;

  useEffect(() => {
    if (!isOpen) return;

    // Remember what had focus before the dialog opened, to restore it on close.
    previousFocus.current = document.activeElement as HTMLElement;

    const entry: TrapEntry = {
      container: () => containerRef.current,
      onClose: hasOnClose ? () => onCloseRef.current?.() : undefined,
    };
    trapStack.push(entry);
    if (!listenerInstalled) {
      // Capture phase + window target so a keydown dispatched on any node (or on window itself) reaches us.
      window.addEventListener("keydown", handleKeyDown, true);
      listenerInstalled = true;
    }

    // Focus the first focusable element (or the container). preventScroll: the first focusable is often
    // BELOW the header; focusing it without this scrolls the dialog and hides its own heading (on the §9
    // crisis overlay it pushed "You're not alone" off-screen — 2026-07-17 QA). A dialog must open at its top.
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const first = containerRef.current.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? containerRef.current).focus({ preventScroll: true });
    }, 50);

    return () => {
      clearTimeout(timer);
      const i = trapStack.indexOf(entry);
      if (i >= 0) trapStack.splice(i, 1);
      if (trapStack.length === 0 && listenerInstalled) {
        window.removeEventListener("keydown", handleKeyDown, true);
        listenerInstalled = false;
      }
      if (previousFocus.current && typeof previousFocus.current.focus === "function") {
        try { previousFocus.current.focus(); } catch { /* previously-focused node gone */ }
      }
    };
    // Depend only on isOpen: onClose is read via ref so an inline arrow doesn't churn the stack.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return containerRef;
}
