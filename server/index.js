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
        const folder = req.query.folder ? req.query.folder.replace(/\.\./g, "") : "";
        const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);

        if (!fs.existsSync(uploadsDir)) {
            return res.json({ images: [] });
        }

        const IMAGE_EXTENSIONS = new Set([
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".heic"
        ]);

        const scanDirectory = (dir, relPath = "") => {
            let results = [];
            const list = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of list) {
                const fullPath = path.join(dir, entry.name);
                const entryRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;

                if (entry.isDirectory() && !req.query.folder) {
                    // Only recursively scan subdirectories if no specific folder parameter was passed
                    results = results.concat(scanDirectory(fullPath, entryRelPath));
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (IMAGE_EXTENSIONS.has(ext)) {
                        const stats = fs.statSync(fullPath);
                        const fileUrlPath = folder ? `${folder}/${entry.name}` : entryRelPath;
                        results.push({ file: fileUrlPath, mtime: stats.mtimeMs });
                    }
                }
            }
            return results;
        };

        try {
            const imagesWithTime = scanDirectory(uploadsDir)
                .sort((a, b) => b.mtime - a.mtime)
                .map((item) => item.file);

            res.json({ images: imagesWithTime });
        } catch (err) {
            console.error("Error reading uploads directory:", err);
            res.status(500).json({ error: "Unable to scan directory" });
        }
    });

    // Let Next.js handle all other routes
    server.all("*", (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, hostname, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
        console.log(`> Network access: IP_ADDRESS:${port}`);
    });
});