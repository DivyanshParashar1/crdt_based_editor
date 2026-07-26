import { RGA, type Timestamp } from "./RGA.js";
import crypto from "node:crypto"
import { type InsertOperation } from "./protocol.interface.js"
import { serialize } from "./protocol.js";
import WebSocket from "ws";




class client {
    public clientId: string;
    private clientReplica: RGA;
    private ws: WebSocket;
    private queue: Queue<string>

    constructor() {
        this.clientId = crypto.randomUUID();
        this.clientReplica = new RGA(this.clientId);
        this.ws = new WebSocket("ws://localhost:8080");
        this.ws.on("error", (err) => {
            console.log(err);
        })
        this.ws.on("close", (close) => {
            console.log(close);
        });
        this.queue = new Queue<string>();
        this.ws.on("open", () => {
            this.flush();
        })
    }

    private flush() {
        if (this.ws.readyState === WebSocket.OPEN) {
            while (!this.queue.isEmpty()) {
                const temp = this.queue.dequeue();
                if (temp) this.ws.send(temp);
            }
        }
    }

    insertAndSend(originId: Timestamp, value: string) {


        const id = this.clientReplica.insertAfter(originId, value, null);

        if (!id) return;
        const operation: InsertOperation = {
            type: "insert",
            originId,
            value,
            id
        };

        const serializedString = serialize(operation);
        this.queue.enqueue(serializedString);
        this.flush();

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