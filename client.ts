import { RGA, type Timestamp, ROOT, RGANode } from "./RGA.js";
import {
  type InsertOperation,
  type DeleteOperation,
} from "./protocol.interface.js";
import * as protocol from "./protocol.js";
import { type Transport } from "./transport.interface.js";

/**
 * What a remote operation did to the *visible* text, in the coordinate space
 * the UI thinks in (character offsets), not the one the CRDT thinks in (ids).
 *
 * This is the translation layer. The DOM cannot reason about Timestamps and
 * the RGA cannot reason about caret offsets, so exactly one of them has to
 * convert — and it has to be the side that can walk the node list. That's here.
 *
 * `index` is the 0-based visible offset the change occurred at:
 *   - insert: the offset the new character now occupies
 *   - delete: the offset the character occupied *before* it was tombstoned
 */
export type RemoteChange = {
  type: "insert" | "delete";
  index: number;
  /** Always 1 today: one RGA node holds one character. */
  length: number;
};

/** Timestamps are compared by value, never by reference — they arrive off the wire. */
function sameId(a: Timestamp, b: Timestamp): boolean {
  return a.clientId === b.clientId && a.clock === b.clock;
}

export class Client {
  public clientId: string;
  private clientReplica: RGA;
  private queue: Queue<string>;
  private socket: Transport;
  private remoteChangeHandlers: Array<(change: RemoteChange | null) => void> =
    [];

  constructor(transport: Transport) {
    this.clientId = crypto.randomUUID();
    this.clientReplica = new RGA(this.clientId);
    this.socket = transport;
    this.queue = new Queue<string>();
    this.socket.onMessage((raw) => {
      this.handleMessage(raw);
    });
    this.socket.onOpen(() => {
      this.flush();
    });
  }

  private flush() {
    if (this.socket.isOpen()) {
      while (!this.queue.isEmpty()) {
        const temp = this.queue.dequeue();
        if (temp) this.socket.send(temp);
      }
    }
  }

  public insertAndSend(originId: Timestamp, value: string): Timestamp | null {
    const id = this.clientReplica.insertAfter(originId, value, null);

    if (!id) return null;
    const operation: InsertOperation = {
      type: "insert",
      originId,
      value,
      id,
    };

    const serializedString = protocol.serialize(operation);
    this.queue.enqueue(serializedString);
    this.flush();

    return id;
  }
  private handleMessage(data: string): void {
    const operation = protocol.deserialize(data);
    if (!operation) return;

    // THE ASYMMETRY, and the reason this method is no longer "apply, notify":
    //
    // A DELETE's coordinates only exist BEFORE it lands. `RGA.delete` does not
    // unlink the node, it flips `isDeleted` — and a tombstone has no visible
    // index. Ask "where did that character live?" after applying and the walk
    // skips it and answers -1, forever.
    //
    // An INSERT is the exact mirror: its node does not exist yet, so its
    // coordinates only exist AFTER it lands. And you cannot shortcut it as
    // "origin's index + 1" — Lamport tie-breaking may slide the new node past
    // concurrent siblings before it settles.
    //
    // So the two op types are measured on opposite sides of applyOperation.
    const deleteIndexBefore =
      operation.type === "delete" ? this.findVisibleIndex(operation.id) : -1;

    // Idempotency, now extended to the caret. Both ops are already no-ops on
    // redelivery (insertAfter bails on a duplicate id; delete re-flips a flag
    // that is already true) — but a no-op that still moves the caret is a bug.
    // A duplicated insert would shift the caret twice for one character.
    const isDuplicate =
      operation.type === "insert"
        ? this.hasNode(operation.id)
        : deleteIndexBefore === -1;

    protocol.applyOperation(this.clientReplica, operation);

    let change: RemoteChange | null = null;
    if (!isDuplicate) {
      const index =
        operation.type === "insert"
          ? this.findVisibleIndex(operation.id)
          : deleteIndexBefore;

      // -1 means the op did not touch visible text (unknown origin, or an
      // insert that landed already-tombstoned). Null change = don't move.
      if (index !== -1) change = { type: operation.type, index, length: 1 };
    }

    // A remote op mutates the replica with no UI involvement, so anything
    // rendering this replica has to be told. Same subscription shape as
    // Transport.onOpen — Client stays ignorant of who is listening or whether a
    // DOM exists at all, so this costs the Node entry points nothing.
    for (const handler of this.remoteChangeHandlers) handler(change);
  }

  /**
   * Subscribe to "a remote operation has just been applied to this replica."
   * The change descriptor is null when the op left visible text untouched.
   */
  public onRemoteChange(handler: (change: RemoteChange | null) => void): void {
    this.remoteChangeHandlers.push(handler);
  }

  /**
   * 0-based visible offset of a node's character, or -1 if it is unknown to
   * this replica or tombstoned. Tombstones are skipped for counting but still
   * matched by id — that distinction is what makes the delete path work.
   */
  private findVisibleIndex(id: Timestamp): number {
    let visibleIndex = 0;
    let node: RGANode | null = this.clientReplica.getHead().next;

    while (node !== null) {
      if (sameId(node.id, id)) return node.isDeleted ? -1 : visibleIndex;
      if (!node.isDeleted) visibleIndex++;
      node = node.next;
    }
    return -1;
  }

  /** Presence check that ignores tombstones — "has this id ever been seen?" */
  private hasNode(id: Timestamp): boolean {
    let node: RGANode | null = this.clientReplica.getHead().next;
    while (node !== null) {
      if (sameId(node.id, id)) return true;
      node = node.next;
    }
    return false;
  }

  public deleteAndSend(id: Timestamp) {
    this.clientReplica.delete(id);

    const operation: DeleteOperation = {
      type: "delete",
      id,
    };
    const serializedString = protocol.serialize(operation);
    this.queue.enqueue(serializedString);
    this.flush();
  }

  public getText(): string {
    return this.clientReplica.getText();
  }

  public getNodeIdAtVisibleIndex(visibleIndex: number): Timestamp {
    if (visibleIndex === 0) return ROOT;

    let currentVisibleIndex = 0;
    let node: RGANode | null = this.clientReplica.getHead().next;

    while (node !== null) {
      if (!node.isDeleted) {
        currentVisibleIndex++;
        if (currentVisibleIndex === visibleIndex) {
          return node.id;
        }
      }

      node = node.next;
    }
    return ROOT;
  }

  public getNodeIdsInVisibleRange(
    visibleStart: number,
    visibleEnd: number,
  ): Timestamp[] {
    const ids: Timestamp[] = [];
    let currentVisibleIndex = 0;
    let node: RGANode | null = this.clientReplica.getHead().next;

    while (node !== null) {
      if (!node.isDeleted) {
        if (
          currentVisibleIndex >= visibleStart &&
          currentVisibleIndex < visibleEnd
        ) {
          ids.push(node.id);
        }
        if (currentVisibleIndex >= visibleEnd) {
          break;
        }
        currentVisibleIndex++;
      }
      node = node.next;
    }
    return ids;
  }
}

class Queue<T> {
  private queue: T[] = [];

  enqueue(item: T): void {
    this.queue.push(item);
  }
  dequeue(): T | undefined {
    return this.queue.shift();
  }
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
