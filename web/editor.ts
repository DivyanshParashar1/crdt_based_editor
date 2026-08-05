// DOM glue for one pane. Knows about textareas and carets; knows nothing about
// RGA, Lamport clocks, or the wire. Every CRDT decision it needs is delegated
// across the seam in edits.ts.

import type { Client, RemoteChange } from "../client.js";
import type { Transport } from "../transport.interface.js";
import { applyLocalEdit } from "../edits.js";

function must<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`missing element: ${selector}`);
  return el;
}

/**
 * Where one caret offset lands after a remote change.
 *
 * The invariant: the caret stays glued to the same *character*, so the user
 * never sees it drift. Everything below is that one sentence, case-split.
 */
function shiftCaret(caret: number, change: RemoteChange): number {
  if (change.type === "insert") {
    // Strictly-before pushes the caret right; at-or-after leaves it alone.
    //
    // `<` rather than `<=` is a genuine judgement call, not an off-by-one.
    // When a remote character lands exactly AT the caret, someone has to own
    // that offset. `<` means it appears to the RIGHT of your caret and you keep
    // typing in front of it; `<=` would mean their text keeps shoving you
    // rightwards while you type. The first behaviour is what editors do.
    return change.index < caret ? caret + change.length : caret;
  }

  const deleteEnd = change.index + change.length;

  // Entirely before the caret: everything after the cut slides left, and the
  // caret is part of "everything after". (caret 6, delete 2 chars at 4 -> 4.)
  if (deleteEnd <= caret) return caret - change.length;

  // Entirely at or after the caret: the text in front of the caret is
  // untouched, so its offset is untouched.
  if (change.index >= caret) return caret;

  // Straddles the caret: the character it was glued to is gone, so the closest
  // surviving anchor is the start of the hole. Unreachable while ops are
  // single-character, but the rule is stated so a batched delete cannot
  // silently fall through to a wrong branch.
  return change.index;
}

export class EditorPane {
  private readonly textarea: HTMLTextAreaElement;
  private readonly statusEl: HTMLElement;
  private readonly statusTextEl: HTMLElement;
  private readonly charsEl: HTMLElement;

  /**
   * The textarea's value as of the last edit we processed — the "before" half
   * of the diff. Held here rather than read from the DOM because by the time
   * the `input` event fires the textarea already shows the *new* value; the
   * old one is gone unless we kept it.
   */
  private lastValue = "";

  constructor(
    root: HTMLElement,
    private readonly client: Client,
    private readonly transport: Transport,
  ) {
    this.textarea = must<HTMLTextAreaElement>(root, '[data-role="editor"]');
    this.statusEl = must<HTMLElement>(root, '[data-role="status"]');
    this.statusTextEl = must<HTMLElement>(root, '[data-role="status-text"]');
    this.charsEl = must<HTMLElement>(root, '[data-role="chars"]');

    must<HTMLElement>(root, '[data-role="id"]').textContent =
      client.clientId.slice(0, 8);

    // `input` rather than `keydown` or `change`: it is the only one that
    // fires after the value has actually changed and covers every source of
    // change — typing, paste, cut, drag-drop, undo, IME commit. keydown
    // fires before the edit lands and misses non-keyboard input entirely;
    // change fires only on blur.
    this.textarea.addEventListener("input", () => this.onLocalInput());

    // Remote ops mutate the replica with no DOM involvement, so the pane has
    // to be told to re-read it — and told *where* it changed, or the caret
    // cannot be corrected.
    this.client.onRemoteChange((change) => this.renderFromReplica(change));

    this.transport.onOpen(() => this.setStatus("open", "connected"));
    setInterval(() => {
      if (!this.transport.isOpen()) this.setStatus("closed", "disconnected");
    }, 1000);

    // Initial paint: nothing changed relative to anything, so no caret rule
    // applies.
    this.renderFromReplica(null);
  }

  private onLocalInput(): void {
    const before = this.lastValue;
    const after = this.textarea.value;

    // selectionStart after the edit: for an insertion it sits just past the
    // inserted text, for a deletion it sits where the removed text was.
    // That single number is what disambiguates diffs that are otherwise
    // identical (typing "a" into "aaa").
    const caret = this.textarea.selectionStart;

    applyLocalEdit(this.client, before, after, caret);

    this.lastValue = after;
    this.updateChars(after);
  }

  /**
   * Re-render the textarea from the replica after a remote op, correcting the
   * caret so it stays glued to the same character (D3).
   *
   * `change` is null for the initial paint and for ops that left visible text
   * untouched — in both cases the offsets carry over unmodified.
   */
  private renderFromReplica(change: RemoteChange | null): void {
    const next = this.client.getText();
    if (next === this.textarea.value) return;

    // Read the offsets BEFORE touching .value — the assignment below destroys
    // them.
    let start = this.textarea.selectionStart;
    let end = this.textarea.selectionEnd;

    if (change) {
      // A selection has two independent anchors. They are shifted separately
      // because a remote change can land between them, in which case the
      // selection legitimately grows or shrinks rather than sliding.
      start = shiftCaret(start, change);
      end = shiftCaret(end, change);
    }

    // Assigning .value resets the selection to the end of the text, so the
    // caret must be restored explicitly on the next line — that reset is
    // exactly why naive re-rendering feels broken to type in.
    this.textarea.value = next;
    this.textarea.setSelectionRange(
      Math.min(start, next.length),
      Math.min(end, next.length),
    );

    this.lastValue = next;
    this.updateChars(next);
  }

  private setStatus(state: "open" | "closed", label: string): void {
    this.statusEl.dataset["state"] = state;
    this.statusTextEl.textContent = label;
  }

  private updateChars(text: string): void {
    this.charsEl.textContent = `${text.length} chars`;
  }

  public getText(): string {
    return this.client.getText();
  }
}
