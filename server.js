const express = require("express");
const WebSocket = require("ws");
const qr = require("qr-image");
const os = require("os");
const path = require("path");

const app = express();
const HTTP_PORT = process.env.PORT || 3000;

// Serve public files
app.use(express.static("public"));

// Function to get the local IP of the user
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "127.0.0.1";
}

// Handle QR Code Generation Per User
app.get("/qr", (req, res) => {
    const userIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const webSocketUrl = `ws://${userIp}:${HTTP_PORT + 1}`;
    
    const qrCode = qr.imageSync(webSocketUrl, { type: "png" });
    res.setHeader("Content-Type", "image/png");
    res.send(qrCode);
});

// Start Express server
const server = app.listen(HTTP_PORT, () => {
    console.log(`✅ Server running on: https://${process.env.PROJECT_DOMAIN}.glitch.me`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("✅ Client connected!");

    ws.on("message", (data) => {
        if (Buffer.isBuffer(data)) {
            console.log(`📡 Received ${data.length} bytes of media data`);

            // Broadcast media only to the sender's specific clients
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });

            console.log("🚀 Media forwarded.");
        } else {
            console.warn("⚠️ Ignored non-binary data.");
        }
    });

    ws.on("close", () => console.log("❌ Client disconnected"));
    ws.on("error", (err) => console.error("❌ WebSocket error:", err));
});
