// ── THE SEAM (D2 — yours) ────────────────────────────────────────────────────
//
// The DOM glue in web/ knows nothing about CRDTs. It knows only three facts
// about a local edit: the text before, the text after, and where the caret
// ended up. Everything past that point is CRDT reasoning and belongs to you.
//
// This file is the boundary. web/editor.ts calls applyLocalEdit() on every
// `input` event and does not care what happens inside.
//
// What you have to build in here, in order:
//
//   1. DIFF. From (before, after) work out the minimal change. The standard
//      approach is common-prefix / common-suffix: scan forward from index 0
//      while the characters ma tch, scan backward from both ends while they
//      match, and whatever is left in the middle is the change. `caret`
//      disambiguates the cases where prefix/suffix scanning is genuinely
//      ambiguous (e.g. typing "a" into "aaa" — every position produces the same
//      string, but only one of them is where the user actually typed).
//
//   2. MAP TO OPS. A diff says "the character at index 5 is new." An RGA needs
//      "insert after node X." Converting one into the other means walking the
//      replica's *visible* (non-tombstoned) nodes to find which node index 5
//      sits after — and index 0 is the ROOT sentinel. Multi-character changes
//      (paste, or a selection replaced by one keystroke) become several ops,
//      and each insert's origin is the node minted by the previous one.
//
// You will probably need a new method on Client or RGA to expose the id at a
// visible index. That's your call to design — this file's signature is the only
// thing web/editor.ts depends on, so anything behind it is free to change.

import type { Client } from "./client.js";

/**
 * Translate one local textarea edit into CRDT operations on `client`.
 *
 * @param client The replica that owns this textarea.
 * @param before The textarea's value immediately before this edit.
 * @param after  The textarea's value immediately after this edit.
 * @param caret  `selectionStart` after the edit — the position just past the
 *               inserted text, or the position of the deletion.
 */
export function applyLocalEdit(
  client: Client,
  before: string,
  after: string,
  caret: number,
): void {
  // TODO(D2): remove this guard and implement diff → ops.
  let prefixLen = 0;

  while (
    prefixLen < before.length &&
    prefixLen < after.length &&
    before[prefixLen] === after[prefixLen]
  ) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < before.length - prefixLen &&
    suffixLen < after.length - prefixLen &&
    before[before.length - 1 - suffixLen] ===
      after[after.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }
  let changeStart = prefixLen;
  let changeEnd_before = before.length - suffixLen;
  let changeEnd_after = after.length - suffixLen;

  let removed_text = before.substring(changeStart, changeEnd_before);
  let added_text = after.substring(changeStart, changeEnd_after);

  let change_index = caret - added_text.length;

  if (added_text.length > 0 && removed_text.length === 0) {
    let originId = client.getNodeIdAtVisibleIndex(change_index);

    let lastOriginId = originId;
    for (const char of added_text) {
      const newId = client.insertAndSend(lastOriginId, char);
      if (newId) {
        lastOriginId = newId;
      }
    }
  } else if (added_text.length === 0 && removed_text.length > 0) {
    const nodesToDelete = client.getNodeIdsInVisibleRange(
      change_index,
      change_index + removed_text.length,
    );

    for (const id of nodesToDelete) {
      client.deleteAndSend(id);
    }
  } else if (added_text.length > 0 && removed_text.length > 0) {
    const nodesToDelete = client.getNodeIdsInVisibleRange(
      change_index,
      change_index + removed_text.length,
    );

    for (const id of nodesToDelete) {
      client.deleteAndSend(id);
    }

    let originId = client.getNodeIdAtVisibleIndex(change_index);
    let lastOriginId = originId;
    for (const char of added_text) {
      const newId = client.insertAndSend(lastOriginId, char);
      if (newId) {
        lastOriginId = newId;
      }
    }
  }
}
