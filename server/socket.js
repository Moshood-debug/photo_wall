let io = null;

function init(server) {
    const { Server } = require("socket.io");

    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {
        console.log("🟢 Connected:", socket.id);
        console.log("👥 Total clients:", io.engine.clientsCount);

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