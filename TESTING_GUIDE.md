# 🧪 Login & Signup Testing Guide

## Quick Start Testing

### ✅ **Current Status**
- ✅ Backend server running on port 5000
- ✅ Frontend React app running (typically on port 3000)
- ✅ MongoDB service running
- ✅ All API endpoints working correctly

## 🚀 **Step-by-Step Testing Process**

### **Step 1: Test Signup Flow (Create Your First Account)**

1. **Open your React app** in browser: `http://localhost:3000`

2. **Navigate to Signup**:
   - Click **"Sign up here"** link on the login page

3. **Email Verification**:
   - Enter your email address (use a real email if you want to receive actual OTP)
   - Click **"Send Verification Code"**
   - ✅ **Expected**: Success message appears

4. **Get OTP Code**:
   - **Option A**: Check your email for the OTP
   - **Option B**: Check backend console logs (in development mode, OTP is often logged)

5. **Complete Signup**:
   - Enter the 6-digit OTP code
   - Fill in your first name and last name
   - Create a strong password (must include: uppercase, lowercase, number, special character, 8+ chars)
   - Confirm password
   - Click **"Create Account"**
   - ✅ **Expected**: Success message and redirect to login page

### **Step 2: Test Login Flow**

1. **Login with New Account**:
   - Enter the same email you just signed up with
   - Enter the same password you just created
   - Optionally check "Remember me"
   - Click **"Sign In"**
   - ✅ **Expected**: Successful login and redirect to dashboard

### **Step 3: Test Error Scenarios**

1. **Wrong Password**:
   - Try logging in with wrong password
   - ✅ **Expected**: "Invalid email or password" error

2. **Non-existent User**:
   - Try logging in with email that doesn't exist
   - ✅ **Expected**: "Invalid email or password. If you don't have an account, please sign up first."

3. **Account Lockout** (after 5 failed attempts):
   - Try wrong password 5 times
   - ✅ **Expected**: Account temporarily locked message

## 🔍 **Troubleshooting Common Issues**

### **Issue: "Cannot type in input fields"**
**Solution**: This was fixed - floating background shapes were blocking interactions.

### **Issue: "Login always fails"**
**Most Likely Cause**: No users exist in database yet.
**Solution**: Complete signup process first to create a user account.

### **Issue: "OTP not received"**
**Solutions**:
1. Check backend console logs (in development, OTP is often displayed)
2. Check spam/junk folder
3. Ensure email configuration in `.env` is correct

### **Issue: "Network errors"**
**Solutions**:
1. Ensure backend is running: `netstat -an | findstr "5000"`
2. Check if frontend .env has correct API URL: `REACT_APP_API_URL=http://localhost:5000/api`
3. Check browser console for CORS errors

## 🌟 **Advanced Testing**

### **Test Database Persistence**
1. Create an account
2. Stop and restart backend server
3. Try logging in again
4. ✅ **Expected**: Login still works (data persists)

### **Test Session Management**
1. Login successfully
2. Close browser tab
3. Return to the app
4. ✅ **Expected**: Should remember login state (if "Remember me" was checked)

### **Test Password Strength Validation**
1. Try weak passwords during signup:
   - No uppercase: `password123!`
   - No numbers: `Password!`
   - Too short: `Pass1!`
2. ✅ **Expected**: Real-time feedback showing what's missing

## 📱 **Mobile Testing**
1. Open browser developer tools
2. Switch to mobile view
3. Test all signup/login flows
4. ✅ **Expected**: Responsive design works on mobile

## 🐛 **If Something Goes Wrong**

### **Check Backend Status**
```powershell
# Check if backend is running
netstat -an | findstr "5000"

# Check if MongoDB is running  
Get-Service -Name MongoDB
```

### **Check API Endpoints Directly**
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET

# Test signup endpoint
$body = @{email = "test@example.com"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5000/api/signup/request-otp" -Method POST -Body $body -ContentType "application/json"
```

### **Check Browser Console**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for error messages during login/signup attempts
4. Network tab shows API request/response details

## ✨ **Expected User Journey**

```
1. User visits app → Sees login page
2. User clicks "Sign up here" → Goes to signup
3. User enters email → Receives OTP
4. User completes signup → Account created
5. User redirected to login → Enters credentials  
6. User successfully logs in → Redirected to dashboard
```

## 🎯 **Success Criteria**

Your system is working correctly when:
- ✅ New users can successfully sign up
- ✅ Registered users can successfully log in  
- ✅ Wrong credentials show appropriate error messages
- ✅ Password strength validation works during signup
- ✅ Email verification process completes
- ✅ Users are redirected to dashboard after login

---

**🎉 Happy Testing!** Your authentication system is robust and production-ready.