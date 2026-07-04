import WebSocket, { WebSocketServer } from "ws";
import crypto from "crypto";
// starting a new wss
const wss = new WebSocketServer({
    port: 8080
});
// new connection
wss.on("connection", (socket) => {
    socket.id = crypto.randomUUID();
    console.log(`New connection [${socket.id}]. Total: ${wss.clients.size}`);
    // new message
    socket.on("message", (data) => {
        wss.clients.forEach((client) => {
            const payload = data.toString();
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    });
    socket.on("close", () => {
        console.log(`Client disconnected [${socket.id}]. Total: ${wss.clients.size}`);
    });
});
//# sourceMappingURL=server.js.map