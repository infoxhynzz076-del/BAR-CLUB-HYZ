const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = new Map();

io.on("connection", (socket) => {
  socket.on("join", (rawName) => {
    const name = String(rawName || "Khách").trim().slice(0, 18) || "Khách";
    const player = {
      id: socket.id, name,
      x: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 5,
      color: ["#ff4f9a", "#49d9ff", "#ffe05c", "#a879ff", "#66edac"][Math.floor(Math.random()*5)],
      dance: false
    };
    players.set(socket.id, player);
    socket.emit("welcome", { self: player, players: [...players.values()] });
    socket.broadcast.emit("player-joined", player);
    io.emit("system", `${name} đã vào phòng bar`);
  });

  socket.on("move", (pos) => {
    const p = players.get(socket.id);
    if (!p || !pos) return;
    p.x = Math.max(-10, Math.min(10, Number(pos.x) || 0));
    p.z = Math.max(-7, Math.min(7, Number(pos.z) || 0));
    if (typeof pos.dance === "boolean") p.dance = pos.dance;
    socket.broadcast.emit("player-moved", p);
  });

  socket.on("chat", (message) => {
    const p = players.get(socket.id);
    if (!p) return;
    const clean = String(message || "").trim().slice(0, 180);
    if (clean) io.emit("chat", { name: p.name, text: clean, id: socket.id });
  });

  socket.on("reaction", (emoji) => {
    const p = players.get(socket.id);
    if (!p) return;
    const allowed = ["❤️", "🔥", "😂", "🎉", "💎", "🌹"];
    if (allowed.includes(emoji)) io.emit("reaction", { id: socket.id, emoji });
  });

  socket.on("disconnect", () => {
    const p = players.get(socket.id);
    if (p) {
      players.delete(socket.id);
      io.emit("player-left", socket.id);
      io.emit("system", `${p.name} đã rời phòng`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Bar Online đang chạy tại http://localhost:${PORT}`));
