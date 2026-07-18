export class RGANode {
    value;
    id;
    isDeleted;
    next;
    constructor(value, id) {
        this.value = value;
        this.id = id;
        this.isDeleted = false;
        this.next = null;
    }
}
export const ROOT = Object.freeze({ clientId: "", clock: 0 });
export class RGA {
    client;
    clock;
    head; // A dummy 'start of document' node
    constructor(clientId) {
        this.client = clientId;
        this.clock = 0;
        const id = { clientId, clock: 0 };
        this.head = new RGANode("__HEAD__", ROOT);
    }
    // 1. Increment local clock
    // 2. Create node
    // 3. Traverse list to find originId
    // 4. Apply Lamport tie-breaking if concurrent nodes exist
    // 5. Insert and return the new node's ID
    insertAfter(originId, value, clientTimestamp) {
        // increment local clock
        if (clientTimestamp == null) {
            clientTimestamp = { clientId: this.client, clock: ++this.clock };
        }
        else {
            // let temp: RGANode | null = this.head;
            // while (temp != null) {
            //     if (temp.id.clientId === clientTimestamp.clientId && temp.id.clock === clientTimestamp.clock) {
            //         return null;
            //     }
            //     temp = temp.next;
            // }
            this.clock = Math.max(this.clock, clientTimestamp.clock) + 1;
        }
        // create node
        const nextNode = new RGANode(value, clientTimestamp);
        // traverse list to find originId
        let temp = this.head;
        while (temp !== null) {
            if (temp.id.clientId === originId.clientId && temp.id.clock === originId.clock) {
                break;
            }
            temp = temp.next;
        }
        if (temp === null) {
            console.warn("Origin node not found");
            return null;
        }
        // apply lamport tie-breaking if concurrent nodes exist
        // find if ther other node exists
        // let temp2: RGANode | null = temp.next;
        // one line before we start, its all about winning
        // while (temp2 !== null) {
        //     // temp2 is the element with which I need to compare the nextNode
        //     // if nextNode wins, we break the loop
        //     // if temp2 wins, temp = temp2 and temp2 = temp2.next
        //     if (nextNode.id.clock > temp2.id.clock) {
        //         // nextNode wins
        //         break;
        //     }
        //     else if (nextNode.id.clock === temp2.id.clock) {
        //         // no one won yet
        //         // we need to check the clientId in order to find the winning node
        //         if (nextNode.id.clientId > temp2.id.clientId) {
        //             break;
        //         }
        //         else {
        //             temp = temp2;
        //             temp2 = temp2.next;
        //         }
        //     }
        //     else {
        //         // temp2 wins
        //         temp = temp2;
        //         temp2 = temp2.next;
        //     }
        // }
        while (temp.next !== null && (temp.next.id.clock > nextNode.id.clock || (nextNode.id.clock === temp.next.id.clock && nextNode.id.clientId <= temp.next.id.clientId))) {
            temp = temp.next;
        }
        // insert
        nextNode.next = temp.next;
        temp.next = nextNode;
        return nextNode.id;
    }
    // Find the node by ID and mark isDeleted = true
    delete(id) {
        // given a timestamp we need to delete
        let temp = this.head.next;
        while (temp != null) {
            if (temp.id.clock === id.clock && temp.id.clientId === id.clientId) {
                temp.isDeleted = true;
                break;
            }
            temp = temp.next;
        }
        if (temp == null)
            console.warn("Node not found");
    }
    // Traverse the list and return the visible string (ignoring tombstones)
    getText() {
        let str = "";
        let temp = this.head.next;
        while (temp != null) {
            if (!temp.isDeleted) {
                str += temp.value;
            }
            temp = temp.next;
        }
        return str;
    }
}
//# sourceMappingURL=RGA.js.map