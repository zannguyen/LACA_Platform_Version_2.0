require("dotenv").config();
const connectDB = require("./src/config/database");
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");

const port = process.env.PORT || 4000;
const server = http.createServer(app);

/**
 * ✅ Parse origins từ ENV
 * - Ưu tiên SOCKET_ORIGINS
 * - fallback sang CORS_ORIGINS
 * - nếu không set gì => allow all (để khỏi chết khi quên set ENV)
 */
const allowedOrigins = (
  process.env.SOCKET_ORIGINS ||
  process.env.CORS_ORIGINS ||
  ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOrigin = (origin, cb) => {
  // Cho phép request không có origin (Postman/cURL/server-to-server)
  if (!origin) return cb(null, true);

  // Nếu chưa set ENV => allow all (bạn có thể siết lại nếu muốn)
  if (allowedOrigins.length === 0) return cb(null, true);

  if (allowedOrigins.includes(origin)) return cb(null, true);

  return cb(new Error("Not allowed by CORS: " + origin));
};

// ✅ CORS cho Socket.IO (credentials true nếu FE dùng withCredentials / cookie)
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
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

    server.listen(port, () => {
      console.log(`>>> Server đang chạy tại port ${port}`);
      console.log(`>>> Local: http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Server tạch rồi:", err);
    process.exit(1);
  }
})();
