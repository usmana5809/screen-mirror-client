const express = require("express");
const WebSocket = require("ws");
const qr = require("qr-image");
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

// 🔹 Setup Express
const app = express();
const HTTP_PORT = process.env.PORT || 3000;
const WS_PORT = HTTP_PORT + 1;
const PUBLIC_DIR = path.join(__dirname, "public");

// 🔹 Get Local IP for QR Code
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const config of iface) {
            if (config.family === "IPv4" && !config.internal) {
                return config.address;
            }
        }
    }
    return "127.0.0.1";
}
const localIp = getLocalIp();
const serverIp = `wss://${process.env.PROJECT_DOMAIN}.glitch.me`;

// console.log(`✅ WebSocket server will run at: ${serverIp}`);

// 🔹 Generate QR Code
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
const qrCode = qr.imageSync(serverIp, { type: "png" });
fs.writeFileSync(path.join(PUBLIC_DIR, "qr.png"), qrCode);


// 🔹 Serve Static Files
app.use(express.static(PUBLIC_DIR));

app.get("/qr", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "qr.png"));
});


// 🔹 WebSocket Server
const server = app.listen(HTTP_PORT, () => {
    console.log(`✅ HTTP Server running at: https://${process.env.PROJECT_DOMAIN}.glitch.me`);
    console.log(`🖼️ QR Code at: https://${process.env.PROJECT_DOMAIN}.glitch.me/qr`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("✅ Client connected!");

    ws.on("message", (data) => {
        if (Buffer.isBuffer(data)) {
            console.log(`📡 Received ${data.length} bytes of media data`);

            // Broadcast media to all clients
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

