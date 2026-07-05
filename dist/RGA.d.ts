export type Timestamp = {
    clientId: string;
    clock: number;
};
export declare class RGANode {
    value: string;
    id: Timestamp;
    isDeleted: boolean;
    next: RGANode | null;
    constructor(value: string, id: Timestamp);
}
export declare const ROOT: Timestamp;
export declare class RGA {
    private client;
    private clock;
    private head;
    constructor(clientId: string);
    insertAfter(originId: Timestamp, value: string, clientTimestamp: Timestamp | null): Timestamp | null;
    delete(id: Timestamp): void;
    getText(): string;
}
//# sourceMappingURL=RGA.d.ts.map