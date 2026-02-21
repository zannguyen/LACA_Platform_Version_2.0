# LACA Platform - Version 2.0

LACA là một nền tảng mạng xã hội dựa trên vị trí địa lý (Location-Based Social Network), cho phép người dùng chia sẻ bài đăng, check-in tại các địa điểm, tương tác với nhau và khám phá nội dung xung quanh vị trí của họ.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt và thiết lập](#cài-đặt-và-thiết-lập)
- [Biến môi trường](#biến-môi-trường)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [API Endpoints](#api-endpoints)
- [Mô hình dữ liệu](#mô-hình-dữ-liệu)
- [Tính năng Admin](#tính-năng-admin)
- [Triển khai](#triển-khai)
- [Đóng góp](#đóng-góp)
- [Giấy phép](#giấy-phép)

## 🎯 Tổng quan

LACA Platform là một ứng dụng web full-stack cho phép người dùng:

- **Chia sẻ bài đăng** kèm hình ảnh tại các địa điểm cụ thể
- **Check-in** tại các địa điểm và chia sẻ trải nghiệm
- **Tương tác** với bài đăng thông qua reactions
- **Chat** trực tiếp với người dùng khác
- **Khám phá** nội dung trên bản đồ dựa trên vị trí địa lý
- **Theo dõi** người dùng khác và xem feed của họ
- **Báo cáo** nội dung không phù hợp
- **Quản lý** nội dung và người dùng (Admin)

## ✨ Tính năng chính

### 👤 Xác thực và Quản lý người dùng
- Đăng ký tài khoản với xác minh email qua OTP
- Đăng nhập/Đăng xuất
- Quên mật khẩu với xác minh OTP
- Quản lý hồ sơ cá nhân (avatar, bio)
- Xóa tài khoản
- Block/Unblock người dùng
- Follow/Unfollow người dùng

### 📍 Bản đồ và Địa điểm
- Hiển thị bản đồ tương tác với Leaflet
- Hiển thị các hotspot (điểm nóng) có nhiều bài đăng
- Check-in tại địa điểm với ghi chú và hình ảnh
- Tìm kiếm và quản lý địa điểm
- Phân loại địa điểm (cafe, restaurant, bar, shop, park, museum, hotel, other)
- Heatmap hiển thị mật độ bài đăng

### 📸 Bài đăng và Nội dung
- Tạo bài đăng với hình ảnh và nội dung
- Upload nhiều hình ảnh cho mỗi bài đăng
- Gắn bài đăng với địa điểm cụ thể
- Xem bài đăng trên bản đồ và feed
- Lọc bài đăng theo khoảng cách
- Bài đăng tự động hết hạn sau một khoảng thời gian

### ❤️ Tương tác
- Reactions (like, love, haha, wow, sad, angry)
- Xem số lượng reactions trên mỗi bài đăng
- Thông báo khi có reaction mới

### 💬 Chat và Tin nhắn
- Chat trực tiếp giữa các người dùng
- Gửi tin nhắn văn bản và hình ảnh
- Xem danh sách cuộc trò chuyện
- Đánh dấu tin nhắn đã đọc
- Trạng thái online/offline với Socket.IO
- Thông báo tin nhắn mới

### 🔔 Thông báo
- Thông báo bài đăng mới từ người đang follow
- Thông báo tin nhắn mới
- Thông báo người dùng mới follow
- Thông báo reaction mới
- Thông báo từ admin
- Thông báo hệ thống
- Đánh dấu đã đọc/chưa đọc

### 🚨 Báo cáo và Kiểm duyệt
- Báo cáo bài đăng không phù hợp
- Báo cáo người dùng
- Báo cáo địa điểm
- Phân loại báo cáo (spam, harassment, inappropriate, false_info, other)
- Admin xem xét và xử lý báo cáo

### 👨‍💼 Admin Panel
- Dashboard với thống kê tổng quan
- Quản lý người dùng (xem, suspend, ban, xóa)
- Kiểm duyệt nội dung (bài đăng, báo cáo)
- Quản lý địa điểm
- Phân tích và báo cáo (analytics)
- Xem hoạt động gần đây

### 📝 Feedback
- Gửi phản hồi cho hệ thống
- Admin xem và xử lý feedback

## 🛠️ Công nghệ sử dụng

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (với Mongoose ODM)
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Image storage và upload
- **Multer** - File upload handling
- **Nodemailer** - Email service (OTP, notifications)
- **dotenv** - Environment variables

### Frontend
- **React 18** - UI library
- **Vite** - Build tool và dev server
- **React Router DOM** - Routing
- **Axios** - HTTP client
- **Leaflet** - Interactive maps
- **React Leaflet** - React wrapper cho Leaflet
- **Socket.IO Client** - Real-time client
- **Swiper** - Carousel/Slider component
- **React Spring** - Animations

### Development Tools
- **Nodemon** - Auto-restart server
- **ESLint** - Code linting

## 📁 Cấu trúc dự án

```
LACA_Platform_Version_2.0/
├── backend/
│   ├── src/
│   │   ├── config/          # Cấu hình (database, cloudinary)
│   │   ├── controllers/     # Controllers xử lý logic
│   │   ├── middlewares/     # Middleware (auth, error, upload)
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   └── utils/           # Utilities (JWT, email, seed data)
│   ├── app.js               # Express app configuration
│   └── server.js            # Server entry point với Socket.IO
│
├── frontend/
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── assets/         # Static assets (images)
│   │   ├── components/     # React components
│   │   │   ├── admin/      # Admin components
│   │   │   ├── auth/       # Authentication components
│   │   │   ├── camera/     # Camera components
│   │   │   ├── Chat/       # Chat components
│   │   │   ├── home/       # Home feed components
│   │   │   ├── map/        # Map components
│   │   │   ├── notification/ # Notification components
│   │   │   ├── profile/    # Profile components
│   │   │   ├── report/     # Report components
│   │   │   ├── setting/    # Settings components
│   │   │   └── ui/         # UI components
│   │   ├── context/        # React Context providers
│   │   ├── pages/          # Page components
│   │   ├── routes/         # Route configuration
│   │   ├── services/       # Frontend services
│   │   ├── utils/          # Utility functions
│   │   ├── App.jsx         # Main App component
│   │   └── main.jsx        # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js      # Vite configuration
│
├── package.json            # Root package.json
└── README.md               # File này
```

## 🚀 Cài đặt và thiết lập

### Yêu cầu hệ thống

- **Node.js** >= 16.x
- **MongoDB** >= 4.x (hoặc MongoDB Atlas)
- **npm** hoặc **yarn**

### Cài đặt

1. **Clone repository**
```bash
git clone https://github.com/FelixLe2210/LACA.git
cd LACA_Platform_Version_2.0
```

2. **Cài đặt dependencies cho root và backend**
```bash
npm install
```

3. **Cài đặt dependencies cho frontend**
```bash
cd frontend
npm install
cd ..
```

## 🔐 Biến môi trường

Tạo file `.env` trong thư mục `backend/` với các biến sau:

### Backend (.env)

```env
# Server
PORT=4000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/laca
# Hoặc MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/laca

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
REFRESH_TOKEN_EXPIRE_IN=30d

# Password hashing
SALT_ROUNDS=10

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# OTP
OTP_EXPIRED_IN=300000  # 5 phút (milliseconds)

# Cloudinary (Image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
SOCKET_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (.env hoặc .env.local)

Tạo file `.env` trong thư mục `frontend/`:

```env
VITE_API_URL=http://localhost:4000/api
```

## ▶️ Chạy ứng dụng

### Development Mode

1. **Chạy backend server**
```bash
# Từ thư mục root
npm run dev
# Hoặc
cd backend
nodemon server.js
```

Backend sẽ chạy tại: `http://localhost:4000`

2. **Chạy frontend (terminal mới)**
```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:3000`

### Production Mode

1. **Build frontend**
```bash
cd frontend
npm run build
```

2. **Chạy backend**
```bash
npm start
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/verify-otp` - Xác minh OTP
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/forgot-password` - Yêu cầu reset mật khẩu
- `POST /api/auth/forgot-password/verify-otp` - Xác minh OTP reset mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu mới

### User (`/api/user`)
- `GET /api/user/me/profile` - Lấy thông tin profile của user hiện tại (Auth)
- `PUT /api/user/me/profile` - Cập nhật profile (Auth)
- `GET /api/user/:userId/profile` - Lấy thông tin profile công khai

### Posts (`/api/posts`)
- `POST /api/posts` - Tạo bài đăng mới (Auth)
- `GET /api/posts` - Lấy danh sách bài đăng
- `GET /api/posts/:postId` - Lấy chi tiết bài đăng
- `PUT /api/posts/:postId` - Cập nhật bài đăng (Auth)
- `DELETE /api/posts/:postId` - Xóa bài đăng (Auth)

### Reactions (`/api/reactions`)
- `POST /api/reactions` - Thêm reaction (Auth)
- `DELETE /api/reactions/:reactionId` - Xóa reaction (Auth)
- `GET /api/reactions/post/:postId` - Lấy reactions của bài đăng

### Map (`/api/map`)
- `GET /api/map/hotspots` - Lấy các hotspot trên bản đồ
- `GET /api/map/posts` - Lấy bài đăng tại một điểm cụ thể
- `GET /api/map/nearby` - Lấy bài đăng gần vị trí

### Places (`/api/places`)
- `GET /api/places` - Lấy danh sách địa điểm
- `GET /api/places/:placeId` - Lấy chi tiết địa điểm
- `POST /api/places` - Tạo địa điểm mới (Auth)
- `PUT /api/places/:placeId` - Cập nhật địa điểm (Auth)

### Check-ins (`/api/checkins`)
- `POST /api/checkins` - Check-in tại địa điểm (Auth)
- `GET /api/checkins` - Lấy lịch sử check-in

### Chat (`/api/chat`)
- `POST /api/chat/send` - Gửi tin nhắn (Auth)
- `GET /api/chat/conversations` - Lấy danh sách cuộc trò chuyện (Auth)
- `GET /api/chat/messages/:conversationId` - Lấy tin nhắn (Auth)
- `POST /api/chat/read/:receiverId` - Đánh dấu đã đọc (Auth)
- `GET /api/chat/search` - Tìm kiếm người dùng để chat (Auth)
- `POST /api/chat/conversation` - Tạo hoặc lấy cuộc trò chuyện (Auth)

### Notifications (`/api/notifications`)
- `GET /api/notifications` - Lấy thông báo (Auth)
- `PUT /api/notifications/:notificationId/read` - Đánh dấu đã đọc (Auth)
- `GET /api/notifications/unread-count` - Lấy số thông báo chưa đọc (Auth)

### Reports (`/api/reports`)
- `POST /api/reports` - Tạo báo cáo (Auth)

### Feedback (`/api/feedbacks`)
- `POST /api/feedbacks` - Gửi feedback (Auth)
- `GET /api/feedbacks` - Lấy danh sách feedback (Admin)

### Upload (`/api/upload`)
- `POST /api/upload` - Upload hình ảnh (Auth)

### Admin (`/api/admin`)
- `GET /api/admin/dashboard` - Dashboard stats (Admin)
- `GET /api/admin/recent-activity` - Hoạt động gần đây (Admin)
- `GET /api/admin/analytics` - Phân tích (Admin)
- `GET /api/admin/locations` - Quản lý địa điểm (Admin)

### Admin Users (`/api/admin/users`)
- `GET /api/admin/users` - Danh sách người dùng (Admin)
- `GET /api/admin/users/:userId` - Chi tiết người dùng (Admin)
- `PUT /api/admin/users/:userId/suspend` - Suspend người dùng (Admin)
- `PUT /api/admin/users/:userId/ban` - Ban người dùng (Admin)
- `DELETE /api/admin/users/:userId` - Xóa người dùng (Admin)

### Admin Reports (`/api/admin/reports`)
- `GET /api/admin/reports` - Danh sách báo cáo (Admin)
- `PUT /api/admin/reports/:reportId/review` - Xem xét báo cáo (Admin)

## 🗄️ Mô hình dữ liệu

### User
- `fullname`, `username`, `email`, `password`
- `avatar`, `bio`
- `isActive`, `isEmailVerified`
- `role` (user/admin)
- `suspendUntil`, `deletedAt`
- `createdAt`, `updatedAt`

### Post
- `userId` (ref: User)
- `placeId` (ref: Place)
- `content`, `type`, `status`
- `mediaUrl` (array)
- `reportCount`
- `expireAt`
- `createdAt`, `updatedAt`

### Place
- `googlePlaceId`, `name`, `address`
- `category` (cafe, restaurant, bar, shop, park, museum, hotel, other)
- `location` (GeoJSON Point với coordinates [lng, lat])
- `isActive`
- `createdAt`, `updatedAt`

### Checkin
- `userId` (ref: User)
- `placeId` (ref: Place)
- `note`, `isPublic`
- `duration` (phút)
- `photos` (array URLs)
- `createdAt`

### Reaction
- `postId` (ref: Post)
- `userId` (ref: User)
- `type` (like, love, haha, wow, sad, angry)
- `createdAt`, `updatedAt`

### Conversation
- `participants` (array User IDs)
- `lastMessage` (text, image, sender, isRead, createdAt)
- `createdAt`, `updatedAt`

### Message
- `conversationId` (ref: Conversation)
- `senderId` (ref: User)
- `text`, `image`
- `isRead`
- `createdAt`, `updatedAt`

### Notification
- `recipientId` (ref: User)
- `senderId` (ref: User, nullable)
- `type` (new_post, new_message, new_follower, new_reaction, new_comment, admin_broadcast, system)
- `title`, `body`, `link`
- `refId`, `refModel`
- `isRead`
- `expireAt`
- `createdAt`, `updatedAt`

### Report
- `reporterId` (ref: User)
- `targetId`, `targetType` (post/user/place)
- `reason`, `category` (spam, harassment, inappropriate, false_info, other)
- `description`
- `status` (pending/reviewed/dismissed)
- `actionTaken` (none/warned/post_hidden/post_deleted/user_banned/place_hidden)
- `handledBy` (ref: User), `handledAt`, `note`
- `createdAt`

### Feedback
- `userId` (ref: User)
- `content`, `type`
- `status`
- `createdAt`, `updatedAt`

## 👨‍💼 Tính năng Admin

Admin panel cung cấp các công cụ quản lý:

### Dashboard
- Thống kê tổng quan: số người dùng, địa điểm, bài đăng, báo cáo đang chờ
- Hoạt động gần đây
- Biểu đồ và phân tích

### Quản lý người dùng
- Xem danh sách tất cả người dùng
- Tìm kiếm và lọc người dùng
- Suspend/Ban người dùng
- Xóa tài khoản
- Xem chi tiết profile

### Kiểm duyệt nội dung
- Xem danh sách báo cáo
- Xem xét và xử lý báo cáo
- Ẩn/Xóa bài đăng
- Quản lý địa điểm

### Quản lý bản đồ
- Xem và quản lý tất cả địa điểm
- Phê duyệt/Từ chối địa điểm mới
- Cập nhật thông tin địa điểm

### Analytics
- Thống kê người dùng
- Phân tích tăng trưởng
- Phân tích theo khu vực
- Báo cáo hoạt động

## 🚢 Triển khai

### Backend Deployment

1. **Chuẩn bị môi trường**
   - Thiết lập MongoDB Atlas hoặc MongoDB server
   - Thiết lập Cloudinary account
   - Cấu hình email service

2. **Deploy lên hosting (Render, Heroku, VPS, etc.)**
   ```bash
   # Set environment variables trên hosting
   # Build và start
   npm start
   ```

### Frontend Deployment

1. **Build production**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy lên Vercel, Netlify, hoặc hosting tĩnh**
   - Upload thư mục `dist/` sau khi build
   - Cấu hình biến môi trường `VITE_API_URL`

### Lưu ý khi triển khai

- Đảm bảo CORS_ORIGINS và SOCKET_ORIGINS được cấu hình đúng
- Sử dụng HTTPS trong production
- Thiết lập secure cookies
- Backup database thường xuyên
- Monitor logs và errors

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 Giấy phép

ISC License

## 👤 Tác giả

- GitHub: [@FelixLe2210](https://github.com/FelixLe2210)
- Repository: [LACA](https://github.com/FelixLe2210/LACA)

## 📞 Liên hệ và Hỗ trợ

- **Issues**: [GitHub Issues](https://github.com/FelixLe2210/LACA/issues)
- **Email**: (Thêm email liên hệ nếu có)

## 🙏 Lời cảm ơn

Cảm ơn tất cả những người đã đóng góp cho dự án này!

---

**Lưu ý**: Đây là phiên bản 2.0 của LACA Platform. Đảm bảo bạn đã đọc kỹ tài liệu và cấu hình đúng các biến môi trường trước khi chạy ứng dụng.
