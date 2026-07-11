// Pure chat-text post-processing shared by the on-device reply pipeline and the chat render.
// Nila speaks in plain prose and the chat bubble renders raw text, so any markdown a small model
// emits (bold, bullets) would show literally — strip it. And a length-capped reply must never end
// on a dangling fragment — trim it to the last complete sentence.

/** Strip stray markdown a model may emit, keeping the words. Preserves snake_case (not italics). */
export function stripChatMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")                 // "# Header" -> "Header"
    .replace(/\*\*([^*]+)\*\*/g, "$1")            // **bold** -> bold
    .replace(/__([^_]+)__/g, "$1")                // __bold__ -> bold
    .replace(/^[ \t]*[-*+][ \t]+/gm, "")          // leading "* "/"- "/"+ " bullet markers
    .replace(/\*([^*\n]+?)\*/g, "$1")             // *italic* -> italic
    .replace(/(^|[^\w])_([^_\n]+?)_(?=[^\w]|$)/g, "$1$2") // _italic_ (leaves snake_case alone)
    .replace(/`([^`]+)`/g, "$1")                  // `code` -> code
    .replace(/[ \t]{2,}/g, " ")                   // collapse space runs
    .replace(/\n{3,}/g, "\n\n")                   // collapse blank-line runs
    .trim();
}

/** Strip a leading speaker label ("Nila:", "You:", "Them:") and unwrap a fully-quoted reply. A small
 *  model sometimes copies the few-shot examples' `Nila: "..."` format straight into its own output. */
export function stripSpeakerLabel(text: string): string {
  let t = text.trim();
  t = t.replace(/^\s*(?:nila|you|them)\s*[:\-–]\s*/i, "").trim(); // drop a copied speaker label
  // unwrap only when the WHOLE reply is wrapped in one matching quote pair (keeps inner quotes intact)
  const m = t.match(/^(["'“‘])([\s\S]+)(["'”’])$/);
  if (m) t = m[2].trim();
  return t;
}

/** If `text` was cut mid-thought, trim to the last complete sentence. Clean/boundary-less text is
 *  returned unchanged. */
export function trimToLastSentence(text: string): string {
  const t = text.trimEnd();
  if (!t || /[.!?…]["'’”)\]]?$/.test(t)) return t; // empty or already ends cleanly
  const lastEnd = Math.max(
    t.lastIndexOf("."), t.lastIndexOf("!"), t.lastIndexOf("?"), t.lastIndexOf("…"),
  );
  if (lastEnd === -1) return t; // no sentence boundary — nothing to trim to
  let end = lastEnd + 1;
  while (end < t.length && /["'’”)\]]/.test(t[end])) end++; // keep a trailing quote/bracket
  return t.slice(0, end).trimEnd();
}
