import {
  type Envelope,
  type OperationMessage,
  PROTOCOL_VERSION,
} from "./protocol.interface.js";
import { type Timestamp, RGA } from "./RGA.js";

// type validation, the message type is "any" meaning we have to prove the type of the variable before using it

function isTimestamp(value: unknown): value is Timestamp {
  // need to check if the recieved value is a Timestamp or not.
  // 1. It must be an object, but not null. As null is also an object.
  if (typeof value !== "object" || value === null) return false;

  // So the object is not null, now we need to check the shape of each propoerty.
  const candidate = value as Record<string, unknown>;

  // candidate: it says that the key is a string, but we don't know the type of the value.
  return (
    typeof candidate.clientId === "string" &&
    typeof candidate.clock === "number"
  );
}

// to check if the unknown thing is a valid operations

function isOperationMessage(value: unknown): value is OperationMessage {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  switch (candidate.type) {
    case "insert":
      return (
        isTimestamp(candidate.originId) &&
        typeof candidate.value === "string" &&
        isTimestamp(candidate.id)
      );
    case "delete":
      return isTimestamp(candidate.id);
    default:
      return false;
  }
}

// to check if it is a valid envelope

function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.version === "number" && isOperationMessage(candidate.op)
  );
}

// serialize: take the operation message as input, and stamp the version
function serialize(op: OperationMessage): string {
  const envelope: Envelope = { version: PROTOCOL_VERSION, op };
  return JSON.stringify(envelope);
}
// deserialize: unpack the raw data, match the version, and return the operation message
function deserialize(raw: string): OperationMessage | null {
  let parsed: unknown;

  // try parse, return null if fails
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  // parsed is an object, check if it matches the type envelope
  if (!isEnvelope(parsed)) return null;

  // check if the protocol version matches
  if (parsed.version !== PROTOCOL_VERSION) return null;
  return parsed.op;
}

// apply the operation to the rga
function applyOperation(rga: RGA, op: OperationMessage): void {
  // two type of operation are there
  switch (op.type) {
    case "insert":
      // OperationMessage => InsertOperation {originId, value, id}
      rga.insertAfter(op.originId, op.value, op.id);
      break;

    case "delete":
      // OperationMessage => DeleteOperation {id}
      rga.delete(op.id);
      break;

    default: {
      // the "never" case
      const exhaustive: never = op;
      throw new Error(`Unhandled operation: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export { serialize, deserialize, applyOperation };
