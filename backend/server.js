require("dotenv").config();
const connectDB = require("./src/config/database");
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");

const port = process.env.PORT || 4000;

const server = http.createServer(app);

// ✅ CORS cho Socket.IO (quan trọng: credentials: true)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true, // ✅ FIX lỗi Access-Control-Allow-Credentials
  },
});

// ✅ để controller dùng req.app.get("io")
app.set("io", io);

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // FE emit: socket.emit("setup", { _id: currentUserId })
  socket.on("setup", (user) => {
    const userId = user?._id || user?.id || user?.userId || user?.userID;
    if (!userId) return;

    const key = String(userId);
    socket.join(key);
    socket.data.userId = key;

    const sockets = onlineUsers.get(key) || new Set();
    sockets.add(socket.id);
    onlineUsers.set(key, sockets);

    socket.emit("connected");
    socket.emit("online_users", Array.from(onlineUsers.keys()));
    io.emit("user_status", { userId: key, status: "online" });
  });

  socket.on("disconnect", () => {
    const key = socket.data.userId;
    if (key && onlineUsers.has(key)) {
      const sockets = onlineUsers.get(key);
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(key);
        io.emit("user_status", { userId: key, status: "offline" });
      } else {
        onlineUsers.set(key, sockets);
      }
    }

    console.log("❌ User disconnected:", socket.id);
  });
});

(async () => {
  try {
    await connectDB();

    // ✅ Listen bình thường (đừng ép "localhost" để khỏi lỗi môi trường)
    server.listen(port, () => {
      console.log(`>>> Server đang chạy tại port ${port}`);
      console.log(`>>> Local: http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Server tạch rồi:", err);
  }
})();
