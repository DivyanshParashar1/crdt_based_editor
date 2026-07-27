export interface Transport {
  // function when the socket is open
  onOpen(handler: () => void): void;

  // function when socket receives a message
  onMessage(handler: (data: string) => void): void;

  // function to know whether the connection is open or not
  isOpen(): boolean;

  // function to send data
  send(data: string): void;
}
