import { Timestamp } from "./RGA";


export type OperationType = 'insert' | 'delete';

interface InsertOperation {
    type: 'insert'; //discriminator
    insertOriginId: Timestamp | null; // lamport id after which we need to insert the new node
    value: string; // the actual character
    id: Timestamp; // id of the current node, whic his needed to be inserted

}

interface DeleteOperation {
    type: 'delete';
    id: Timestamp; // lamport id of the node to be tombstoned
}


export type OperationMessage = InsertOperation | DeleteOperation;