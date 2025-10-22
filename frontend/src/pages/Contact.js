import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl, API_CONFIG } from '../config/api';
import './Contact.css';

const Contact = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill form with user data if authenticated or restore from sessionStorage
  useEffect(() => {
    // Check for pending form data from sessionStorage (after login)
    const pendingForm = sessionStorage.getItem('pendingContactForm');
    if (pendingForm) {
      try {
        const savedFormData = JSON.parse(pendingForm);
        setFormData(savedFormData);
        sessionStorage.removeItem('pendingContactForm');
      } catch (error) {
        console.warn('Failed to parse pending contact form data:', error);
      }
    } else if (isAuthenticated && user) {
      // Pre-fill with user data if no pending form data
      setFormData(prev => ({
        ...prev,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || '',
        email: user.email || ''
      }));
    }
  }, [isAuthenticated, user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Store form data for after login
      sessionStorage.setItem('pendingContactForm', JSON.stringify(formData));
      
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/login?returnUrl=${returnUrl}&type=contact`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.CONTACT.SUBMIT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit message');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      // Clear any stored form data
      sessionStorage.removeItem('pendingContactForm');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <Header />
      <div className="contact-container">
        <div className="hero-section">
          <h1>Contact Us</h1>
          <p className="hero-subtitle">We're here to help you get the most out of JointRight</p>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>Have questions about JointRight? Need technical support? Want to explore enterprise solutions? We'd love to hear from you!</p>
            
            <div className="contact-methods">
              <div className="contact-method">
                <div className="method-icon">📧</div>
                <div className="method-details">
                  <h3>Email Support</h3>
                  <p>support@jointright.com</p>
                  <span className="response-time">Response within 24 hours</span>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">📞</div>
                <div className="method-details">
                  <h3>Phone Support</h3>
                  <p>+1 (555) 123-4567</p>
                  <span className="response-time">Mon-Fri, 9 AM - 6 PM EST</span>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">💬</div>
                <div className="method-details">
                  <h3>Live Chat</h3>
                  <p>Available on our website</p>
                  <span className="response-time">Mon-Fri, 9 AM - 6 PM EST</span>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">🏢</div>
                <div className="method-details">
                  <h3>Office Address</h3>
                  <p>123 Innovation Drive<br />Tech City, TC 12345<br />United States</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-section">
            {submitted ? (
              <div className="success-message">
                <div className="success-icon">✅</div>
                <h3>Thank you for your message!</h3>
                <p>We've received your inquiry and will get back to you within 24 hours.</p>
                <button 
                  className="btn-secondary" 
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <h2>Send us a Message</h2>
                
                {!isAuthenticated && (
                  <div className="auth-notice">
                    <div className="notice-icon">🔒</div>
                    <div className="notice-content">
                      <strong>Login Required</strong>
                      <p>You need to be logged in to send messages. Click "Send Message" to login or sign up.</p>
                    </div>
                  </div>
                )}
                
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="technical-support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="feature-request">Feature Request</option>
                    <option value="partnership">Partnership Inquiry</option>
                    <option value="general">General Question</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Please describe your question or issue in detail..."
                  />
                </div>

                <button 
                  type="submit" 
                  className={`btn-primary ${!isAuthenticated ? 'auth-required' : ''}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 
                   isAuthenticated ? 'Send Message' : 'Login to Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;