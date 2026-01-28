import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true, // Tự động mở trình duyệt khi chạy
  },
  // Thêm dòng này để fix lỗi nếu bạn dùng file .js thay vì .jsx
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
})