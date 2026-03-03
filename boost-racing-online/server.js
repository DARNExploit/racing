const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

let rooms = {};

function createRoom(roomId) {
    rooms[roomId] = {
        players: {}
    };
}

wss.on("connection", (ws) => {

    let playerId = Math.random().toString(36).substring(2,9);
    let currentRoom = null;

    ws.on("message", (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === "join") {
                currentRoom = data.room;

                if (!rooms[currentRoom]) createRoom(currentRoom);

                rooms[currentRoom].players[playerId] = {
                    x: 0,
                    z: 0,
                    ws: ws
                };

                ws.send(JSON.stringify({
                    type: "init",
                    id: playerId
                }));
            }

            if (data.type === "input" && currentRoom) {

                let player = rooms[currentRoom].players[playerId];
                if (!player) return;

                // Server authoritative movement
                const speed = 2;

                if (data.keys.w) player.x += speed;
                if (data.keys.s) player.x -= speed;
                if (data.keys.a) player.z += speed;
                if (data.keys.d) player.z -= speed;

                // Broadcast updated state
                broadcastState(currentRoom);
            }

        } catch {}
    });

    ws.on("close", () => {
        if (currentRoom && rooms[currentRoom]) {
            delete rooms[currentRoom].players[playerId];
            broadcastState(currentRoom);
        }
    });

});

function broadcastState(roomId) {
    if (!rooms[roomId]) return;

    const state = {
        type: "state",
        players: {}
    };

    for (let id in rooms[roomId].players) {
        state.players[id] = {
            x: rooms[roomId].players[id].x,
            z: rooms[roomId].players[id].z
        };
    }

    for (let id in rooms[roomId].players) {
        rooms[roomId].players[id].ws.send(JSON.stringify(state));
    }
}

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});