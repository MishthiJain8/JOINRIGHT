import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signupAPI, apiUtils } from '../services/api';

const SignupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email → verification → complete
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const [otpTimer, setOtpTimer] = useState(0);

  // Force light theme on signup page (run only once)
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

  // Timer for OTP resend
  React.useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Password strength validation
  const checkPasswordStrength = (password) => {
    const checks = [
      { test: /.{8,}/, message: "At least 8 characters" },
      { test: /[A-Z]/, message: "One uppercase letter" },
      { test: /[a-z]/, message: "One lowercase letter" },
      { test: /\d/, message: "One number" },
      { test: /[^A-Za-z0-9]/, message: "One special character" }
    ];
    
    const passed = checks.filter(check => check.test.test(password));
    const failed = checks.filter(check => !check.test.test(password));
    
    return {
      score: passed.length,
      feedback: failed.map(check => check.message),
      isStrong: passed.length === checks.length
    };
  };

  React.useEffect(() => {
    if (formData.password) {
      setPasswordStrength(checkPasswordStrength(formData.password));
    }
  }, [formData.password]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const data = await signupAPI.requestOtp(formData.email);
      
      setStep("verification");
      setSuccess(data.message || "Verification code sent to your email!");
      setOtpTimer(300); // 5 minutes
      
      // Show development OTP if available
      if (data.developmentOtp) {
        setSuccess(`Development mode: Your verification code is ${data.developmentOtp}`);
      }
    } catch (error) {
      const apiError = apiUtils.handleApiError(error);
      console.error("Send OTP error:", apiError);
      setError(apiError.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const data = await signupAPI.resendOtp(formData.email);
      setSuccess(data.message || "New verification code sent!");
      setOtpTimer(300);
    } catch (error) {
      const apiError = apiUtils.handleApiError(error);
      console.error("Resend OTP error:", apiError);
      setError(apiError.message || "Failed to resend verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignup = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (!passwordStrength.isStrong) {
      setError("Please ensure your password meets all requirements");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const signupData = {
        email: formData.email,
        otp: formData.otp,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName
      };
      
      const data = await signupAPI.verifySignup(signupData);
      
      setStep("complete");
      setSuccess(data.message || "Account created successfully!");
      
      // Redirect to login after showing success message
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      const apiError = apiUtils.handleApiError(error);
      console.error("Signup verification error:", apiError);
      
      if (apiError.details && Array.isArray(apiError.details)) {
        setError(`${apiError.message}: ${apiError.details.join(", ")}`);
      } else {
        setError(apiError.message || "Signup failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPasswordStrengthColor = (score) => {
    if (score <= 1) return '#ef4444'; // red
    if (score <= 3) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  const getPasswordStrengthText = (score) => {
    if (score <= 1) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
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
          
          @keyframes slideIn {
            0% {
              opacity: 0;
              transform: translateX(-20px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
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
          
          .signup-container {
            animation: gradient 15s ease infinite;
            background-size: 400% 400%;
          }
          
          .signup-card {
            animation: fadeInUp 0.6s ease-out;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          
          .step-content {
            animation: slideIn 0.4s ease-out;
          }
          
          .input-focus {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .input-focus:focus {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
            transform: translateY(-1px);
          }
          
          .button-hover {
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .button-hover:hover:not(:disabled) {
            background: #1d4ed8 !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(29, 78, 216, 0.4);
          }
          
          .button-hover:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          .progress-bar {
            transition: width 0.3s ease;
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
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(180deg);
            }
          }
        `}
      </style>
      
      <div className="signup-container" style={styles.container}>
        <div className="floating-shapes">
          <div className="shape" style={{width: '80px', height: '80px', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', borderRadius: '50%', top: '15%', left: '10%', animationDelay: '0s'}}></div>
          <div className="shape" style={{width: '60px', height: '60px', background: 'linear-gradient(45deg, #06b6d4, #3b82f6)', borderRadius: '50%', top: '70%', right: '15%', animationDelay: '2s'}}></div>
          <div className="shape" style={{width: '100px', height: '100px', background: 'linear-gradient(45deg, #8b5cf6, #ec4899)', borderRadius: '50%', bottom: '20%', left: '20%', animationDelay: '4s'}}></div>
        </div>
        
        <div className="signup-card" style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoContainer}>
              <div style={styles.logoIcon}>🚀</div>
              <h1 style={styles.title}>Join JointRight</h1>
            </div>
            
            {/* Progress indicator */}
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div 
                  className="progress-bar"
                  style={{
                    ...styles.progressFill,
                    width: step === 'email' ? '33%' : step === 'verification' ? '66%' : '100%'
                  }}
                ></div>
              </div>
              <div style={styles.stepLabels}>
                <span style={{...styles.stepLabel, color: '#3b82f6'}}>Email</span>
                <span style={{...styles.stepLabel, color: step === 'verification' || step === 'complete' ? '#3b82f6' : '#9ca3af'}}>Verify</span>
                <span style={{...styles.stepLabel, color: step === 'complete' ? '#10b981' : '#9ca3af'}}>Complete</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorContainer}>
              <span style={styles.errorIcon}>⚠️</span>
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div style={styles.successContainer}>
              <span style={styles.successIcon}>✅</span>
              <span style={styles.successText}>{success}</span>
            </div>
          )}

          <div className="step-content">
            {/* Step 1: Email */}
            {step === "email" && (
              <form onSubmit={handleSendOtp}>
                <div style={styles.inputContainer}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    className="input-focus"
                    style={{
                      ...styles.input,
                      borderColor: error ? "#ef4444" : "#d1d5db"
                    }}
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <button 
                  className="button-hover"
                  style={{
                    ...styles.button,
                    backgroundColor: isLoading ? "#9ca3af" : "#2563eb"
                  }}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div style={styles.loadingContainer}>
                      <div style={styles.spinner}></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div style={styles.buttonContent}>
                      <span>📧</span>
                      <span>Send Verification Code</span>
                    </div>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Verification and Account Details */}
            {step === "verification" && (
              <form onSubmit={handleVerifySignup}>
                <div style={styles.inputContainer}>
                  <label style={styles.label}>Verification Code</label>
                  <input
                    className="input-focus"
                    style={{
                      ...styles.input,
                      borderColor: error ? "#ef4444" : "#d1d5db",
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      letterSpacing: '4px'
                    }}
                    type="text"
                    placeholder="000000"
                    value={formData.otp}
                    onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isLoading}
                    maxLength={6}
                    required
                  />
                  
                  {/* Timer and Resend */}
                  <div style={styles.otpActions}>
                    {otpTimer > 0 ? (
                      <span style={styles.timerText}>Code expires in {formatTime(otpTimer)}</span>
                    ) : (
                      <button 
                        type="button"
                        style={styles.resendButton}
                        onClick={handleResendOtp}
                        disabled={isLoading}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                {/* Name Fields */}
                <div style={styles.nameRow}>
                  <div style={{...styles.inputContainer, flex: 1, marginRight: '10px'}}>
                    <label style={styles.label}>First Name</label>
                    <input
                      className="input-focus"
                      style={styles.input}
                      type="text"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div style={{...styles.inputContainer, flex: 1, marginLeft: '10px'}}>
                    <label style={styles.label}>Last Name</label>
                    <input
                      className="input-focus"
                      style={styles.input}
                      type="text"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                {/* Password Fields */}
                <div style={styles.inputContainer}>
                  <label style={styles.label}>Password</label>
                  <input
                    className="input-focus"
                    style={{
                      ...styles.input,
                      borderColor: error ? "#ef4444" : passwordStrength.isStrong ? "#10b981" : "#d1d5db"
                    }}
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div style={styles.passwordStrength}>
                      <div style={styles.strengthHeader}>
                        <span style={{...styles.strengthText, color: getPasswordStrengthColor(passwordStrength.score)}}>
                          {getPasswordStrengthText(passwordStrength.score)}
                        </span>
                        <span style={styles.strengthScore}>{passwordStrength.score}/5</span>
                      </div>
                      <div style={styles.strengthBar}>
                        <div 
                          style={{
                            ...styles.strengthFill,
                            width: `${(passwordStrength.score / 5) * 100}%`,
                            backgroundColor: getPasswordStrengthColor(passwordStrength.score)
                          }}
                        ></div>
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <div style={styles.strengthFeedback}>
                          {passwordStrength.feedback.map((feedback, index) => (
                            <div key={index} style={styles.feedbackItem}>
                              <span style={styles.feedbackIcon}>•</span>
                              <span style={styles.feedbackText}>{feedback}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div style={styles.inputContainer}>
                  <label style={styles.label}>Confirm Password</label>
                  <input
                    className="input-focus"
                    style={{
                      ...styles.input,
                      borderColor: error ? "#ef4444" : 
                        (formData.confirmPassword && formData.password === formData.confirmPassword) ? "#10b981" : "#d1d5db"
                    }}
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <div style={styles.passwordMismatch}>
                      <span style={styles.mismatchIcon}>❌</span>
                      <span style={styles.mismatchText}>Passwords do not match</span>
                    </div>
                  )}
                </div>
                
                <button 
                  className="button-hover"
                  style={{
                    ...styles.button,
                    backgroundColor: isLoading ? "#9ca3af" : "#10b981"
                  }}
                  type="submit"
                  disabled={isLoading || !passwordStrength.isStrong || formData.password !== formData.confirmPassword}
                >
                  {isLoading ? (
                    <div style={styles.loadingContainer}>
                      <div style={styles.spinner}></div>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <div style={styles.buttonContent}>
                      <span>🎉</span>
                      <span>Create Account</span>
                    </div>
                  )}
                </button>
              </form>
            )}

            {/* Step 3: Completion */}
            {step === "complete" && (
              <div style={styles.completionContainer}>
                <div style={styles.successAnimation}>🎉</div>
                <h2 style={styles.completionTitle}>Welcome to JointRight!</h2>
                <p style={styles.completionMessage}>Your account has been successfully created.</p>
                <div style={styles.redirectMessage}>
                  <span style={styles.redirectIcon}>🔄</span>
                  <span>Redirecting to login page...</span>
                </div>
              </div>
            )}
          </div>

          {step !== 'complete' && (
            <>
              <div style={styles.divider}>
                <span style={styles.dividerText}>or</span>
              </div>

              <div style={styles.loginContainer}>
                <span style={styles.loginText}>Already have an account? </span>
                <span
                  style={styles.loginLink}
                  onClick={() => navigate("/")}
                >
                  Sign in here
                </span>
              </div>
            </>
          )}
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
    background: "rgba(255, 255, 255, 0.95)",
    padding: "50px",
    borderRadius: "24px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)",
    width: "100%",
    maxWidth: "520px",
    textAlign: "center",
    position: "relative",
    zIndex: 10,
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  header: {
    marginBottom: "40px",
  },
  logoContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "25px",
  },
  logoIcon: {
    fontSize: "3rem",
    marginBottom: "15px",
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
  progressContainer: {
    marginTop: "30px",
  },
  progressBar: {
    width: "100%",
    height: "6px",
    backgroundColor: "#e5e7eb",
    borderRadius: "3px",
    overflow: "hidden",
    marginBottom: "15px",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    borderRadius: "3px",
    transition: "width 0.3s ease",
  },
  stepLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  stepLabel: {
    transition: "color 0.3s ease",
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
    textAlign: "left",
  },
  successContainer: {
    background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
    border: "1px solid #86efac",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 4px 6px rgba(34, 197, 94, 0.1)",
  },
  successIcon: {
    fontSize: "1.3rem",
    filter: "drop-shadow(0 2px 4px rgba(34, 197, 94, 0.3))",
  },
  successText: {
    color: "#059669",
    fontSize: "0.95rem",
    fontWeight: "500",
    lineHeight: "1.4",
    textAlign: "left",
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
  nameRow: {
    display: "flex",
    gap: "20px",
    marginBottom: "24px",
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
  otpActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
  },
  timerText: {
    color: "#64748b",
    fontSize: "0.9rem",
    fontWeight: "500",
  },
  resendButton: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "underline",
    padding: "4px 0",
  },
  passwordStrength: {
    marginTop: "12px",
    padding: "16px",
    background: "rgba(248, 250, 252, 0.8)",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  strengthHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  strengthText: {
    fontSize: "0.9rem",
    fontWeight: "600",
  },
  strengthScore: {
    color: "#64748b",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  strengthBar: {
    width: "100%",
    height: "6px",
    backgroundColor: "#e5e7eb",
    borderRadius: "3px",
    overflow: "hidden",
    marginBottom: "12px",
  },
  strengthFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "all 0.3s ease",
  },
  strengthFeedback: {
    textAlign: "left",
  },
  feedbackItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  feedbackIcon: {
    color: "#f59e0b",
    fontSize: "0.8rem",
  },
  feedbackText: {
    color: "#64748b",
    fontSize: "0.85rem",
    fontWeight: "400",
  },
  passwordMismatch: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
  },
  mismatchIcon: {
    fontSize: "1rem",
  },
  mismatchText: {
    color: "#dc2626",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  completionContainer: {
    textAlign: "center",
    padding: "40px 20px",
  },
  successAnimation: {
    fontSize: "4rem",
    marginBottom: "20px",
    animation: "pulse 2s infinite",
  },
  completionTitle: {
    color: "#1e293b",
    fontSize: "1.8rem",
    fontWeight: "700",
    marginBottom: "15px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  completionMessage: {
    color: "#64748b",
    fontSize: "1.1rem",
    marginBottom: "25px",
    lineHeight: "1.5",
  },
  redirectMessage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    color: "#64748b",
    fontSize: "0.95rem",
    fontWeight: "500",
  },
  redirectIcon: {
    fontSize: "1.2rem",
    animation: "spin 2s linear infinite",
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
  loginContainer: {
    marginBottom: "10px",
  },
  loginText: {
    color: "#64748b",
    fontSize: "1rem",
    fontWeight: "400",
  },
  loginLink: {
    color: "#3b82f6",
    fontWeight: "600",
    cursor: "pointer",
    textDecoration: "none",
    fontSize: "1rem",
    transition: "all 0.2s ease",
  },
};

export default SignupPage;
