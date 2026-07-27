import { defineConfig } from "vite";

// The browser build. Deliberately separate from `pnpm build` (tsc → dist/),
// which stays the Node/server pipeline.
//
// root: "web" makes web/index.html the entry. Imports reach up into the project
// root for client.ts / RGA.ts / protocol.ts — Vite resolves the ".js" specifiers
// in those imports to the ".ts" sources, so the NodeNext-style extensions the
// rest of the project uses keep working unchanged.
export default defineConfig({
    root: "web",
    // Read .env from the project root, not from web/, so Node and browser share
    // one config file. Only VITE_-prefixed vars are exposed to browser code —
    // Vite's guard against leaking secrets into a public bundle.
    envDir: "..",
    server: {
        // Not Vite's default 5173 — your screenify_frontend dev server already
        // owns that port, and silently landing on 5174 makes for confusing
        // "why am I looking at the wrong app" moments.
        port: 5180,
        strictPort: true,
        // Files live above `root`, so the dev server needs read access there.
        fs: { allow: [".."] },
    },
    build: {
        outDir: "../dist-web",
        emptyOutDir: true,
    },
});
