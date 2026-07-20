import React, { createContext, useContext, useState, useId, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { t } from "../services/i18n";

/** Shared controller so a parent can Expand all / Collapse all and so band headers form a
 *  keyboard-navigable group (Arrow Up/Down move focus between headers, per USWDS/Carbon). */
interface CollapsibleGroupCtx {
  register: (id: string, el: HTMLButtonElement | null, defaultOpen?: boolean) => void;
  setOpen: (id: string, open: boolean) => void;
  isOpen: (id: string) => boolean;
  getOrderedIds: () => string[];
  focusHeader: (id: string) => void;
}

const Ctx = createContext<CollapsibleGroupCtx | null>(null);

/** Wrap a set of <CollapsibleSection> bands. Provides Expand/Collapse-all and arrow-key
 *  navigation between band headers. Bands default to COLLAPSED (per USWDS/CMS: accordions add
 *  cognitive load when users need most of the content — a distressed mind should not be asked to
 *  decide which sections to open). A band may pass `defaultOpen` to open on load (e.g. a calm user
 *  gets the lightest band gently opened) — the group seeds its open-state from that. The group also
 *  exposes a small Expand/Collapse-all control. */
export function CollapsibleGroup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);
  const refs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  const register = useCallback((id: string, el: HTMLButtonElement | null, defaultOpen = false) => {
    if (el) {
      refs.current.set(id, el);
      setOrder((o) => (o.includes(id) ? o : [...o, id]));
      // Seed open-state from the band's defaultOpen (only first time it mounts; user toggles win after).
      setOpenMap((m) => (id in m ? m : { ...m, [id]: defaultOpen }));
    } else {
      refs.current.delete(id);
      setOrder((o) => o.filter((x) => x !== id));
    }
  }, []);

  const setOpen = useCallback((id: string, open: boolean) => {
    setOpenMap((m) => ({ ...m, [id]: open }));
  }, []);

  const isOpen = useCallback((id: string) => openMap[id] ?? false, [openMap]);

  const focusHeader = useCallback((id: string) => {
    refs.current.get(id)?.focus();
  }, []);

  const count = order.length;
  const allOpen = count > 0 && order.every((id) => openMap[id]);
  const toggleAll = () => {
    const next = !allOpen;
    setOpenMap(Object.fromEntries(order.map((id) => [id, next])));
  };

  const getOrderedIds = useCallback(() => order, [order]);

  const ctx: CollapsibleGroupCtx = { register, setOpen, isOpen, getOrderedIds, focusHeader };

  return (
    <Ctx.Provider value={ctx}>
      <div className={className}>
        {count > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] text-ink-faint hover:text-ink-2 underline-offset-2 hover:underline min-h-[44px]"
            aria-label={allOpen ? t("collapse_all") : t("expand_all")}
          >
            {allOpen ? t("collapse_all") : t("expand_all")}
          </button>
        )}
        {children}
      </div>
    </Ctx.Provider>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  /** Short narrative shown under the title when collapsed — the "what's inside" preview (MIND
   *  dashboard: text-first reduces cognitive load vs hidden data). */
  summary?: string;
  /** Start expanded. Defaults to FALSE: bands are collapsed on load so the dashboard opens calm. */
  defaultOpen?: boolean;
  className?: string;
}

/** A labelled, collapsible band. Header is a 44px tap target (button) with aria-expanded +
 *  aria-controls; body animates via grid-rows 0fr→1fr (calm, honours prefers-reduced-motion).
 *  When collapsed, an optional `summary` stays visible so the section is never a blind click. */
export default function CollapsibleSection({ title, children, summary, defaultOpen = false, className = "" }: CollapsibleSectionProps) {
  const group = useContext(Ctx);
  const groupRef = React.useRef(group);
  groupRef.current = group;
  const id = useId();
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = group ? group.isOpen(id) : localOpen;
  const setOpen = (o: boolean) => (group ? group.setOpen(id, o) : setLocalOpen(o));

  const setRef = React.useCallback(
    (el: HTMLButtonElement | null) => {
      groupRef.current?.register(id, el, defaultOpen);
    },
    [id, defaultOpen],
  );
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!group) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const ids = group.getOrderedIds();
      const i = ids.indexOf(id);
      if (i < 0) return;
      e.preventDefault();
      const next = e.key === "ArrowDown" ? ids[(i + 1) % ids.length] : ids[(i - 1 + ids.length) % ids.length];
      group.focusHeader(next);
    }
  };

  return (
    <section className={`space-y-2 ${className}`.trim()}>
      <button
        ref={setRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={onKeyDown}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        aria-describedby={summary ? `${id}-summary` : undefined}
        className="w-full flex items-center justify-between gap-2 min-h-[44px] rounded-xl px-2 py-1.5 text-left"
      >
        <span className="flex-1 min-w-0">
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-wider">{title}</h2>
          {summary && (
            <p
              id={`${id}-summary`}
              className={`text-[11px] text-ink-faint leading-snug mt-0.5 truncate ${open ? "sr-only" : ""}`}
            >
              {summary}
            </p>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-faint transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={`${id}-body`}
        hidden={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden space-y-3">{children}</div>
      </div>
    </section>
  );
}
