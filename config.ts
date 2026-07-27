// Node-only configuration, read once at startup.
//
// DO NOT import this from client.ts. `process` does not exist in a browser, and
// keeping Client free of runtime-specific imports is the entire point of
// transport.interface.ts. Config belongs to the composition root — the entry
// point that constructs a Transport and hands it to a Client — never to Client
// itself. The browser entry point will supply its URL a different way.
import process from "node:process";

// Node >= 20.12 parses a .env file with no dependency and no CLI flag.
// https://nodejs.org/api/process.html#processloadenvfilepath
try {
  process.loadEnvFile();
} catch {
  // No .env on disk: fall through to the defaults below so a fresh clone
  // still runs before anyone has copied .env.example.
}

export const WS_PORT = Number(process.env.WS_PORT ?? 8080);

// Defaults off WS_PORT so setting the port alone keeps server and client in
// agreement — one value to change, not two that can silently drift apart.
export const WS_URL = process.env.WS_URL ?? `ws://localhost:${WS_PORT}`;
