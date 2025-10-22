# JointRight - Login & Signup System Setup Guide

This guide explains how to set up and run the updated login and signup system with enhanced security, modern UI, and proper authentication management.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Git

### 1. Environment Setup

#### Backend Environment (.env)
Create or update `backend/.env` with your configuration:

```env
# Email Configuration (for OTP)
EMAIL=your_email@gmail.com
PASSWORD=your_app_password

# Database Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/jointright

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
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
```

#### Frontend Environment
Create `frontend/.env` if needed:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 2. Installation & Startup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start the application
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start
```

Or use the convenience script:
```bash
# Windows
start-dev.bat

# Unix/Linux/Mac
./deploy.sh
```

## 🔐 Authentication Features

### Enhanced Security Features
- **Password Strength Validation**: Requires uppercase, lowercase, numbers, and special characters
- **Account Lockout Protection**: Temporary account locking after 5 failed login attempts
- **Rate Limiting**: API endpoints protected against brute force attacks
- **Email Verification**: All new accounts must verify email before login
- **JWT Token Management**: Secure token-based authentication with configurable expiration
- **Remember Me**: Optional extended session duration

### Login Flow
1. **Direct Login**: Email + Password (primary method)
2. **OTP Login**: Email + OTP verification (fallback method)
3. **Account Recovery**: "Forgot Password" functionality

### Signup Flow
1. **Email Verification**: Enter email → Receive OTP
2. **Account Creation**: Verify OTP + Set strong password + Optional profile info
3. **Welcome Email**: Confirmation and next steps

## 🎨 UI/UX Improvements

### Modern Design Features
- **Glassmorphism Effects**: Modern translucent design with backdrop blur
- **Animated Elements**: Smooth transitions and loading animations  
- **Progress Indicators**: Multi-step signup with visual progress tracking
- **Password Strength Meter**: Real-time password validation feedback
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Accessibility**: Proper ARIA labels and keyboard navigation support

### Interactive Elements
- **Smart Form Validation**: Client-side validation with helpful error messages
- **OTP Timer**: Visual countdown for OTP expiration
- **Loading States**: Clear feedback during API operations
- **Success Animations**: Celebration animations for completed actions

## 🔧 API Endpoints

### Authentication Endpoints

#### Signup
```http
POST /api/signup/request-otp
POST /api/signup/resend-otp
POST /api/signup/verify
```

#### Login
```http
POST /api/login/direct
POST /api/login/request-otp
POST /api/login/verify
POST /api/login/logout
```

#### System
```http
GET /api/health
```

### Example API Usage

#### Signup Process
```javascript
// Step 1: Request OTP
const otpResponse = await fetch('/api/signup/request-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// Step 2: Verify and create account
const signupResponse = await fetch('/api/signup/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otp: '123456',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe'
  })
});
```

#### Login Process
```javascript
// Direct login
const loginResponse = await fetch('/api/login/direct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    rememberMe: true
  })
});

// Use received token for authenticated requests
const token = loginResponse.data.token;
const protectedResponse = await fetch('/api/meetings', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🧪 Testing

### API Integration Tests
Run the comprehensive API test suite:

```bash
# Make sure the backend server is running first
cd backend && npm run dev

# In another terminal, run tests
node ../test-api.js
```

This will test:
- Health check endpoint
- Complete signup flow
- Login authentication
- Token-based logout

### Manual Testing Checklist

#### Signup Flow
- [ ] Email validation (invalid formats rejected)
- [ ] OTP delivery (check development logs for OTP in dev mode)
- [ ] Password strength requirements enforced
- [ ] Password confirmation matching
- [ ] Success flow with account creation
- [ ] Welcome email sent

#### Login Flow
- [ ] Valid credentials accepted
- [ ] Invalid credentials rejected with helpful messages
- [ ] Account lockout after 5 failed attempts
- [ ] Remember me functionality
- [ ] JWT token generation and storage
- [ ] Successful redirect to dashboard

#### Security Features
- [ ] Rate limiting on sensitive endpoints
- [ ] Email verification required before login
- [ ] Secure password hashing (bcrypt with salt)
- [ ] JWT token expiration handling
- [ ] Protected route access control

## 🔒 Security Considerations

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter  
- At least 1 number
- At least 1 special character

### Account Protection
- Max 5 login attempts before 30-minute lockout
- Email verification required for new accounts
- Secure JWT tokens with configurable expiration
- Rate limiting on all authentication endpoints

### Data Protection
- Passwords hashed with bcrypt (12 salt rounds)
- Sensitive data logged securely
- CORS protection configured
- Helmet.js security headers
- Input validation and sanitization

## 🚨 Troubleshooting

### Common Issues

#### "MongoDB connection failed"
**Solution**: Ensure MongoDB is running and accessible at the configured URI.
```bash
# Start MongoDB (Windows)
net start MongoDB

# Start MongoDB (Mac/Linux)
sudo systemctl start mongod
```

#### "Email sending failed"
**Solution**: Configure email settings in `.env` with valid SMTP credentials.
```env
EMAIL=your_email@gmail.com
PASSWORD=your_app_specific_password  # Not your regular password!
```

#### "CORS errors in frontend"
**Solution**: Ensure backend CORS is configured for your frontend URL in `.env`:
```env
FRONTEND_URL=http://localhost:3000
```

#### "Token expired" errors
**Solution**: Implement token refresh logic or increase token expiration:
```env
JWT_EXPIRE=24h  # or 7d for longer sessions
```

### Development Mode Features

#### Development OTP
When `NODE_ENV=development`, failed email sending will return the OTP in the API response for testing purposes.

#### Debug Logging
Check `backend/logs/` for detailed application logs:
- `combined.log`: All log messages
- `error.log`: Error messages only

#### Health Check
Monitor system health at: `http://localhost:5000/api/health`
- Database connection status
- Memory usage
- Uptime information

## 📱 Frontend Architecture

### React Context
The application uses React Context for global authentication state management:

```javascript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Use authentication state and methods
}
```

### Protected Routes
Routes are automatically protected based on authentication status:

```javascript
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

### API Service
Centralized API communication with automatic token management:

```javascript
import { authAPI, signupAPI } from './services/api';

// All API calls automatically include auth tokens
const result = await authAPI.login(credentials);
```

## 🔄 Deployment

### Production Checklist
- [ ] Update `.env.production` with production values
- [ ] Set secure JWT_SECRET (generate with `openssl rand -base64 64`)
- [ ] Configure production MongoDB URI
- [ ] Set up email service with production SMTP
- [ ] Update CORS origins for production domain
- [ ] Enable HTTPS in production
- [ ] Set up monitoring and logging
- [ ] Run production build tests

### Environment Variables
Ensure all production environment variables are properly configured before deployment.

## 🤝 Contributing

When contributing to this authentication system:

1. Test all authentication flows thoroughly
2. Follow existing code patterns and styling
3. Update tests when adding new features
4. Ensure security best practices are maintained
5. Document any new configuration options

## 📞 Support

If you encounter issues with the authentication system:

1. Check the troubleshooting section above
2. Review application logs in `backend/logs/`
3. Run the API test suite to identify specific issues
4. Verify environment configuration matches requirements

---

**🎉 Your enhanced login and signup system is now ready to use!**