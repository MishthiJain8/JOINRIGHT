# JointRight - Video Conferencing Application

A full-featured video conferencing application built with React.js and Node.js, offering Zoom-like functionality including video/audio calls, screen sharing, chat, file sharing, breakout rooms, waiting rooms, and recording capabilities.

## 🚀 Features

### Core Video Conferencing
- **High-Quality Video/Audio Calls**: WebRTC-based peer-to-peer communication
- **Screen Sharing**: Share your screen with other participants
- **Recording**: Record meetings locally and on server
- **Chat System**: Real-time messaging with file sharing support
- **Participant Management**: View and manage meeting participants

### Advanced Features
- **Breakout Rooms**: Create separate discussion rooms for smaller groups
- **Waiting Room**: Control meeting access with host approval
- **File Sharing**: Share documents and files during meetings
- **Typing Indicators**: See when someone is typing in chat
- **Connection Quality Monitoring**: Real-time connection status
- **Meeting Controls**: Mute/unmute audio, turn video on/off, leave meeting

### Security & Performance
- **Rate Limiting**: Protection against spam and abuse
- **Security Headers**: Helmet.js for enhanced security
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Robust error handling and logging
- **Health Monitoring**: Application health check endpoints

## 🛠 Technology Stack

### Frontend
- **React.js** - User interface framework
- **Socket.IO Client** - Real-time communication
- **Simple Peer** - WebRTC wrapper for video/audio
- **React Router** - Client-side routing
- **React Icons** - Icon components
- **Axios** - HTTP client

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - Database for user data and meetings
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Winston** - Logging framework
- **Multer** - File upload handling

### DevOps & Deployment
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **PM2** - Process management
- **Nginx** - Web server and reverse proxy
- **Redis** - Session management (optional)

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v5.0 or higher)
- **Docker & Docker Compose** (for containerized deployment)
- **Modern web browser** with WebRTC support

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jointright
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   cd ..
   ```

3. **Configure environment variables**
   ```bash
   # Copy and configure backend environment
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start development servers**
   
   **Windows:**
   ```bash
   start-dev.bat
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x start-dev.sh
   ./start-dev.sh
   ```

   **Manual Start:**
   ```bash
   # Terminal 1 - Start MongoDB
   mongod
   
   # Terminal 2 - Start Backend
   cd backend
   npm run dev
   
   # Terminal 3 - Start Frontend
   cd frontend
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: mongodb://localhost:27017

### Production Deployment with Docker

1. **Configure production environment**
   ```bash
   cp backend/.env.example backend/.env.production
   # Edit production environment variables
   ```

2. **Deploy with Docker Compose**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   Or manually:
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**
   - Frontend: http://localhost (port 80)
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017

## 📁 Project Structure

```
jointright/
├── backend/                 # Node.js backend server
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   │   ├── breakoutController.js
│   │   └── waitingRoomController.js
│   ├── middleware/         # Express middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   │   ├── breakoutRoutes.js
│   │   ├── waitingRoomRoutes.js
│   │   └── ...
│   ├── utils/             # Utility functions
│   │   └── logger.js      # Winston logger
│   ├── logs/              # Application logs
│   ├── uploads/           # File uploads
│   ├── recordings/        # Meeting recordings
│   ├── .env               # Environment variables
│   ├── .env.production    # Production environment
│   ├── package.json       # Backend dependencies
│   ├── server.js          # Main server file
│   ├── ecosystem.config.js # PM2 configuration
│   └── Dockerfile         # Backend Docker config
├── frontend/              # React.js frontend
│   ├── public/           # Public assets
│   ├── src/              # Source code
│   │   ├── components/   # React components
│   │   │   ├── EnhancedLiveMeeting.js
│   │   │   └── ...
│   │   ├── pages/        # Page components
│   │   ├── signin/       # Authentication components
│   │   ├── App.js        # Main App component
│   │   └── ...
│   ├── package.json      # Frontend dependencies
│   ├── Dockerfile        # Frontend Docker config
│   └── nginx.conf        # Nginx configuration
├── docker-compose.yml    # Docker Compose configuration
├── deploy.sh            # Deployment script
├── start-dev.bat        # Windows development start
└── README.md           # This file
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env` for development or `backend/.env.production` for production:

```env
# Email Configuration
EMAIL=your_email@domain.com
PASSWORD=your_email_password

# Database Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/authdemo

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key
JWT_EXPIRE=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_ALT=http://localhost:3001

# File Upload Configuration
MAX_FILE_SIZE=50mb
UPLOAD_PATH=./uploads
RECORDING_PATH=./recordings

# WebRTC Configuration
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=turn:your-turn-server.com:3478
TURN_USERNAME=your_turn_username
TURN_PASSWORD=your_turn_password
```

### Frontend Configuration

Update API endpoints in frontend components if needed:
- Default backend URL: `http://localhost:5000`
- Socket.IO connection: `http://localhost:5000`

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change default JWT secret
- [ ] Update MongoDB credentials
- [ ] Configure proper CORS origins
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Set up proper logging and monitoring
- [ ] Update email service credentials
- [ ] Configure TURN server for better connectivity

### Security Features Implemented

- **Helmet.js**: Security headers
- **Rate Limiting**: Protection against spam
- **Input Validation**: Data sanitization
- **JWT Authentication**: Secure user sessions
- **CORS Configuration**: Cross-origin restrictions
- **File Upload Security**: File type and size restrictions

## 📊 API Endpoints

### Authentication
- `POST /api/signup` - User registration
- `POST /api/login` - User login

### Meetings
- `GET /api/meetings` - Get user meetings
- `POST /api/meetings` - Create new meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id` - Download file

### Breakout Rooms
- `POST /api/breakout/create` - Create breakout rooms
- `GET /api/breakout/:mainRoomId` - Get breakout rooms
- `POST /api/breakout/join` - Join breakout room
- `POST /api/breakout/close` - Close breakout rooms

### Waiting Room
- `POST /api/waiting-room/join` - Join waiting room
- `POST /api/waiting-room/admit` - Admit participant
- `GET /api/waiting-room/:roomId` - Get waiting room status
- `POST /api/waiting-room/toggle` - Toggle waiting room

### Health Check
- `GET /api/health` - Application health status

## 🎯 Usage Guide

### Starting a Meeting

1. **Register/Login**: Create an account or log in
2. **Dashboard**: Access the main dashboard
3. **Create Meeting**: Click "New Meeting" or join existing meeting
4. **Share Meeting ID**: Share the meeting ID with participants
5. **Meeting Controls**: Use the control bar for audio/video/screen sharing

### Meeting Features

#### Basic Controls
- **Mute/Unmute**: Click microphone icon
- **Video On/Off**: Click camera icon
- **Screen Share**: Click desktop icon
- **End Call**: Click phone icon

#### Advanced Features
- **Chat**: Click chat icon to open/close chat sidebar
- **File Share**: Use paperclip icon in chat to share files
- **Participants**: Click users icon to see participant list
- **Settings**: Click gear icon for meeting settings
- **Record**: Click record icon to start/stop recording

#### Host Features
- **Waiting Room**: Enable/disable waiting room
- **Admit Participants**: Admit users from waiting room
- **Breakout Rooms**: Create separate discussion rooms
- **Meeting Management**: Full control over meeting settings

## 🔧 Troubleshooting

### Common Issues

1. **Camera/Microphone not working**
   - Check browser permissions
   - Ensure HTTPS in production
   - Verify device availability

2. **Connection issues**
   - Check firewall settings
   - Configure TURN server for better connectivity
   - Verify WebRTC support in browser

3. **Audio/Video quality issues**
   - Check network bandwidth
   - Reduce video quality in settings
   - Use wired internet connection

4. **Recording not working**
   - Check browser support for MediaRecorder
   - Ensure sufficient disk space
   - Verify file permissions

### Logs and Debugging

- **Backend logs**: Check `backend/logs/` directory
- **Browser console**: F12 → Console for frontend errors
- **Docker logs**: `docker-compose logs [service_name]`
- **PM2 logs**: `pm2 logs jointright-backend`

## 🚀 Performance Optimization

### Backend Performance
- **Clustering**: Use PM2 cluster mode
- **Database Indexing**: Add proper MongoDB indexes
- **Caching**: Implement Redis for session management
- **Load Balancing**: Use Nginx for load balancing

### Frontend Performance
- **Code Splitting**: Implement lazy loading
- **Asset Optimization**: Compress images and files
- **CDN**: Use CDN for static assets
- **Monitoring**: Implement performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For support and questions:
- Open an issue on GitHub
- Check the troubleshooting section
- Review the logs for error messages

## 🔄 Changelog

### Version 1.0.0
- Initial release with core video conferencing features
- WebRTC implementation
- Real-time chat and file sharing
- Basic meeting controls

### Version 1.1.0 (Current)
- Added breakout rooms functionality
- Implemented waiting room feature
- Enhanced security with rate limiting
- Added comprehensive logging
- Docker containerization
- Production deployment scripts
- Health check endpoints
- Performance optimizations# JOINRIGHT
