import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import './header.css';

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { isHeaderVisible } = useUI();
  const [showDropdown, setShowDropdown] = useState(false);

  // Get display name for user
  const getDisplayName = () => {
    if (!user) return "User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return "User";
  };

  const getInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) return user.firstName[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "U";
  };

  const handleLogin = () => {
    console.log('Header: Login button clicked, navigating to /login');
    navigate("/login");
  };

  const handleLogout = async () => {
    try {
      console.log('Header: Logout button clicked, logging out user');
      await logout();
      setShowDropdown(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleProfile = () => {
    console.log('Header: Profile button clicked, navigating to /profile');
    navigate("/profile");
    setShowDropdown(false);
  };

  const handleDashboard = () => {
    console.log('Header: Dashboard button clicked, navigating to /dashboard');
    navigate("/dashboard");
    setShowDropdown(false);
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 30px",
    backgroundColor: "#1e40af",
    color: "#fff",
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isHeaderVisible ? 1 : 0,
    pointerEvents: isHeaderVisible ? 'auto' : 'none',
  };

  const logoStyle = {
    fontWeight: "bold",
    fontSize: "1.8rem",
    cursor: "pointer",
    transition: "transform 0.2s ease",
    userSelect: "none",
    outline: "none",
  };

  const navStyle = {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  };

  const navItemStyle = {
    background: "transparent",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "500",
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "1px solid transparent",
    userSelect: "none",
    outline: "none",
  };

  const navItemHoverStyle = {
    background: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.2)",
  };

  const userMenuStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginLeft: "20px",
  };

  const loginButtonStyle = {
    backgroundColor: "#10b981",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "0.95rem",
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const userButtonStyle = {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    padding: "10px 15px",
    borderRadius: "8px",
    fontWeight: "500",
    fontSize: "0.95rem",
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.2)",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const dropdownStyle = {
    position: "absolute",
    top: "45px",
    right: "0",
    backgroundColor: "#fff",
    color: "#374151",
    minWidth: "180px",
    borderRadius: "8px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    border: "1px solid #e5e7eb",
    zIndex: 1000,
    overflow: "hidden",
  };

  const dropdownItemStyle = {
    padding: "12px 16px",
    cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "0.95rem",
    transition: "background-color 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const NavItem = ({ children, onClick, style = {} }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const handleClick = (e) => {
      try {
        console.log('🔥 NavItem clicked:', children, 'Auth state:', isAuthenticated);
        console.log('🔥 Event target:', e.target);
        console.log('🔥 Event currentTarget:', e.currentTarget);
        
        if (onClick) {
          console.log('🔥 Calling onClick handler for:', children);
          onClick(e);
        } else {
          console.log('🔥 No onClick handler for:', children);
        }
      } catch (error) {
        console.error('🔥 NavItem click error:', error);
      }
    };
    
    const handleMouseDown = (e) => {
      console.log('🔥 NavItem mousedown:', children);
    };
    
    const handleMouseUp = (e) => {
      console.log('🔥 NavItem mouseup:', children);
      // If click events aren't working, use mouseup as backup
      if (onClick) {
        console.log('🔥 Mouseup backup navigation for:', children);
        onClick(e);
      }
    };
    
    return (
      <div
        style={{
          ...navItemStyle,
          ...(isHovered ? navItemHoverStyle : {}),
          ...style,
          position: 'relative',
          zIndex: 1001,
          display: 'inline-block',
          textAlign: 'center',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        role="button"
        tabIndex={0}
      >
        {children}
      </div>
    );
  };

  // Don't render header at all in meeting routes for performance
  if (!isHeaderVisible && window.location.pathname.startsWith('/live/')) {
    return null;
  }

  return (
    <header style={headerStyle}>
      <div 
        style={{ ...logoStyle, zIndex: 1001, position: 'relative' }}
        onClick={(e) => {
          console.log('🔥 Header: Logo clicked, navigating to dashboard, Auth state:', isAuthenticated);
          handleDashboard();
        }}
        onMouseDown={(e) => console.log('🔥 Logo mousedown')}
        onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
      >
        🤝 JointRight
      </div>
      
      <nav style={navStyle}>
        <NavItem onClick={handleDashboard}>Dashboard</NavItem>
        <NavItem onClick={() => {
          console.log('Header: Join Meeting clicked, navigating to /join');
          navigate("/join");
        }}>Join Meeting</NavItem>
        <NavItem onClick={() => {
          console.log('Header: About clicked, navigating to /about');
          navigate("/about");
        }}>About</NavItem>
        <NavItem onClick={() => {
          console.log('Header: Contact clicked, navigating to /contact');
          navigate("/contact");
        }}>Contact</NavItem>

        <div style={{ ...userMenuStyle, pointerEvents: 'auto', position: 'relative', zIndex: 1002 }}>
          {isAuthenticated ? (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  ...userButtonStyle,
                  backgroundColor: showDropdown ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"
                }}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginRight: "8px"
                }}>
                  {getInitials()}
                </div>
                <span>{getDisplayName()}</span>
                <span style={{ fontSize: "0.8rem" }}>▼</span>
              </div>
              
              {showDropdown && (
                <div 
                  className="user-dropdown"
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="dropdown-header">
                    Signed in as <strong>{getDisplayName()}</strong>
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      navigate("/profile");
                      setShowDropdown(false);
                    }}
                  >
                    <span>👤</span>
                    View Profile
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      navigate("/profile?edit=true");
                      setShowDropdown(false);
                    }}
                  >
                    <span>✏️</span>
                    Edit Profile
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={handleDashboard}
                  >
                    <span>📊</span>
                    Dashboard
                  </div>
                  <div
                    className="dropdown-item logout"
                    onClick={handleLogout}
                  >
                    <span>🚪</span>
                    Logout
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              style={loginButtonStyle}
              onClick={handleLogin}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#059669"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#10b981"}
            >
              <span>🔐</span>
              Login
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
