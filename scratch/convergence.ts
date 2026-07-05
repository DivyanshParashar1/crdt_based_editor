import { RGA, type Timestamp, ROOT } from "../RGA.js";
import type { OperationMessage } from "../protocol.interface.js"

const replicaA = new RGA("A");
const replicaB = new RGA("B");
const operations: OperationMessage[] = [];
let top = 0;

const originId: Timestamp = ROOT;
const value = "H"




// replicaA is the local RGA which this function is gonna refer to
// operations is the array which it is gonna operate on


const triggerSend = (operation: OperationMessage | undefined) => {
    if (operation && operation.type === "insert") {
        replicaB.insertAfter(operation.insertOriginId, operation.value, operation.id);
    }
}

const insertAndSend = (originId: Timestamp, value: string): void => {
    const id = replicaA.insertAfter(originId, value, null);

    if (id === null) {
        // the insert never happened, so no nned to worry
    }
    else {
        operations.push({
            type: "insert",
            insertOriginId: originId,
            value: value,
            id: id
        })
        top++;
        if (operations.at(-1) !== null) {
            triggerSend(operations.at(-1));
        }
    }
}


insertAndSend(originId, value);
insertAndSend(operations.at(-1)?.id || originId, "E");


insertAndSend(operations.at(-1)?.id || originId, "L");
insertAndSend(operations.at(-1)?.id || originId, "L");
insertAndSend(operations.at(-1)?.id || originId, "O");




console.log(replicaA.getText())
console.log(replicaB.getText())










