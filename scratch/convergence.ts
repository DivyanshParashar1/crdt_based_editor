import { RGA, type Timestamp, ROOT } from "../RGA.js";
import type { OperationMessage } from "../protocol.interface.js";

// const operations: OperationMessage[] = [];

// produce

function produce(
  replica: RGA,
  originId: Timestamp,
  value: string,
): OperationMessage | null {
  const id = replica.insertAfter(originId, value, null);

  if (id === null) return null;
  const operation: OperationMessage = {
    type: "insert",
    originId: originId,
    value,
    id,
  };
  return operation;
}

// deliver
function deliver(replica: RGA, op: OperationMessage): void {
  if (op.type === "insert") {
    replica.insertAfter(op.originId, op.value, op.id);
  }
}

const replicaA = new RGA("A");
const replicaB = new RGA("B");

// case 1: Both edit with the same clock, and checking convergence

// // 1 both edit off the same origin(root) before any sync
// const opFromA = produce(replicaA, ROOT, "A");
// const opFromB = produce(replicaB, ROOT, "B");

// // cross deliver

// console.log("First round")
// const textA1 = replicaA.getText();
// const textB1 = replicaB.getText();

// console.log("replicaA:", textA1);
// console.log("replicaB:", textB1);

// console.log(textA1 === textB1 ? "Converged" : "Diverged");

// if (opFromB) deliver(replicaA, opFromB);
// if (opFromA) deliver(replicaB, opFromA);

// // assertion
// console.log("Second round")

// const textA = replicaA.getText();
// const textB = replicaB.getText();
// console.log("replicaA:", textA);
// console.log("replicaB:", textB);

// console.log(textA === textB ? "Converged" : "Diverged");

// case 2, checking the tiebreaker: clientId

// let first = produce(replicaA, ROOT, "a");

// let second = produce(replicaA, ROOT, "b");
// let third;
// if (first !== null) deliver(replicaB, first);
// if (second !== null) deliver(replicaB, second);
// if (second !== null && second !== undefined) {
//     third = produce(replicaB, ROOT, "c");
//     if (third !== null) {
//         deliver(replicaA, third);
//     }
// }

// const textA = replicaA.getText();
// const textB = replicaB.getText();
// console.log("replicaA:", textA);
// console.log("replicaB:", textB);

// console.log(textA === textB ? "Converged" : "Diverged");

// case 3

const first = produce(replicaA, ROOT, "a");

if (first !== null) {
  deliver(replicaB, first);
  deliver(replicaB, first);
}

const textB = replicaB.getText();
const textA = replicaA.getText();

console.log(textA);

console.log(textB);
console.log(textA === textB ? "Converged" : "Diverged");

import { type Envelope, PROTOCOL_VERSION } from "../protocol.interface.js";

const sampleInsert: Envelope = {
  version: PROTOCOL_VERSION,
  op: {
    type: "insert",
    originId: ROOT,
    value: "a",
    id: { clientId: "A", clock: 1 },
  },
};

const sampleDelete: Envelope = {
  version: PROTOCOL_VERSION,
  op: { type: "delete", id: { clientId: "A", clock: 1 } },
};

const e: Envelope = JSON.parse('{"versoin":1}');
console.log(e.version);
