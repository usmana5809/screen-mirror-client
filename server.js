const express = require("express");
const WebSocket = require("ws");
const qr = require("qr-image");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Serve Static Files
app.use(express.static(PUBLIC_DIR));

app.get("/qr", (req, res) => {
    const serverUrl = `wss://${req.headers.host}`;
    const qrCode = qr.imageSync(serverUrl, { type: "png" });
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(qrCode);
});

// Start HTTP Server
const server = app.listen(PORT, () => {
    console.log(`✅ Server running at: https://${process.env.PROJECT_DOMAIN}.glitch.me`);
});

const wss = new WebSocket.Server({ server });
const clients = new Map(); // Store clients with their IDs

wss.on("connection", (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9); // Unique ID for each client
    clients.set(clientId, ws);
    console.log(`✅ Client connected: ${clientId}`);

    // Send client their ID
    ws.send(JSON.stringify({ type: "welcome", clientId }));

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === "stream" && data.targetId && clients.has(data.targetId)) {
                // Forward the media only to the target user
                clients.get(data.targetId).send(JSON.stringify({
                    type: "stream",
                    clientId: clientId,
                    payload: data.payload,
                }));
                console.log(`🚀 Streaming from ${clientId} → ${data.targetId}`);
            }
        } catch (error) {
            console.error("⚠️ Error processing message:", error);
        }
    });

    ws.on("close", () => {
        clients.delete(clientId);
        console.log(`❌ Client disconnected: ${clientId}`);
    });

    ws.on("error", (err) => console.error("❌ WebSocket error:", err));
});
