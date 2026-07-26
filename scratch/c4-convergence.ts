// C4 — end-to-end convergence proof over the REAL relay.
//
// Two Client instances connect to the ws server and insert CONCURRENTLY after
// ROOT — each fires before it has heard the other. The dumb relay cross-delivers
// the ops, and both replicas must resolve the tie-break identically and converge
// to the same getText(). This proves the *networked* stack, not the RGA alone.
//
// Run: pnpm exec tsx scratch/c4-convergence.ts

import "../server.js"; // side-effect import: starts the relay in-process on :8080
import { Client } from "../client.js";
import { ROOT } from "../RGA.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
    // give the WebSocketServer a moment to reach its 'listening' state before
    // any client dials in (the connect would otherwise be refused)
    await sleep(500);

    const a = new Client();
    const b = new Client();

    // let both handshakes complete (ops would queue-and-flush anyway, but we
    // want a clean, settled start so the two inserts are genuinely concurrent)
    await sleep(500);

    // CONCURRENT: both insert after the same origin, back-to-back, before either
    // op has round-tripped. The (clock, clientId) tie-break must order these the
    // SAME way on both replicas or they diverge.
    a.insertAndSend(ROOT, "A");
    b.insertAndSend(ROOT, "B");

    // let the relay deliver and both replicas apply
    await sleep(800);

    const textA = a.getText();
    const textB = b.getText();
    const converged = textA === textB;

    console.log("--------------------------------------------------");
    console.log(`clientA id=${a.clientId.slice(0, 8)}  getText() = "${textA}"`);
    console.log(`clientB id=${b.clientId.slice(0, 8)}  getText() = "${textB}"`);
    console.log(`CONVERGED: ${converged}`);
    console.log("--------------------------------------------------");

    process.exit(converged ? 0 : 1);
}

main();
