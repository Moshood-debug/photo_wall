const express = require("express");
const next = require("next");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { init } = require("./socket");
const startWatcher = require("./watcher");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);

    init(httpServer);

    server.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));
    startWatcher();

    // API endpoint to fetch existing images on initial page load
    server.get("/api/images", (req, res) => {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadsDir)) {
            return res.json({ images: [] });
        }

        const IMAGE_EXTENSIONS = new Set([
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".heic"
        ]);

        fs.readdir(uploadsDir, (err, files) => {
            if (err) {
                return res.status(500).json({ error: "Unable to scan directory" });
            }

            const imagesWithTime = files
                .filter((file) => {
                    const ext = path.extname(file).toLowerCase();
                    return IMAGE_EXTENSIONS.has(ext);
                })
                .map((file) => {
                    const filePath = path.join(uploadsDir, file);
                    const stats = fs.statSync(filePath);
                    return { file, mtime: stats.mtimeMs };
                })
                .sort((a, b) => b.mtime - a.mtime)
                .map((item) => item.file);

            res.json({ images: imagesWithTime });
        });
    });

    // Let Next.js handle all other routes
    server.all("*", (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, hostname, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
        console.log(`> Network access: http://10.120.69.203:${port}`);
    });
});