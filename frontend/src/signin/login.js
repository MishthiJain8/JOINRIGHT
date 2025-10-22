import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginContext, setLoginContext] = useState(null);

  // Force light theme on login page (run only once)
  useEffect(() => {
    // Add a class to body to override global theme
    document.body.classList.add('login-page-override');
    document.documentElement.classList.add('login-page-override');
    
    // Store original theme and force light theme
    const originalTheme = localStorage.getItem('theme');
    const originalDarkMode = localStorage.getItem('darkMode');
    
    // Set light theme without triggering re-renders
    localStorage.setItem('theme', 'light');
    localStorage.setItem('darkMode', 'false');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
    
    // Cleanup: restore original theme and remove classes when leaving
    return () => {
      document.body.classList.remove('login-page-override');
      document.documentElement.classList.remove('login-page-override');
      
      // Restore original theme settings
      if (originalTheme) {
        localStorage.setItem('theme', originalTheme);
      }
      if (originalDarkMode) {
        localStorage.setItem('darkMode', originalDarkMode);
      }
      
      // Reapply theme based on stored preference
      if (originalTheme === 'dark' || originalDarkMode === 'true') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
      }
    };
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    // Check if this is a context-specific login (meeting or contact)
    const urlParams = new URLSearchParams(location.search);
    const returnUrl = urlParams.get('returnUrl');
    const type = urlParams.get('type');
    
    if (type === 'meeting') {
      // Get pending meeting data from sessionStorage
      const pendingMeeting = sessionStorage.getItem('pendingMeeting');
      if (pendingMeeting) {
        const meetingData = JSON.parse(pendingMeeting);
        setLoginContext({
          type: 'meeting',
          returnUrl: returnUrl ? decodeURIComponent(returnUrl) : null,
          meetingData: meetingData
        });
        console.log('🎬 Meeting login context detected:', meetingData);
      }
    } else if (type === 'contact') {
      // Get pending contact form data from sessionStorage
      const pendingContactForm = sessionStorage.getItem('pendingContactForm');
      setLoginContext({
        type: 'contact',
        returnUrl: returnUrl ? decodeURIComponent(returnUrl) : null,
        contactFormData: pendingContactForm ? JSON.parse(pendingContactForm) : null
      });
      console.log('📧 Contact login context detected');
    }
  }, [location.search]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    clearError();
    
    console.log('🔐 Login attempt started');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    console.log('Remember me:', rememberMe);
    
    try {
      const credentials = {
        email,
        password,
        rememberMe
      };
      
      console.log('Calling login with credentials:', { ...credentials, password: '[REDACTED]' });
      const loginResult = await login(credentials);
      
      // Post-login navigation
      console.log('✅ Login successful, user role:', loginResult?.user?.role);

      // Handle context-specific redirects
      if (loginContext?.type === 'meeting') {
        const target = loginContext.returnUrl || '/join';
        console.log('🔁 Redirecting back to meeting flow:', target);
        navigate(target, { replace: true });
        return;
      }
      
      if (loginContext?.type === 'contact') {
        const target = loginContext.returnUrl || '/contact';
        console.log('🔁 Redirecting back to contact form:', target);
        navigate(target, { replace: true });
        return;
      }

      // Default: redirect to dashboard
      console.log('Redirecting to dashboard');
      navigate("/dashboard");
    } catch (error) {
      console.error("❌ Login error:", error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details
      });
      
      // Handle specific error cases
      switch (error.code) {
        case 'EMAIL_NOT_VERIFIED':
          setError('Please verify your email address before logging in.');
          break;
        case 'ACCOUNT_LOCKED':
        case 'ACCOUNT_LOCKED_ATTEMPTS':
          setError(error.message);
          break;
        case 'INVALID_CREDENTIALS':
          const remainingText = error.remainingAttempts 
            ? ` (${error.remainingAttempts} attempts remaining)` 
            : '';
          setError(`Invalid email or password${remainingText}`);
          break;
        case 'LOGIN_FAILED':
        default:
          // Check if this might be a "user doesn't exist" scenario
          if (error.message && error.message.includes('Invalid email or password')) {
            setError('Invalid email or password. If you don\'t have an account, please sign up first.');
          } else {
            setError(error.message || "Login failed. Please try again.");
          }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes fadeInUp {
            0% {
              opacity: 0;
              transform: translateY(30px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          
          @keyframes gradient {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          
          .login-container {
            animation: gradient 15s ease infinite;
            background-size: 400% 400%;
          }
          
          .login-card {
            animation: fadeInUp 0.6s ease-out;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          
          .input-focus {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .input-focus:focus {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
            transform: translateY(-1px);
          }
          
          .input-focus:hover {
            border-color: #6b7280;
          }
          
          .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
          }
          
          .forgot-password {
            transition: all 0.2s ease;
          }
          
          .forgot-password:hover {
            text-decoration: underline;
            color: #1d4ed8 !important;
          }
          
          .signup-link {
            transition: all 0.2s ease;
          }
          
          .signup-link:hover {
            text-decoration: underline;
            color: #1d4ed8 !important;
          }
          
          .button-hover {
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .button-hover::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
          }
          
          .button-hover:hover:not(:disabled) {
            background: #1d4ed8 !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(29, 78, 216, 0.4);
          }
          
          .button-hover:hover::before {
            left: 100%;
          }
          
          .logo-bounce:hover {
            animation: pulse 0.6s ease-in-out;
          }
          
          .feature-card {
            transition: all 0.3s ease;
          }
          
          .feature-card:hover {
            transform: translateY(-2px);
            color: #3b82f6 !important;
          }
          
          .floating-shapes {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
          }
          
          .shape {
            position: absolute;
            opacity: 0.1;
            animation: float 6s ease-in-out infinite;
          }
          
          .shape:nth-child(1) {
            top: 20%;
            left: 10%;
            animation-delay: 0s;
          }
          
          .shape:nth-child(2) {
            top: 60%;
            left: 80%;
            animation-delay: 2s;
          }
          
          .shape:nth-child(3) {
            top: 80%;
            left: 20%;
            animation-delay: 4s;
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(180deg);
            }
          }
          
          .glass-effect {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
        `}
      </style>
      
    <div className="login-container" style={styles.container}>
      <div className="floating-shapes">
        <div className="shape" style={{width: '60px', height: '60px', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', borderRadius: '50%'}}></div>
        <div className="shape" style={{width: '40px', height: '40px', background: 'linear-gradient(45deg, #06b6d4, #3b5cf6)', borderRadius: '50%'}}></div>
        <div className="shape" style={{width: '80px', height: '80px', background: 'linear-gradient(45deg, #8b5cf6, #ec4899)', borderRadius: '50%'}}></div>
      </div>
      
      <div className="login-card glass-effect" style={styles.card}>
        <div style={styles.header}>
          <div className="logo-bounce" style={styles.logoContainer}>
            <div style={styles.logoIcon}>🤝</div>
            <h1 style={styles.title}>JointRight</h1>
          </div>
          {loginContext?.type === 'meeting' ? (
            <>
              <p style={styles.subtitle}>Please sign in to join the meeting.</p>
              <div style={styles.meetingBadge}>
                <span style={styles.meetingBadgeText}>🎥 Meeting Access Required</span>
              </div>
              {loginContext.meetingData?.title && (
                <div style={styles.meetingInfo}>
                  <p style={styles.meetingTitle}>📅 {loginContext.meetingData.title}</p>
                  {loginContext.meetingData.host && (
                    <p style={styles.meetingHost}>👤 Hosted by {loginContext.meetingData.host}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <p style={styles.subtitle}>Welcome back! Please sign in to continue your journey.</p>
              <div style={styles.welcomeBadge}>
                <span style={styles.badgeText}>✨ Secure Login</span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>⚠️</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={styles.inputContainer}>
            <label style={styles.label}>Email Address</label>
            <input
              className="input-focus"
              style={{
                ...styles.input,
                borderColor: error ? "#ef4444" : "#d1d5db"
              }}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          
          <div style={styles.inputContainer}>
            <label style={styles.label}>Password</label>
            <input
              className="input-focus"
              style={{
                ...styles.input,
                borderColor: error ? "#ef4444" : "#d1d5db"
              }}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          
          <div style={styles.optionsContainer}>
            <label style={styles.checkboxContainer}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span style={styles.checkboxLabel}>Remember me</span>
            </label>
            
            <span 
              className="forgot-password"
              style={styles.forgotPassword}
              onClick={() => navigate("/forgot-password")}
            >
              Forgot your password?
            </span>
          </div>
          
          <button 
            className="button-hover"
            style={{
              ...styles.button,
              backgroundColor: isLoading ? "#9ca3af" : "#2563eb",
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <div style={styles.buttonContent}>
                <span>🔐</span>
                <span>Sign In</span>
              </div>
            )}
          </button>
        </form>

        <div className="divider" style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        <div style={styles.signupContainer}>
          <span style={styles.signupText}>Don't have an account? </span>
          <span
            className="signup-link"
            style={styles.signupLink}
            onClick={() => navigate("/signup")}
          >
            Sign up here
          </span>
        </div>

        <div style={styles.features}>
          <div className="feature-card" style={styles.feature}>
            <div style={styles.featureIcon}>🎯</div>
            <span style={styles.featureText}>Seamless Meetings</span>
            <div style={styles.featureBadge}>Pro</div>
          </div>
          <div className="feature-card" style={styles.feature}>
            <div style={styles.featureIcon}>🔒</div>
            <span style={styles.featureText}>Secure & Private</span>
            <div style={styles.featureBadge}>Safe</div>
          </div>
          <div className="feature-card" style={styles.feature}>
            <div style={styles.featureIcon}>⚡</div>
            <span style={styles.featureText}>Lightning Fast</span>
            <div style={styles.featureBadge}>Fast</div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)",
    padding: "20px",
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    position: "relative",
  },
  card: {
    padding: "50px",
    borderRadius: "24px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)",
    width: "100%",
    maxWidth: "480px",
    textAlign: "center",
    position: "relative",
    zIndex: 10,
  },
  header: {
    marginBottom: "40px",
  },
  logoContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "20px",
  },
  logoIcon: {
    fontSize: "3.5rem",
    marginBottom: "10px",
    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
  },
  title: {
    color: "#1e293b",
    fontSize: "2.2rem",
    fontWeight: "700",
    margin: 0,
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "1rem",
    margin: "15px 0",
    lineHeight: "1.5",
    fontWeight: "400",
  },
  welcomeBadge: {
    display: "inline-block",
    marginTop: "15px",
  },
  badgeText: {
    background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
    color: "#0369a1",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "500",
    border: "1px solid #bae6fd",
  },
  meetingBadge: {
    display: "inline-block",
    marginTop: "15px",
  },
  meetingBadgeText: {
    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
    color: "#92400e",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "500",
    border: "1px solid #fcd34d",
  },
  meetingInfo: {
    marginTop: "20px",
    padding: "15px",
    background: "rgba(59, 130, 246, 0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(59, 130, 246, 0.1)",
  },
  meetingTitle: {
    color: "#1e40af",
    fontSize: "0.95rem",
    fontWeight: "600",
    margin: "0 0 8px 0",
  },
  meetingHost: {
    color: "#64748b",
    fontSize: "0.85rem",
    fontWeight: "400",
    margin: 0,
  },
  errorContainer: {
    background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
    border: "1px solid #fca5a5",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 4px 6px rgba(239, 68, 68, 0.1)",
  },
  errorIcon: {
    fontSize: "1.3rem",
    filter: "drop-shadow(0 2px 4px rgba(239, 68, 68, 0.3))",
  },
  errorText: {
    color: "#dc2626",
    fontSize: "0.95rem",
    fontWeight: "500",
    lineHeight: "1.4",
  },
  inputContainer: {
    marginBottom: "24px",
    textAlign: "left",
  },
  label: {
    display: "block",
    color: "#374151",
    fontSize: "0.95rem",
    fontWeight: "600",
    marginBottom: "8px",
    letterSpacing: "0.025em",
  },
  input: {
    width: "100%",
    padding: "16px 20px",
    borderRadius: "14px",
    border: "2px solid #e2e8f0",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
    background: "rgba(255, 255, 255, 0.8)",
    fontWeight: "400",
  },
  optionsContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  checkboxContainer: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  checkbox: {
    marginRight: "8px",
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  checkboxLabel: {
    color: "#374151",
    fontSize: "0.95rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  forgotPassword: {
    color: "#3b82f6",
    fontSize: "0.95rem",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: "500",
  },
  button: {
    width: "100%",
    padding: "16px 24px",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff",
    fontWeight: "600",
    border: "none",
    borderRadius: "14px",
    fontSize: "1.05rem",
    cursor: "pointer",
    marginBottom: "24px",
    boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
    letterSpacing: "0.025em",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  buttonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  divider: {
    position: "relative",
    textAlign: "center",
    margin: "30px 0",
  },
  dividerText: {
    background: "rgba(255, 255, 255, 0.9)",
    color: "#64748b",
    fontSize: "0.9rem",
    padding: "0 20px",
    position: "relative",
    zIndex: 1,
    fontWeight: "500",
  },
  signupContainer: {
    marginBottom: "30px",
  },
  signupText: {
    color: "#64748b",
    fontSize: "1rem",
    fontWeight: "400",
  },
  signupLink: {
    color: "#3b82f6",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "none",
    fontSize: "1rem",
  },
  features: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginTop: "30px",
    paddingTop: "25px",
    borderTop: "1px solid rgba(148, 163, 184, 0.2)",
  },
  feature: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "12px 8px",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    position: "relative",
  },
  featureIcon: {
    fontSize: "1.5rem",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
  },
  featureText: {
    fontSize: "0.8rem",
    color: "#475569",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: "1.2",
  },
  featureBadge: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#fff",
    fontSize: "0.65rem",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "6px",
    boxShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
  },
};

export default LoginPage;
