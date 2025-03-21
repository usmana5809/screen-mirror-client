require("dotenv").config(); // ✅ Load .env
const express = require("express");
const WebSocket = require("ws");
const qr = require("qr-image");
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");




// 🔹 Configuration
const app = express();
const HTTP_PORT = 5000;
const WS_PORT = 5001;


const PUBLIC_DIR = path.join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

const server = https.createServer({}, app); // Keep empty object or use `http.createServer()` instead

const wss = new WebSocket.Server({ server });
// 🔹 Function to Get Local Network IP
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const config of iface) {
            if (config.family === "IPv4" && !config.internal) {
                return config.address;
            }
        }
    }
    return "127.0.0.1"; // Default to localhost
}

const localIp = getLocalIp();
const serverIp = `ws://${localIp}:${WS_PORT}`;
console.log(`✅ WebSocket server will run at: ${serverIp}`);

// 🔹 Generate & Save QR Code
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
const qrCode = qr.imageSync(serverIp, { type: "png" });
fs.writeFileSync(path.join(PUBLIC_DIR, "qr.png"), qrCode);

// 🔹 Serve Static Files
app.use(express.static(PUBLIC_DIR));

app.get("/qr", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "qr.png"));
});

// // 🔹 Create WebSocket Server for Audio/Video Streaming
// wss.on("connection", (ws) => {
//     console.log("✅ Client connected!");

//     ws.on("message", (data) => {
//         if (Buffer.isBuffer(data)) {
//             console.log(`📡 Received ${data.length} bytes of media data`);

//             // Broadcast the media data to all clients
//             wss.clients.forEach((client) => {
//                 if (client !== ws && client.readyState === WebSocket.OPEN) {
//                     client.send(data);
//                 }
//             });

//             console.log("🚀 Media data forwarded to clients.");
//         } else {
//             console.warn("⚠️ Received non-binary data, ignoring...");
//         }
//     });

//     ws.on("close", () => console.log("❌ Client disconnected"));
//     ws.on("error", (err) => console.error("❌ WebSocket error:", err));
// });


wss.on("connection", (ws) => {
    console.log("✅ Client connected!");

    ws.on("message", (data) => {
        if (Buffer.isBuffer(data)) {
            console.log(`📡 Received ${data.length} bytes of media data`);

            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });

            console.log("🚀 Media data forwarded to clients.");
        }
    });

    ws.on("close", () => console.log("❌ Client disconnected"));
    ws.on("error", (err) => console.error("❌ WebSocket error:", err));
});

server.listen(process.env.PORT || 3000, () => {
    console.log("✅ Server is running at:", `https://${process.env.PROJECT_DOMAIN}.glitch.me`);
});

// // 🔹 Start Express Server
// app.listen(HTTP_PORT, () => {
//     console.log(`✅ HTTP Server running at: http://${localIp}:${HTTP_PORT}`);
//     console.log(`🖼️ QR Code available at: http://${localIp}:${HTTP_PORT}/qr`);
//     console.log(`🔌 WebSocket Server listening on: ws://${localIp}:${WS_PORT}`);
// });

// 🔹 Optional: Secure WebSocket (WSS) Setup
// Uncomment & add SSL certificate paths if needed
/*
const sslOptions = {
    key: fs.readFileSync("/etc/letsencrypt/live/your-domain.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/your-domain.com/fullchain.pem"),
};

const secureServer = https.createServer(sslOptions, app);
const wssSecure = new WebSocket.Server({ server: secureServer });

secureServer.listen(443, () => {
    console.log("🔒 Secure WebSocket Server running on wss://your-domain.com");
});
*/
