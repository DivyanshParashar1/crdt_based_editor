// DOM glue for one pane. Knows about textareas and carets; knows nothing about
// RGA, Lamport clocks, or the wire. Every CRDT decision it needs is delegated
// across the seam in edits.ts.

import type { Client } from "../client.js";
import type { Transport } from "../transport.interface.js";
import { applyLocalEdit } from "../edits.js";

function must<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`missing element: ${selector}`);
  return el;
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
    // to be told to re-read it.
    this.client.onRemoteChange(() => this.renderFromReplica());

    this.transport.onOpen(() => this.setStatus("open", "connected"));
    setInterval(() => {
      if (!this.transport.isOpen()) this.setStatus("closed", "disconnected");
    }, 1000);

    this.renderFromReplica();
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
   * Re-render the textarea from the replica after a remote op.
   *
   * CARET PRESERVATION (D3): this keeps the caret at the same numeric offset,
   * which is only correct when the remote edit landed *after* the caret. If a
   * remote insert lands before it, the local caret should shift right by the
   * inserted length or it visibly drifts backwards while you type. Deciding
   * that rule is yours — the setSelectionRange mechanics below are the part
   * that stays mine.
   */
  private renderFromReplica(): void {
    const next = this.client.getText();
    if (next === this.textarea.value) return;

    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

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
