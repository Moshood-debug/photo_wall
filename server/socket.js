let io = null;

function init(server) {
    const { Server } = require("socket.io");

    io = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("🟢 Connected:", socket.id);
        console.log("👥 Total clients:", io.engine.clientsCount);

        socket.on("join-folder", (folder) => {
            const roomName = folder ? `folder:${folder}` : "folder:root";
            // Leave other folder rooms if any
            Array.from(socket.rooms).forEach((room) => {
                if (room.startsWith("folder:")) {
                    socket.leave(room);
                }
            });
            socket.join(roomName);
            console.log(`📱 Client ${socket.id} joined room: ${roomName}`);
        });

        socket.on("disconnect", () => {
            console.log("🔴 Disconnected:", socket.id);
            console.log("👥 Total clients:", io.engine.clientsCount);
        });
    });

    return io;
}

function getIO() {
    return io;
}

module.exports = {
    init,
    getIO,
};