import * as protocol from "../protocol.js";
import { RGA, ROOT } from "../RGA.js";
import assert from "node:assert";
import { type OperationMessage } from "../protocol.interface.js";


const string1 = '{"version":1,"op":{"type":"delete","id":{"clientId":"A","clock":1}}}'
const string2 = '{"version":2,"op":{"type":"delete","id":{"clientId":"A","clock":1}}}'
const string3 = '{"version":1,"op":{"type":"insrt","id":{"clientId":"A","clock":1}}}'
const string4 = '{"version":1,"op":null}'
const string5 = '{"vers'
const string6 = '{"version":1,"op":{"type":"insert","originId":{"clientId":"","clock":0},"value":"a","id":{"clientId":"A","clock":1}}}'



console.log(protocol.deserialize(string1)) // { type: 'delete', id: { clientId: 'A', clock: 1 } }
console.log(protocol.deserialize(string2)) // null
console.log(protocol.deserialize(string3)) // null
console.log(protocol.deserialize(string4)) // null
console.log(protocol.deserialize(string5)) // null
console.log(protocol.deserialize(string6))




const replicaA = new RGA("A");
const message1 = protocol.deserialize(string6);
if (message1 !== null) {

    protocol.applyOperation(replicaA, message1);
}
console.log(replicaA.getText());
const message2 = protocol.deserialize(string1);
if (message2 !== null) {
    protocol.applyOperation(replicaA, message2);
}

console.log(replicaA.getText(), "nothing found");

if (message1 !== null) {
    const reSerialize = protocol.serialize(message1);
    console.log(reSerialize === string6 ? "Serialize working" : "Serialize not working");
}


// round trip check for insert operation

// the deepStrictEqual doesn't return anything, but it halts the whole program if there is an assertion error

const originalInsert = {
    type: "insert",
    originId: ROOT,
    value: "a",
    id: {
        clientId: "A", clock: 1
    }
} satisfies OperationMessage;

const wire = protocol.serialize(originalInsert);
const returned = protocol.deserialize(wire);

// Using deepStrictEqual as it would compare the exact object content, and not the refernece

assert.deepStrictEqual(returned, originalInsert);
console.log("Round trip: value -> wire -> value");




// proving that the order doesn't matter

const string7 = '{"version":1,"op":{"type":"insert","originId":{"clientId":"","clock":0},"value":"a","id":{"clientId":"A","clock":1}}}';
const string8 = '{"op":{"id":{"clock":1,"clientId":"A"},"value":"a","type":"insert","originId":{"clock":0,"clientId":""}},"version":1}';

const fromSeven = protocol.deserialize(string7);
const fromEight = protocol.deserialize(string8);

assert.deepStrictEqual(fromSeven, fromEight);
console.log("key order is irrelevant to meaning");



// proving that the order doesn't matter, and would fail on normal unordered checks

console.log(protocol.serialize(fromEight!) === string7
    ? "string equality passed"
    : "string equality failed"
);



// Round trip for delete operation


const originalDelete = {
    type: "delete",
    id: { clientId: "A", clock: 1 },
} satisfies OperationMessage;

assert.deepStrictEqual(
    protocol.deserialize(protocol.serialize(originalDelete)),
    originalDelete
);
console.log("Round trip delete");