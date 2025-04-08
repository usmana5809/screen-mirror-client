const express = require("express");
const WebSocket = require("ws");
const qr = require("qr-image");
const fs = require("fs");
const path = require("path");

// 🔹 Setup Express
const app = express();
const HTTP_PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// 🔹 Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);

// 🔹 Generate Room-specific QR Code
const generateRoomId = () => Math.random().toString(36).substring(2, 8);

// 🔹 Serve Static Files
app.use(express.static(PUBLIC_DIR));
app.get("/qr", (req, res) => {
    const roomId = generateRoomId();
    const serverUrl = `wss://${process.env.PROJECT_DOMAIN}.glitch.me?room=${roomId}`;
    const qrCode = qr.imageSync(serverUrl, { type: "png" });
    fs.writeFileSync(path.join(PUBLIC_DIR, "qr.png"), qrCode);
    res.sendFile(path.join(PUBLIC_DIR, "qr.png"));
});

// 🔹 Start HTTP Server
const server = app.listen(HTTP_PORT, () => {
    console.log(`✅ Server running at: https://${process.env.PROJECT_DOMAIN}.glitch.me`);
});

// 🔹 WebSocket Server
const wss = new WebSocket.Server({ server });
const rooms = {}; // Track rooms and their connections

// Route to generate and send room ID to the client
app.get("/room", (req, res) => {
    const roomId = generateRoomId(); // Generate random Room ID
    console.log(`Generated Room ID: ${roomId}`);
    
    res.json({ roomId }); // Send the Room ID to the client
});

// Handle WebSocket connection
wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url.split("?")[1]);
    const roomId = params.get("room");

    if (!roomId) {
        console.warn("⚠️ Client connected without a Room ID. Closing connection.");
        ws.close();
        return;
    }

    // Ensure the room exists or create a new room
    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(ws);

    console.log(`✅ Client connected to Room: ${roomId}`);

    ws.on("message", (data) => {
        if (Buffer.isBuffer(data)) {
            console.log(`📡 Received ${data.length} bytes from Room: ${roomId}`);
            // Broadcast only to clients in the same room
            rooms[roomId].forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });
            console.log("🚀 Media forwarded.");
        } else {
            console.warn("⚠️ Ignored non-binary data.");
        }
    });

    ws.on("close", () => {
        console.log(`❌ Client disconnected from Room: ${roomId}`);
        rooms[roomId].delete(ws);
        if (rooms[roomId].size === 0) delete rooms[roomId]; // Remove empty rooms
    });

    ws.on("error", (err) => console.error("❌ WebSocket error:", err));
});
