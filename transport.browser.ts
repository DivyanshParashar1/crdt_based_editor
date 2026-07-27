import type { Transport } from "./transport.interface.js";

export class BrowserTransport implements Transport {
  private ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.addEventListener("close", (event) => {
      console.log("Socket closed", event.code, event.reason);
    });

    this.ws.addEventListener("error", (event) => {
      console.log("Socket error", event);
    });
  }
  onOpen(handler: () => void): void {
    this.ws.addEventListener("open", handler);
  }

  onMessage(handler: (data: string) => void): void {
    this.ws.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        handler(event.data);
      }
    });
  }

  isOpen(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  send(data: string): void {
    this.ws.send(data);
  }
}
