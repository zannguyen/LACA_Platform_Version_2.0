# CLAUDE.md

This file provides guidance to Claude Opus (claude.ai/code) when working with code in this repository.

## Project Overview

LACA (Location-Based Social Network) is a full-stack social media platform using Node.js/Express backend with MongoDB and React frontend with Vite. The platform allows users to share posts, check-in at places, interact with others, and discover content around their location.

**AI Features:**

- Chatbot AI assistant with Groq (Llama 3.3) or OpenAI integration
- RAG (Retrieval-Augmented Generation) for context-aware responses
- Content analysis for posts

## Common Development Commands

### Setup

```bash
# Install all dependencies (root + frontend)
npm install
cd frontend && npm install && cd ..
```

### Development

```bash
# Run backend (from root) - watches for changes with nodemon
npm run dev

# Run frontend (from frontend directory)
cd frontend && npm run dev

# Both should run in separate terminals
# Backend: http://localhost:4000
# Frontend: http://localhost:5173 or http://localhost:3000
```

### Production

```bash
# Build frontend
cd frontend && npm run build

# Start backend (production mode)
npm start
```

### Linting

```bash
# Lint frontend code
cd frontend && npm run lint
```

## Architecture Overview

### Backend Structure (Node.js/Express)

- **Entry point**: `backend/server.js` - HTTP server with Socket.IO setup
- **App config**: `backend/app.js` - Express middleware and route registration
- **Controllers** (`src/controllers/`): Handle request logic, organized by feature
- **Services** (`src/services/`): Business logic layer, separated from controllers
- **Models** (`src/models/`): Mongoose schemas for MongoDB collections
- **Routes** (`src/routes/`): API endpoint definitions
- **Middlewares** (`src/middlewares/`): Auth, error handling, file upload, validation
- **Config** (`src/config/`): Database and Cloudinary setup
- **Utils** (`src/utils/`): JWT, email, error handling, async wrappers

### Frontend Structure (React/Vite)

- **Entry**: `frontend/src/main.jsx` → `App.jsx`
- **Pages** (`src/pages/`): Full page components
- **Components** (`src/components/`): Reusable UI components organized by feature
- **API** (`src/api/`): Axios client functions for backend communication
- **Context** (`src/context/`): React Context providers (SocketContext, LocationAccessContext)
- **Routes** (`src/routes/`): Route configuration
- **Services** (`src/services/`): Frontend utilities (Socket.IO, storage, etc.)
- **Utils** (`src/utils/`): Helper functions

### Key Technologies

- **Backend**: Express.js, MongoDB/Mongoose, Socket.IO (real-time chat), JWT auth, Cloudinary (image storage)
- **Frontend**: React 18, Vite, React Router, Leaflet (maps), Socket.IO client, Axios
- **Real-time**: Socket.IO for chat and online status
- **Authentication**: JWT tokens with refresh token rotation
- **AI**: Groq (Llama 3.3), OpenAI (GPT-3.5), Google Gemini for chatbot and content analysis

## Environment Setup

### Backend (.env in root)

```env
PORT=4000
MONGO_URI=mongodb+srv://<user>:<password>@laca.gm9ln1j.mongodb.net/social_local_db
JWT_ACCESS_SECRET=access0002
JWT_REFRESH_SECRET=refresh0003
JWT_OTP_SECRET=otp0001
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
SALT_ROUNDS=10
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SOCKET_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
USERNAME_LENGTH_MIN=6
USERNAME_LENGTH_MAX=20
PASSWORD_LENGTH_MIN=8
PASSWORD_LENGTH_MAX=30
OTP_EXPIRED_IN=120000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=le0063020@gmail.com
EMAIL_PASSWORD=<app_password>
CLOUDINARY_CLOUD_NAME=dtjhqvafy
CLOUDINARY_API_KEY=492383661879689
CLOUDINARY_API_SECRET=<secret>
# AI APIs (at least one required for chatbot)
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
VITE_GEMINI_API_KEY=AIzaSy...
```

### Frontend (.env in frontend/)

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
VITE_GEMINI_API_KEY=AIzaSy...
```

## API Routes

### Authentication Routes (`/api/auth`)

| Method | Endpoint                      | Description            |
| ------ | ----------------------------- | ---------------------- |
| POST   | `/register`                   | Register new user      |
| POST   | `/login`                      | User login             |
| POST   | `/verify-otp`                 | Verify email OTP       |
| POST   | `/forgot-password`            | Request password reset |
| POST   | `/forgot-password/verify-otp` | Verify reset OTP       |
| POST   | `/reset-password`             | Set new password       |
| POST   | `/refresh-token`              | Refresh access token   |
| POST   | `/logout`                     | User logout            |

### User Routes (`/api/user`)

| Method | Endpoint             | Description                 |
| ------ | -------------------- | --------------------------- |
| GET    | `/profile/:userId`   | Get user profile            |
| PUT    | `/profile`           | Update current user profile |
| PUT    | `/avatar`            | Update avatar               |
| POST   | `/follow/:userId`    | Follow user                 |
| DELETE | `/follow/:userId`    | Unfollow user               |
| POST   | `/block/:userId`     | Block user                  |
| DELETE | `/block/:userId`     | Unblock user                |
| GET    | `/followers/:userId` | Get user followers          |
| GET    | `/following/:userId` | Get user following          |
| PUT    | `/interests`         | Update user interests       |
| PUT    | `/preferred-tags`    | Update preferred tags       |

### Post Routes (`/api/posts`)

| Method | Endpoint        | Description                     |
| ------ | --------------- | ------------------------------- |
| POST   | `/`             | Create new post                 |
| GET    | `/home`         | Get home feed (recommendations) |
| GET    | `/:postId`      | Get single post                 |
| DELETE | `/:postId`      | Delete post                     |
| GET    | `/user/:userId` | Get user posts                  |

### Map Routes (`/api/map`)

| Method | Endpoint          | Description                    |
| ------ | ----------------- | ------------------------------ |
| GET    | `/posts/nearby`   | Get nearby posts within radius |
| GET    | `/posts/at-point` | Get posts at specific point    |
| GET    | `/posts/density`  | Get post density heatmap       |
| GET    | `/posts/hotspots` | Get popular areas              |

### Chat Routes (`/api/chat`)

| Method | Endpoint                         | Description               |
| ------ | -------------------------------- | ------------------------- |
| GET    | `/conversations`                 | Get user conversations    |
| GET    | `/conversations/:conversationId` | Get conversation messages |
| POST   | `/messages`                      | Send direct message       |
| PUT    | `/messages/read/:conversationId` | Mark messages as read     |

### Place Routes (`/api/places`)

| Method | Endpoint           | Description                 |
| ------ | ------------------ | --------------------------- |
| GET    | `/suggestions`     | Get place suggestions       |
| GET    | `/reverse-geocode` | Reverse geocode coordinates |
| GET    | `/:placeId`        | Get place details           |

### Notification Routes (`/api/notifications`)

| Method | Endpoint                | Description                    |
| ------ | ----------------------- | ------------------------------ |
| GET    | `/`                     | Get user notifications         |
| PUT    | `/:notificationId/read` | Mark as read                   |
| DELETE | `/:notificationId`      | Delete notification            |
| POST   | `/system/broadcast`     | Admin broadcast (admin)        |
| POST   | `/admin/broadcast-all`  | Broadcast to all users (admin) |

### Reaction Routes (`/api/reactions`)

| Method | Endpoint   | Description        |
| ------ | ---------- | ------------------ |
| POST   | `/:postId` | Add reaction       |
| DELETE | `/:postId` | Remove reaction    |
| GET    | `/:postId` | Get post reactions |

### Tag Routes (`/api/tags`)

| Method | Endpoint  | Description             |
| ------ | --------- | ----------------------- |
| GET    | `/`       | Get all tags/categories |
| POST   | `/`       | Create tag (admin)      |
| PUT    | `/:tagId` | Update tag (admin)      |
| DELETE | `/:tagId` | Delete tag (admin)      |

### Interest Routes (`/api/interests`)

| Method | Endpoint       | Description             |
| ------ | -------------- | ----------------------- |
| GET    | `/`            | Get all interests       |
| POST   | `/`            | Create interest (admin) |
| PUT    | `/:interestId` | Update interest (admin) |
| DELETE | `/:interestId` | Delete interest (admin) |

### Analysis Routes (`/api/analysis`)

| Method | Endpoint    | Description          |
| ------ | ----------- | -------------------- |
| POST   | `/analyze`  | Analyze post content |
| GET    | `/trending` | Get trending topics  |

### Recommendation Routes (`/api/recommendations`)

| Method | Endpoint    | Description           |
| ------ | ----------- | --------------------- |
| GET    | `/feed`     | Get personalized feed |
| GET    | `/trending` | Get trending posts    |

### Feedback Routes (`/api/feedbacks`)

| Method | Endpoint | Description     |
| ------ | -------- | --------------- |
| POST   | `/`      | Submit feedback |

### Report Routes (`/api/reports`)

| Method | Endpoint      | Description        |
| ------ | ------------- | ------------------ |
| POST   | `/`           | Create report      |
| GET    | `/my-reports` | Get user's reports |

### Upload Routes (`/api/upload`)

| Method | Endpoint | Description               |
| ------ | -------- | ------------------------- |
| POST   | `/`      | Upload file to Cloudinary |

### Ranking Routes (`/api/ranking`)

| Method | Endpoint    | Description                              |
| ------ | ----------- | ---------------------------------------- |
| GET    | `/featured` | Get featured locations and users ranking |

### Chatbot Routes (`/api/chatbot`)

| Method | Endpoint   | Description                               |
| ------ | ---------- | ----------------------------------------- |
| POST   | `/message` | AI chatbot message (Groq/OpenAI with RAG) |

### Admin Routes (`/api/admin`)

| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| GET    | `/dashboard`         | Dashboard stats      |
| GET    | `/analytics`         | Analytics data       |
| GET    | `/users`             | User management list |
| PUT    | `/users/:userId`     | Update user          |
| DELETE | `/users/:userId`     | Delete user          |
| GET    | `/reports`           | Report list          |
| PUT    | `/reports/:reportId` | Handle report        |
| GET    | `/locations`         | Location management  |
| POST   | `/broadcast`         | Send broadcast       |
| GET    | `/broadcast-history` | Broadcast history    |
| GET    | `/queue`             | Queue stats          |
| POST   | `/queue/clear`       | Clear queue          |

## Database Models

### User (`user.model.js`)

- `fullname`, `username`, `email`, `password`
- `isActive`, `isEmailVerified`, `role` (user/admin)
- `avatar`, `bio`, `coverImage`
- `interests[]` -> Interest
- `preferredTags[]` -> Tag
- `followers[]`, `following[]`
- `deletedAt`, `suspendUntil`

### Post (`post.model.js`)

- `userId` -> User
- `placeId` -> Place
- `content`, `type`, `status`
- `mediaUrl[]`, `tags[]`
- `reportCount`, `expireAt`
- `analysisId` -> PostAnalysis

### Conversation (`conversation.model.js`)

- `type` (direct/public)
- `participants[]` -> User
- `postId` -> Post (for public chats)
- `lastMessage`, `createdBy`

### Message (`message.model.js`)

- `conversationId` -> Conversation
- `senderId` -> User
- `postId` -> Post
- `text`, `image`, `isRead`

### Notification (`notification.model.js`)

- `recipientId`, `senderId` -> User
- `type` (new_post, new_follower, new_reaction, system)
- `title`, `body`, `link`
- `refId`, `refModel` (polymorphic)
- `isRead`

### Place (`place.model.js`)

- `googlePlaceId`, `name`, `address`
- `category`
- `location` (GeoJSON Point)

### Reaction (`reaction.model.js`)

- `postId` -> Post
- `userId` -> User
- `type` (like, love, etc.)

### Report (`report.model.js`)

- `reporterId`, `targetId` -> User
- `targetType` (user/post)
- `reason`, `category`
- `status` (pending/resolved/dismissed)
- `actionTaken`, `handledBy`

### Tag & Category (`tag.model.js`, `category.model.js`)

- `name`, `description`, `icon`, `color`
- `order`, `isActive`
- `categoryId` (for tags)

### Interest (`interest.model.js`)

- `name`, `description`
- `icon` (emoji/image)
- `isActive`

### Follow (`follow.model.js`)

- `followerUserId`, `followingUserId` -> User

### BlockUser (`blockUser.model.js`)

- `blockerUserId`, `blockedUserId` -> User

### Checkin (`checkin.model.js`)

- `userId`, `placeId` -> User, Place
- `note`, `isPublic`, `duration`
- `photos[]`

### Other Models

- `emailOTP` - OTP verification
- `refreshToken` - Token management
- `feedback` - User feedback
- `broadcastHistory` - Admin broadcasts
- `postAnalysis` - AI analysis results

## Key Architectural Patterns

### Request Flow

1. Frontend makes API call via Axios (`src/api/`)
2. Backend route receives request (`src/routes/`)
3. Middleware validates auth/input (`src/middlewares/`)
4. Controller handles request logic (`src/controllers/`)
5. Service layer executes business logic (`src/services/`)
6. Model interacts with MongoDB (`src/models/`)
7. Response sent back to frontend

### Authentication Flow

1. **Register**: `POST /api/auth/register` → create user (inactive)
2. **Verify OTP**: `POST /api/auth/verify-otp` → activate user
3. **Login**: `POST /api/auth/login` → return tokens
4. Tokens: access token in localStorage, refresh token in httpOnly cookie
5. Middleware validates Bearer token from Authorization header
6. Checks: deletedAt, suspendUntil, isActive, isEmailVerified

### Real-time Communication (Socket.IO)

- Backend: `server.js` initializes Socket.IO server with CORS
- Frontend: `src/context/SocketContext.jsx` manages Socket.IO client

**Server Events:**
| Event | Purpose |
|-------|---------|
| `setup` | Join user to personal room |
| `connected` | Confirm connection |
| `online_users` | List online users |
| `user_status` | User online/offline |
| `receive_message` | New chat message |
| `messages_read` | Messages marked read |
| `user_left` | User left public chat |
| `notification` | New notification |

**Public Chat (Post Discussions):**

- `join_post_chat(postId)` - Join room
- `leave_post_chat(postId)` - Leave room
- Room: `post_{postId}`

### Recommendation Algorithm (`recommendation.service.js`)

Content-based filtering with scoring:

- Tag match: 50%
- Interest match: 25%
- Location: 15%
- Recency: 7%
- Engagement: 3%

### Geo Queries (`map.route.js`)

- `/api/map/posts/nearby` - Posts within radius (default 5km)
- `/api/map/posts/at-point` - Posts at specific point
- `/api/map/posts/density` - Post density heatmap
- `/api/map/posts/hotspots` - Popular areas with thumbnails

### File Upload

- Multer handles file uploads (`src/middlewares/upload.middleware.js`)
- Cloudinary stores images (`src/config/cloudinary.js`)
- Upload route: `POST /api/upload`

## Middlewares

| File                         | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `auth.middleware.js`         | JWT validation, user status checks |
| `optionalAuth.middleware.js` | Optional authentication            |
| `requireAdmin.js`            | Admin role check                   |
| `error.middleware.js`        | Global error handler               |
| `upload.middleware.js`       | Multer file upload                 |
| `geoValidator.middleware.js` | Validate geo coordinates           |

## Frontend Pages

| Page                           | Path                      | Description                    |
| ------------------------------ | ------------------------- | ------------------------------ |
| `LoginPage.jsx`                | `/login`                  | Login form                     |
| `RegisterPage.jsx`             | `/register`               | Registration with OTP          |
| `ForgotPasswordPage.jsx`       | `/forgot-password`        | Password reset flow            |
| `HomePage.jsx`                 | `/home`                   | Home feed with recommendations |
| `Map.jsx`                      | `/map`                    | Interactive map with posts     |
| `UserProfilePage.jsx`          | `/profile`                | Current user profile           |
| `StrangerProfilePage.jsx`      | `/profile/:userId`        | Other user profiles            |
| `CameraPage.jsx`               | `/camera`                 | Camera capture                 |
| `CameraPostPage.jsx`           | `/camera-post`            | Post creation with media       |
| `PostDetailPage.jsx`           | `/post/:postId`           | Single post detail             |
| `NotificationPage.jsx`         | `/notification`           | Notifications list             |
| `ChatListPage.jsx`             | `/chat`                   | Conversation list              |
| `ChatDetailPage.jsx`           | `/chat/detail`            | Direct message chat            |
| `PublicChatPage.jsx`           | `/chat/public/:postId`    | Post discussion chat           |
| `FeedbackPage.jsx`             | `/feedback`               | Submit feedback                |
| `ReportPage.jsx`               | `/report`                 | Report content                 |
| `SettingPage.jsx`              | `/setting`                | App settings                   |
| `EditProfileSettingPage.jsx`   | `/edit-profile`           | Edit profile                   |
| `DeleteAccountConfirmPage.jsx` | `/delete-account-confirm` | Account deletion               |
| `InterestManagementPage.jsx`   | `/interests`              | Manage interests               |
| `TagPreferencePage.jsx`        | `/tag-preference`         | Tag preferences                |
| `AdminBroadcastPage.jsx`       | `/admin/broadcast`        | Admin broadcast                |

## Frontend Chatbot

| Component     | File                             | Description                                       |
| ------------- | -------------------------------- | ------------------------------------------------- |
| `Chatbot.jsx` | `components/chatbot/Chatbot.jsx` | AI chatbot floating button (Groq/OpenAI with RAG) |

## Frontend Admin Components

| Component                   | Path               | Purpose                                  |
| --------------------------- | ------------------ | ---------------------------------------- |
| `AdminLayout.jsx`           | `/admin`           | Admin wrapper layout                     |
| `AdminDashboard.jsx`        | `/admin`           | Dashboard overview                       |
| `UserManagement.jsx`        | `/admin/users`     | User CRUD                                |
| `ContentModeration.jsx`     | `/admin/content`   | Post/report moderation                   |
| `MapManagement.jsx`         | `/admin/map`       | Location management                      |
| `AdminAnalytics.jsx`        | `/admin/analytics` | Analytics charts                         |
| `InterestManagement.jsx`    | `/admin/interests` | Interest CRUD                            |
| `TagManagement.jsx`         | `/admin/tags`      | Tag/category CRUD                        |
| `BroadcastNotification.jsx` | -                  | Broadcast form                           |
| `BroadcastHistory.jsx`      | -                  | Broadcast history                        |
| `RankingModal.jsx`          | -                  | Featured ranking modal (locations/users) |

## Important Files to Know

### Backend

- `backend/server.js` - Main entry with Socket.IO
- `backend/app.js` - Express app setup
- `src/models/user.model.js` - User schema
- `src/services/auth.service.js` - Auth logic
- `src/services/recommendation.service.js` - Feed algorithm
- `src/middlewares/auth.middleware.js` - JWT validation
- `src/middlewares/requireAdmin.js` - Admin role check
- `src/controllers/chatbot.controller.js` - AI chatbot logic (Groq/OpenAI)
- `src/services/rag.service.js` - RAG (Retrieval-Augmented Generation) for context

### Frontend

- `frontend/src/context/SocketContext.jsx` - Socket provider
- `frontend/src/context/LocationAccessContext.jsx` - Location access context
- `frontend/src/api/client.js` - Axios config with interceptors
- `frontend/src/routes/index.jsx` - Route definitions
- `frontend/src/routes/RequireAuth.jsx` - Auth guard
- `frontend/src/components/map/` - Leaflet map components
- `frontend/src/components/Chat/` - Real-time chat UI
- `frontend/src/components/chatbot/Chatbot.jsx` - AI chatbot UI

## Common Tasks

### Adding a New API Endpoint

1. Create/update model in `src/models/`
2. Create service in `src/services/` with business logic
3. Create controller in `src/controllers/` that calls service
4. Add route in `src/routes/`
5. Add frontend API call in `frontend/src/api/`
6. Create frontend component/page to use it

### Adding Authentication to a Route

- Use `auth.middleware.js` in route: `router.post('/path', auth, controller)`
- Controller receives `req.user` with user ID and data

### Real-time Features

- Emit from backend: `req.app.get('io').to(userId).emit('event', data)`
- Listen on frontend: `socket.on('event', (data) => {})`
- Always join user to their ID room on connection

### Admin Features

- Use `requireAdmin.js` middleware to protect admin routes
- Admin routes in `src/routes/admin*.routes.js`
- Admin controllers in `src/controllers/admin*.controller.js`

### AI/Chatbot Features

- Chatbot uses RAG (Retrieval-Augmented Generation) to query database context
- AI providers: Groq (Llama 3.3) first, fallback to OpenAI (GPT-3.5)
- `src/services/rag.service.js` - Query database for relevant context (places, users, posts, stats)
- `src/controllers/chatbot.controller.js` - Main chatbot logic with fallback responses

## Database Relationships

```
User
  ├── posts[] (Post.userId)
  ├── interests[] (Interest)
  ├── preferredTags[] (Tag)
  ├── followers[] (Follow.followingUserId)
  ├── following[] (Follow.followerUserId)
  └── notifications[] (Notification.recipientId)

Post
  ├── userId -> User
  ├── placeId -> Place
  ├── tags[] -> Tag
  └── analysisId -> PostAnalysis

Conversation
  ├── participants[] -> User
  └── postId -> Post (for public chats)

Message
  ├── conversationId -> Conversation
  ├── senderId -> User
  └── postId -> Post

Notification
  ├── recipientId -> User
  ├── senderId -> User
  └── refId -> Post/User (polymorphic)

Follow (M-to-M through document)
  ├── followerUserId -> User
  └── followingUserId -> User

BlockUser (M-to-M)
  ├── blockerUserId -> User
  └── blockedUserId -> User
```

## Deployment Notes

- Backend needs WebSocket support (Render, Railway, VPS) - not Vercel serverless
- Frontend builds to `dist/` folder
- Set `CORS_ORIGINS` and `SOCKET_ORIGINS` to include production frontend URL
- Use HTTPS in production
- MongoDB Atlas recommended for cloud database
- Cloudinary for image storage in production
