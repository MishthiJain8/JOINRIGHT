import React from "react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const footerStyle = {
    backgroundColor: "#1e40af",
    color: "#fff",
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    marginTop: "auto",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  };

  const footerContentStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px 20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "30px",
  };

  const footerSectionStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  };

  const sectionTitleStyle = {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#fff",
    marginBottom: "5px",
  };

  const linkStyle = {
    color: "#cbd5e1",
    textDecoration: "none",
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "color 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const socialLinkStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#fff",
    textDecoration: "none",
    fontSize: "1.2rem",
    transition: "all 0.2s ease",
    cursor: "pointer",
  };

  const bottomBarStyle = {
    borderTop: "1px solid rgba(255,255,255,0.1)",
    padding: "20px 0",
    textAlign: "center",
    fontSize: "0.9rem",
    color: "#94a3b8",
  };

  const companyInfoStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };

  const logoStyle = {
    fontSize: "1.4rem",
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "10px",
  };

  const socialLinksStyle = {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
  };

  const handleLinkHover = (e, hoverColor = "#fff") => {
    e.target.style.color = hoverColor;
  };

  const handleLinkLeave = (e, defaultColor = "#cbd5e1") => {
    e.target.style.color = defaultColor;
  };

  const handleSocialHover = (e, bgColor = "rgba(255,255,255,0.2)") => {
    e.target.style.backgroundColor = bgColor;
    e.target.style.transform = "translateY(-2px)";
  };

  const handleSocialLeave = (e) => {
    e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
    e.target.style.transform = "translateY(0)";
  };

  return (
    <footer style={footerStyle}>
      <div style={footerContentStyle}>
        {/* Company Info */}
        <div style={footerSectionStyle}>
          <div style={logoStyle}>🤝 JointRight</div>
          <div style={companyInfoStyle}>
            <p style={{ margin: 0, color: "#94a3b8", lineHeight: "1.5" }}>
              Empowering seamless collaboration through innovative meeting solutions. 
              Connect, collaborate, and succeed together.
            </p>
            <div style={socialLinksStyle}>
              <div 
                style={socialLinkStyle}
                onMouseEnter={(e) => handleSocialHover(e, "#1877f2")}
                onMouseLeave={handleSocialLeave}
                onClick={() => window.open("https://facebook.com", "_blank")}
              >
                📘
              </div>
              <div 
                style={socialLinkStyle}
                onMouseEnter={(e) => handleSocialHover(e, "#1da1f2")}
                onMouseLeave={handleSocialLeave}
                onClick={() => window.open("https://twitter.com", "_blank")}
              >
                🐦
              </div>
              <div 
                style={socialLinkStyle}
                onMouseEnter={(e) => handleSocialHover(e, "#0077b5")}
                onMouseLeave={handleSocialLeave}
                onClick={() => window.open("https://linkedin.com", "_blank")}
              >
                💼
              </div>
              <div 
                style={socialLinkStyle}
                onMouseEnter={(e) => handleSocialHover(e, "#333")}
                onMouseLeave={handleSocialLeave}
                onClick={() => window.open("https://github.com", "_blank")}
              >
                🐙
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={footerSectionStyle}>
          <h3 style={sectionTitleStyle}>Quick Links</h3>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/dashboard")}
          >
            📊 Dashboard
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/meetings")}
          >
            🎯 Meetings
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/calendar")}
          >
            📅 Calendar
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/profile")}
          >
            👤 Profile
          </div>
        </div>

        {/* Support */}
        <div style={footerSectionStyle}>
          <h3 style={sectionTitleStyle}>Support</h3>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/help")}
          >
            ❓ Help Center
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/contact")}
          >
            📞 Contact Us
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/faq")}
          >
            💬 FAQ
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => window.open("mailto:support@jointright.com")}
          >
            📧 support@jointright.com
          </div>
        </div>

        {/* Legal */}
        <div style={footerSectionStyle}>
          <h3 style={sectionTitleStyle}>Legal</h3>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/privacy")}
          >
            🔒 Privacy Policy
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/terms")}
          >
            📋 Terms of Service
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/cookies")}
          >
            🍪 Cookie Policy
          </div>
          <div 
            style={linkStyle}
            onMouseEnter={(e) => handleLinkHover(e)}
            onMouseLeave={(e) => handleLinkLeave(e)}
            onClick={() => navigate("/about")}
          >
            ℹ️ About Us
          </div>
        </div>
      </div>

      <div style={bottomBarStyle}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
          <p style={{ margin: 0 }}>
            © {currentYear} JointRight. All rights reserved. | Built with ❤️ for better collaboration
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
