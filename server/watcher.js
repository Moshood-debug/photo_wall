const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { getIO } = require("./socket");

const uploadsDir = path.join(process.cwd(), "public", "uploads");

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
        awaitWriteFinish: {
            stabilityThreshold: 1000,
            pollInterval: 200
        }
    });

    const getFolderAndFile = (filePath) => {
        const relative = path.relative(uploadsDir, filePath);
        const parts = relative.split(path.sep);
        let folder = "";
        let filename = relative;
        if (parts.length > 1) {
            folder = parts.slice(0, -1).join("/");
            filename = parts.slice(0, -1).concat(parts[parts.length - 1]).join("/");
        }
        return { folder, filename, relativePath: relative.replace(/\\/g, "/") };
    };

    watcher.on("add", (filePath) => {
        const filename = path.basename(filePath);

        if (!isImageFile(filename)) {
            console.log("⚠️ Skipped non-image file:", filename);
            return;
        }

        const { folder, relativePath } = getFolderAndFile(filePath);
        console.log(`📷 New image added in folder [${folder || "root"}]:`, relativePath);
        const io = getIO();

        if (io) {
            const roomName = folder ? `folder:${folder}` : "folder:root";
            io.to(roomName).emit("new-image", { filename: relativePath, folder });
            // Also emit globally for any general watchers
            io.emit("new-image-global", { filename: relativePath, folder });
        } else {
            console.log("❌ Socket.IO not initialized when image arrived");
        }
    });

    watcher.on("change", (filePath) => {
        const filename = path.basename(filePath);

        if (!isImageFile(filename)) return;

        const { folder, relativePath } = getFolderAndFile(filePath);
        console.log(`🔄 Image updated in folder [${folder || "root"}]:`, relativePath);
        const io = getIO();

        if (io) {
            const roomName = folder ? `folder:${folder}` : "folder:root";
            io.to(roomName).emit("new-image", { filename: relativePath, folder });
            io.emit("new-image-global", { filename: relativePath, folder });
        }
    });

    watcher.on("unlink", (filePath) => {
        const filename = path.basename(filePath);
        if (!isImageFile(filename)) return;

        const { folder, relativePath } = getFolderAndFile(filePath);
        const io = getIO();
        if (io) {
            const roomName = folder ? `folder:${folder}` : "folder:root";
            io.to(roomName).emit("remove-image", { filename: relativePath, folder });
            io.emit("remove-image-global", { filename: relativePath, folder });
        }
    });

    console.log("👀 Watching uploads folder:", uploadsDir);
}

module.exports = startWatcher;