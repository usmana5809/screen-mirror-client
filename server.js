const express = require("express");
const WebSocket = require("ws");
const qr = require("qr-image");
const fs = require("fs");
const os = require("os");
const path = require("path");

// 🔹 Setup Express
const app = express();
const HTTP_PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// 🔹 Generate QR Code
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
const serverUrl = `wss://${process.env.PROJECT_DOMAIN}.glitch.me`;
const qrCode = qr.imageSync(serverUrl, { type: "png" });
fs.writeFileSync(path.join(PUBLIC_DIR, "qr.png"), qrCode);

// 🔹 Serve Static Files
app.use(express.static(PUBLIC_DIR));
app.get("/qr", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "qr.png")));

// 🔹 Start HTTP Server
const server = app.listen(HTTP_PORT, () => {
    console.log(`✅ Server running at: https://${process.env.PROJECT_DOMAIN}.glitch.me`);
});

// 🔹 WebSocket Server
const wss = new WebSocket.Server({ server });
const rooms = {}; // Track rooms and their connections

wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url.split("?")[1]);
    const roomId = params.get("room") || "default"; // Get room ID

    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(ws);
    
    console.log(`✅ Client connected to room: ${roomId}`);

    ws.on("message", (data) => {
        if (Buffer.isBuffer(data)) {
            console.log(`📡 Received ${data.length} bytes from room: ${roomId}`);
            // Broadcast only to the same room
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
        console.log(`❌ Client disconnected from room: ${roomId}`);
        rooms[roomId].delete(ws);
        if (rooms[roomId].size === 0) delete rooms[roomId]; // Remove empty rooms
    });

    ws.on("error", (err) => console.error("❌ WebSocket error:", err));
});
