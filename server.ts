import WebSocket, { WebSocketServer } from "ws";
import crypto from "crypto";

// adding id to socket
interface customWebSocket extends WebSocket {
    id?: string;
}


// starting a new wss
const wss = new WebSocketServer({
    port: 8080
});

// new connection
wss.on("connection", (socket: customWebSocket) => {

    socket.id = crypto.randomUUID();
    console.log(`New connection [${socket.id}]. Total: ${wss.clients.size}`);





    // new message
    socket.on("message", (data: WebSocket.RawData) => {
        wss.clients.forEach((client) => {
            const payload = data.toString();
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        })
    })

    socket.on("close", () => {
        console.log(`Client disconnected [${socket.id}]. Total: ${wss.clients.size}`);
    })


})

