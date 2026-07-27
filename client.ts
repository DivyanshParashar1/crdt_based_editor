import { RGA, type Timestamp } from "./RGA.js";
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
    if (operation) protocol.applyOperation(this.clientReplica, operation);
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
