import { RGA, type Timestamp, ROOT, RGANode } from "./RGA.js";
import {
  type InsertOperation,
  type DeleteOperation,
} from "./protocol.interface.js";
import * as protocol from "./protocol.js";
import { type Transport } from "./transport.interface.js";

export class Client {
  public clientId: string;
  private clientReplica: RGA;
  private queue: Queue<string>;
  private socket: Transport;
  private remoteChangeHandlers: Array<() => void> = [];

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

    protocol.applyOperation(this.clientReplica, operation);

    // A remote op mutates the replica with no UI involvement, so anything
    // rendering this replica has to be told. Same subscription shape as
    // Transport.onOpen — Client stays ignorant of who is listening or whether a
    // DOM exists at all, so this costs the Node entry points nothing.
    for (const handler of this.remoteChangeHandlers) handler();
  }

  /** Subscribe to "a remote operation has just been applied to this replica." */
  public onRemoteChange(handler: () => void): void {
    this.remoteChangeHandlers.push(handler);
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
