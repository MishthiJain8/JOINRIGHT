import React from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <Header />
      <div className="about-container">
        <div className="hero-section">
          <h1>About JointRight</h1>
          <p className="hero-subtitle">Empowering seamless collaboration through cutting-edge video conferencing</p>
        </div>

        <div className="content-section">
          <div className="section">
            <h2>Our Mission</h2>
            <p>
              JointRight is dedicated to breaking down barriers in virtual communication. We believe that 
              distance should never limit collaboration, creativity, or connection. Our platform provides 
              high-quality, reliable video conferencing solutions that bring people together from anywhere in the world.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎥</div>
              <h3>Crystal Clear Video</h3>
              <p>Experience HD video quality with adaptive streaming technology that adjusts to your network conditions.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Enterprise Security</h3>
              <p>Your meetings are protected with end-to-end encryption and advanced security protocols.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Global Accessibility</h3>
              <p>Join from anywhere in the world with our globally distributed infrastructure for optimal performance.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Quick meeting setup, instant joining, and minimal latency for smooth real-time collaboration.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Cross-Platform</h3>
              <p>Works seamlessly across all devices - desktop, mobile, and tablet with responsive design.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Smart Features</h3>
              <p>Screen sharing, recording, chat, breakout rooms, and more advanced features for productivity.</p>
            </div>
          </div>

          <div className="section">
            <h2>Why Choose JointRight?</h2>
            <div className="benefits-list">
              <div className="benefit-item">
                <span className="benefit-icon">✅</span>
                <div>
                  <h4>No Downloads Required</h4>
                  <p>Join meetings instantly from your browser without installing any software.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✅</span>
                <div>
                  <h4>Unlimited Meeting Duration</h4>
                  <p>Host meetings as long as you need without time restrictions.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✅</span>
                <div>
                  <h4>Advanced Scheduling</h4>
                  <p>Schedule meetings in advance with calendar integration and automated reminders.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✅</span>
                <div>
                  <h4>Recording & Playback</h4>
                  <p>Record important meetings and share them with team members who couldn't attend.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="cta-section">
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of teams already using JointRight for their video conferencing needs.</p>
            <div className="cta-buttons">
              <button className="btn-secondary" onClick={() => window.location.href = '/contact'}>
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;