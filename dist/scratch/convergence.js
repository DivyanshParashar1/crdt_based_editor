import { RGA, ROOT } from "../RGA.js";
const replicaA = new RGA("A");
const replicaB = new RGA("B");
const operations = [];
let top = 0;
const originId = ROOT;
const value = "H";
// replicaA is the local RGA which this function is gonna refer to
// operations is the array which it is gonna operate on
const triggerSend = (operation) => {
    if (operation && operation.type === "insert") {
        replicaB.insertAfter(operation.insertOriginId, operation.value, operation.id);
    }
};
const insertAndSend = (originId, value) => {
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
        });
        top++;
        if (operations.at(-1) !== null) {
            triggerSend(operations.at(-1));
        }
    }
};
insertAndSend(originId, value);
insertAndSend(operations.at(-1)?.id || originId, "E");
console.log(replicaA.getText());
console.log(replicaB.getText());
//# sourceMappingURL=convergence.js.map