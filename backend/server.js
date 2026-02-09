// require("dotenv").config();
// const connectDB = require("./src/config/database");
// const app = require("./app");

// const port = process.env.PORT || 4000;

// (async () => {
//   try {
//     await connectDB();
//     app.listen(port, () => {
//       console.log(`Server running on port ${port}`);
//     });
//   } catch (err) {
//     console.error("Server failed to start", err);
//   }
// })();

require("dotenv").config();
const connectDB = require("./src/config/database");
const app = require("./app"); // File chứa các route API cũ
const http = require("http"); // Thư viện gốc của Node.js
const { Server } = require("socket.io");

const port = process.env.PORT || 4000;

// 1. Tạo Server HTTP thủ công (Bao bọc lấy app Express cũ)
const server = http.createServer(app);

// 2. Gắn thêm Socket.io vào Server này
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Lưu socket để dùng sau này (nếu cần)
app.set("io", io);

io.on("connection", (socket) => {
  // ... code socket của bạn ...
  console.log("⚡ User connected:", socket.id);
});

(async () => {
  try {
    await connectDB();

    // QUAN TRỌNG: Phải dùng server.listen
    server.listen(port, () => {
      console.log(`>>> Server đang chạy ngon lành tại port ${port}`);
    });
  } catch (err) {
    console.error("Server tạch rồi:", err);
  }
})();
