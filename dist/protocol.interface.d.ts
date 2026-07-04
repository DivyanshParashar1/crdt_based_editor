import type { Timestamp } from "./RGA.js";
export type OperationType = 'insert' | 'delete';
interface InsertOperation {
    type: 'insert';
    insertOriginId: Timestamp | null;
    value: string;
    id: Timestamp;
}
interface DeleteOperation {
    type: 'delete';
    id: Timestamp;
}
export type OperationMessage = InsertOperation | DeleteOperation;
export {};
//# sourceMappingURL=protocol.interface.d.ts.map