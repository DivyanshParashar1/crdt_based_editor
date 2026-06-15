import { WebSocketServer, WebSocket } from "ws";


const clients = new Map();
const wss = new WebSocketServer({
    port: 8080,
})

wss.on('connection', (socket) => {
    const id = crypto.randomUUID();
    socket.id = id;
    clients.set(id, socket);

    console.log("Total client count: ", wss.clients.size);

    socket.on("close", () => {
        clients.delete(id);
    })

    socket.on('message', (data) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== socket) {
                client.send(data.toString());
            }
        })
    })

});

function sendTo(message, targetId) {
    const socket = clients.get(targetId);

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
    }
}