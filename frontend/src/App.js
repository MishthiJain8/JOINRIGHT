import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import SessionWarningModal from './components/SessionWarningModal';
import LoginPage from "./signin/login";
import SignupPage from "./signin/signin";
import Dashboard from "./pages/dashboard";
import EnhancedLiveMeeting from "./components/LiveMeetingEnhanced";
import AdminDashboard from "./components/admin/AdminDashboard";
import About from "./pages/About";
import Contact from "./pages/Contact";
import JoinMeeting from "./pages/JoinMeeting";
import Profile from "./pages/Profile";
import MeetingAuthWrapper from "./components/MeetingAuthWrapper";

// Component to handle root route redirection
const RootRedirect = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  console.log('🔄 RootRedirect - Auth state:', { isAuthenticated, isLoading, user });
  
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <UIProvider>
        <div className="App">
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
          
          {/* Session Warning Modal */}
          <SessionWarningModal />
          
          <Routes>
            {/* Root route - redirect based on auth status */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Meeting routes - publicly accessible but login required to join */}
            <Route path="/join" element={<JoinMeeting />} />
            <Route path="/join/:meetingId" element={<JoinMeeting />} />
            
            {/* Dashboard - publicly accessible but login required for functionality */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Profile - requires authentication */}
            <Route path="/profile" element={<Profile />} />
            
            {/* Protected routes */}
            
            <Route 
              path="/live/:roomId" 
              element={
                <ProtectedRoute>
                  <EnhancedLiveMeeting />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
          </UIProvider>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
