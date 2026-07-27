// Browser composition root.
//
// This is the file that decides which Transport implementation exists and where
// it points — the same job scratch/c4-convergence.ts does for Node. Client is
// constructed identically in both, which is the entire payoff of D0.
//
// Note what is NOT imported here: config.ts. That module reads process.env and
// is Node-only. The browser gets its URL from Vite's import.meta.env instead,
// which is why VITE_WS_URL exists alongside WS_URL in .env.

import { Client } from "../client.js";
import { BrowserTransport } from "../transport.browser.js";
import { EditorPane } from "./editor.js";

const WS_URL: string = import.meta.env["VITE_WS_URL"] ?? "ws://localhost:8080";

function mount(paneSelector: string): EditorPane {
    const root = document.querySelector<HTMLElement>(paneSelector);
    if (!root) throw new Error(`missing pane: ${paneSelector}`);

    // One transport per pane — two sockets, exactly as C4 needs, and for the
    // same reason: server.ts excludes the sender by socket identity, so two
    // replicas sharing a connection would never hear each other.
    const transport = new BrowserTransport(WS_URL);
    return new EditorPane(root, new Client(transport), transport);
}

const paneA = mount('[data-pane="a"]');
const paneB = mount('[data-pane="b"]');

// Live convergence indicator. Polling is fine for a diagnostic — it is not load
// bearing, and it deliberately reads the two replicas rather than the two
// textareas so it reports on the CRDT, not on the DOM.
const badge = document.querySelector<HTMLElement>('[data-role="converged"]');
setInterval(() => {
    if (!badge) return;
    const converged = paneA.getText() === paneB.getText();
    badge.dataset["state"] = converged ? "converged" : "diverged";
    badge.textContent = converged ? "replicas converged" : "replicas diverged";
}, 500);
