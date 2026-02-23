# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LACA is a location-based social network platform (full-stack) that allows users to share posts, check-in at places, interact with others, and discover content around their location. The project uses Node.js/Express backend with MongoDB and a React frontend with Vite.

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
- **Controllers** (`src/controllers/`): Handle request logic, organized by feature (auth, posts, chat, admin, etc.)
- **Services** (`src/services/`): Business logic layer, separated from controllers
- **Models** (`src/models/`): Mongoose schemas for MongoDB collections
- **Routes** (`src/routes/`): API endpoint definitions
- **Middlewares** (`src/middlewares/`): Auth, error handling, file upload, validation
- **Config** (`src/config/`): Database and Cloudinary setup
- **Utils** (`src/utils/`): JWT, email, error handling, async wrappers

### Frontend Structure (React/Vite)
- **Entry**: `frontend/src/main.jsx` → `App.jsx`
- **Pages** (`src/pages/`): Full page components
- **Components** (`src/components/`): Reusable UI components organized by feature (auth, map, chat, admin, etc.)
- **API** (`src/api/`): Axios client functions for backend communication
- **Context** (`src/context/`): React Context providers for global state
- **Routes** (`src/routes/`): Route configuration
- **Services** (`src/services/`): Frontend utilities (Socket.IO, storage, etc.)
- **Utils** (`src/utils/`): Helper functions

### Key Technologies
- **Backend**: Express.js, MongoDB/Mongoose, Socket.IO (real-time chat), JWT auth, Cloudinary (image storage)
- **Frontend**: React 18, Vite, React Router, Leaflet (maps), Socket.IO client, Axios
- **Real-time**: Socket.IO for chat and online status
- **Authentication**: JWT tokens with refresh token rotation

## Environment Setup

### Backend (.env in root)
```env
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/laca
JWT_SECRET=your_secret
JWT_EXPIRE_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRE_IN=30d
SALT_ROUNDS=10
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
OTP_EXPIRED_IN=300000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
SOCKET_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (.env in frontend/)
```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

## Key Architectural Patterns

### Request Flow
1. Frontend makes API call via Axios (`src/api/`)
2. Backend route receives request (`src/routes/`)
3. Middleware validates auth/input (`src/middlewares/`)
4. Controller handles request logic (`src/controllers/`)
5. Service layer executes business logic (`src/services/`)
6. Model interacts with MongoDB (`src/models/`)
7. Response sent back to frontend

### Real-time Communication (Socket.IO)
- Backend: `server.js` initializes Socket.IO server with CORS
- Frontend: `src/services/socketService.js` manages Socket.IO client
- Events: Chat messages, online status, notifications
- User rooms: Users join room with their ID for targeted messages

### Authentication
- JWT stored in cookies (httpOnly for security)
- Refresh token rotation on login
- `auth.middleware.js` validates tokens on protected routes
- `optionalAuth.middleware.js` for routes that work with or without auth

### File Upload
- Multer handles file uploads (`src/middlewares/upload.middleware.js`)
- Cloudinary stores images (`src/config/cloudinary.js`)
- Upload route: `POST /api/upload`

## Important Files to Know

### Backend
- `src/models/user.model.js` - User schema with auth fields
- `src/models/post.model.js` - Post schema with location/media
- `src/models/message.model.js` & `conversation.model.js` - Chat data
- `src/services/auth.service.js` - Auth logic (register, login, OTP)
- `src/services/email.service.js` - Email/OTP sending
- `src/middlewares/auth.middleware.js` - JWT validation
- `src/middlewares/requireAdmin.js` - Admin role check

### Frontend
- `src/context/AuthContext.jsx` - Global auth state
- `src/api/axiosInstance.js` - Axios config with interceptors
- `src/services/socketService.js` - Socket.IO setup
- `src/components/map/` - Leaflet map components
- `src/components/Chat/` - Real-time chat UI

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

## Database Models

Key collections:
- **User**: Authentication, profile, follow relationships
- **Post**: Content with location, media, expiration
- **Place**: Locations with GeoJSON coordinates
- **Message/Conversation**: Chat data
- **Notification**: User notifications with types
- **Report**: Content/user reports with status tracking
- **Reaction**: Post reactions (like, love, etc.)
- **Checkin**: User check-ins at places

## Deployment Notes

- Backend needs WebSocket support (Render, Railway, VPS) - not Vercel serverless
- Frontend builds to `dist/` folder
- Set `CORS_ORIGINS` and `SOCKET_ORIGINS` to include production frontend URL
- Use HTTPS in production
- MongoDB Atlas recommended for cloud database
- Cloudinary for image storage in production
