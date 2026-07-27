import type { Transport } from "./transport.interface.js";
import WebSocket from "ws";

export class WsTransport implements Transport {
  private ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on("close", (close) => {
      console.log(close);
    });
    this.ws.on("error", (error) => {
      console.log(error);
    });
  }

  onOpen(handler: () => void): void {
    this.ws.on("open", handler);
  }
  isOpen(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }
  onMessage(handler: (data: string) => void): void {
    this.ws.on("message", (raw) => {
      handler(raw.toString());
    });
  }
  send(data: string): void {
    this.ws.send(data);
  }
}
