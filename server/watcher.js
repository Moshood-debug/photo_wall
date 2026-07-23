const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { getIO } = require("./socket");

const uploadsDir = path.join(process.cwd(), "public", "uploads");

// Standard image extensions supported by browsers
const IMAGE_EXTENSIONS = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".heic"
]);

function isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
}

function startWatcher() {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const watcher = chokidar.watch(uploadsDir, {
        ignoreInitial: true,
        depth: 0,
        awaitWriteFinish: {
            stabilityThreshold: 1000,
            pollInterval: 200
        }
    });

    watcher.on("add", (filePath) => {
        const filename = path.basename(filePath);

        if (!isImageFile(filename)) {
            console.log("⚠️ Skipped non-image file:", filename);
            return;
        }

        console.log("📷 New image added:", filename);
        const io = getIO();

        if (io) {
            io.emit("new-image", { filename });
        } else {
            console.log("❌ Socket.IO not initialized when image arrived");
        }
    });

    watcher.on("unlink", (filePath) => {
        const filename = path.basename(filePath);
        const io = getIO();
        if (io) {
            io.emit("remove-image", { filename });
        }
    });

    console.log("👀 Watching uploads folder:", uploadsDir);
}

module.exports = startWatcher;