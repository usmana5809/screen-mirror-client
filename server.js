const express = require("express");
const WebSocket = require("ws");
const qr = require("qr-image");
const os = require("os");
const path = require("path");

const app = express();
const HTTP_PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.static(PUBLIC_DIR));

// 🔹 Get Local IP for Each User
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

// 🔹 Serve QR Code Dynamically
app.get("/qr", (req, res) => {
    const localIp = getLocalIp();
    const userUrl = `http://${localIp}:${HTTP_PORT}`;
    const qrCode = qr.imageSync(userUrl, { type: "png" });
    res.setHeader("Content-Type", "image/png");
    res.send(qrCode);
});

// 🔹 WebSocket Server
const server = app.listen(HTTP_PORT, () => {
    console.log(`✅ Server running at: http://localhost:${HTTP_PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("✅ Client connected!");

    ws.on("message", (data) => {
        if (Buffer.isBuffer(data)) {
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });
        }
    });

    ws.on("close", () => console.log("❌ Client disconnected"));
    ws.on("error", (err) => console.error("❌ WebSocket error:", err));
});
