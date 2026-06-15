
const socket = new WebSocket("ws://localhost:8080");

socket.addEventListener('open', (event) => {
    console.log("new connection open");
})


const btn = document.querySelector("button");
const input = document.querySelector("input");
const div = document.querySelector("div");

btn.addEventListener("click", () => {
    socket.send(input.value);
})

socket.addEventListener('message', (message) => {
    const p = document.createElement('p');
    p.innerText = message.data;

    div.appendChild(p);
})

btn.style.color = "red";