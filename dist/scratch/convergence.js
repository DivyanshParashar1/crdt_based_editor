import { RGA, ROOT } from "../RGA.js";
// const operations: OperationMessage[] = [];
// produce
function produce(replica, originId, value) {
    const id = replica.insertAfter(originId, value, null);
    if (id == null)
        return null;
    const operation = {
        type: "insert",
        insertOriginId: originId,
        value,
        id
    };
    return operation;
}
// deliver
function deliver(replica, op) {
    if (op.type === "insert") {
        replica.insertAfter(op.insertOriginId, op.value, op.id);
    }
}
const replicaA = new RGA("A");
const replicaB = new RGA("B");
// cases
// 1 both edit off the same origin(root) before any sync
const opFromA = produce(replicaA, ROOT, "A");
const opFromB = produce(replicaB, ROOT, "B");
// cross deliver
console.log("First round");
const textA1 = replicaA.getText();
const textB1 = replicaB.getText();
console.log("replicaA:", textA1);
console.log("replicaB:", textB1);
console.log(textA1 === textB1 ? "Converged" : "Diverged");
if (opFromB)
    deliver(replicaA, opFromB);
if (opFromA)
    deliver(replicaB, opFromA);
// assertion
console.log("Second round");
const textA = replicaA.getText();
const textB = replicaB.getText();
console.log("replicaA:", textA);
console.log("replicaB:", textB);
console.log(textA === textB ? "Converged" : "Diverged");
//# sourceMappingURL=convergence.js.map