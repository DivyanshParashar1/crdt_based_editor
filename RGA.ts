// The unique identifier for every operation/node
export type Timestamp = {
    clientId: string;
    clock: number;
};

export class RGANode {
    value: string;
    id: Timestamp;
    isDeleted: boolean;
    next: RGANode | null;

    constructor(value: string, id: Timestamp) {
        this.value = value;
        this.id = id;
        this.isDeleted = false;
        this.next = null;
    }
}

export class RGA {
    private client: string;
    private clock: number;
    private head: RGANode; // A dummy 'start of document' node

    constructor(clientId: string) {
        this.client = clientId;
        this.clock = 0;

        const id: Timestamp = { clientId, clock: 0 }
        this.head = new RGANode("__HEAD__", id);
    }

    // 1. Increment local clock
    // 2. Create node
    // 3. Traverse list to find originId
    // 4. Apply Lamport tie-breaking if concurrent nodes exist
    // 5. Insert and return the new node's ID
    insertAfter(originId: Timestamp, value: string): Timestamp | null {
        // increment local clock
        this.clock++;

        // create node
        const nextNode = new RGANode(value, { clientId: this.client, clock: this.clock });

        // traverse list to find originId
        let temp: RGANode | null = this.head;

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


        while (temp.next !== null && (
            temp.next.id.clock > nextNode.id.clock || (
                nextNode.id.clock === temp.next.id.clock && nextNode.id.clientId <= temp.next.id.clientId
            )
        )) {
            temp = temp.next;
        }

        // insert
        nextNode.next = temp.next;
        temp.next = nextNode;

        return nextNode.id;
    }


    // Find the node by ID and mark isDeleted = true
    delete(id: Timestamp): void {
        // given a timestamp we need to delete
        let temp: RGANode | null = this.head.next;
        while (temp != null) {
            if (temp.id.clock === id.clock && temp.id.clientId === id.clientId) {
                temp.isDeleted = true;
                break;
            }
            temp = temp.next;
        }
        if (temp == null) console.warn("Node not found");




    }

    // Traverse the list and return the visible string (ignoring tombstones)
    getText(): string {
        let str: string = "";
        let temp: RGANode | null = this.head.next;

        while (temp != null) {
            if (!temp.isDeleted) {
                str += temp.value;
            }
            temp = temp.next;
        }
        return str;
    }
}