import type { Timestamp } from "./RGA.js";

export type OperationType = "insert" | "delete";

export interface InsertOperation {
  type: "insert"; //discriminator
  originId: Timestamp; // lamport id after which we need to insert the new node
  value: string; // the actual character
  id: Timestamp; // id of the current node, which is needed to be inserted
}

export interface DeleteOperation {
  type: "delete";
  id: Timestamp; // Lamport id of the node to be tombstoned
}

export const PROTOCOL_VERSION = 1;

export interface Envelope {
  version: number;
  op: OperationMessage;
}

export type OperationMessage = InsertOperation | DeleteOperation;
