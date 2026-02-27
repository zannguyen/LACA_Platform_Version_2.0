import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Đổi thành '/ten-folder/' nếu deploy vào subfolder
  plugins: [react()],
  server: {
    // host: "0.0.0.0", // Truy cập từ IP ngoài
    port: 3000,
    open: false, // Tự động mở trình duyệt khi chạy
  },
  // Thêm dòng này để fix lỗi nếu bạn dùng file .js thay vì .jsx
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
});
