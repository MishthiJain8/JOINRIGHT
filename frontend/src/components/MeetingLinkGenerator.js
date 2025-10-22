import React, { useState } from 'react';

const MeetingLinkGenerator = () => {
  const [meetingId, setMeetingId] = useState('ABC123DE');
  const [password, setPassword] = useState('meeting123');
  const [title, setTitle] = useState('Team Standup Meeting');
  const [host, setHost] = useState('John Doe');
  const [generatedLinks, setGeneratedLinks] = useState({});

  const generateLinks = () => {
    const baseUrl = window.location.origin;
    
    // Normal link (no password in URL)
    const normalLink = `${baseUrl}/join/${meetingId}?title=${encodeURIComponent(title)}&host=${encodeURIComponent(host)}`;
    
    // Passworded link (password included in URL)
    const passwordedLink = `${baseUrl}/join/${meetingId}?pwd=${encodeURIComponent(password)}&title=${encodeURIComponent(title)}&host=${encodeURIComponent(host)}`;
    
    setGeneratedLinks({
      normal: normalLink,
      passworded: passwordedLink
    });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔗 Meeting Link Generator</h2>
      <p style={styles.description}>
        Generate meeting links to test the authentication flow. Both types of links require users to be logged in.
      </p>
      
      <div style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Meeting ID:</label>
          <input
            type="text"
            style={styles.input}
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="ABC123DE"
          />
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Password:</label>
          <input
            type="text"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="meeting123"
          />
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Meeting Title:</label>
          <input
            type="text"
            style={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Team Standup Meeting"
          />
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Host Name:</label>
          <input
            type="text"
            style={styles.input}
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="John Doe"
          />
        </div>
        
        <button style={styles.generateButton} onClick={generateLinks}>
          Generate Meeting Links
        </button>
      </div>
      
      {generatedLinks.normal && (
        <div style={styles.results}>
          <div style={styles.linkSection}>
            <h3 style={styles.linkTitle}>📋 Normal Link</h3>
            <p style={styles.linkDescription}>
              Users will be prompted to enter the password after login
            </p>
            <div style={styles.linkContainer}>
              <input
                type="text"
                style={styles.linkInput}
                value={generatedLinks.normal}
                readOnly
              />
              <button
                style={styles.copyButton}
                onClick={() => copyToClipboard(generatedLinks.normal)}
              >
                Copy
              </button>
            </div>
          </div>
          
          <div style={styles.linkSection}>
            <h3 style={styles.linkTitle}>🔐 Passworded Link</h3>
            <p style={styles.linkDescription}>
              Users can join directly after login (password included)
            </p>
            <div style={styles.linkContainer}>
              <input
                type="text"
                style={styles.linkInput}
                value={generatedLinks.passworded}
                readOnly
              />
              <button
                style={styles.copyButton}
                onClick={() => copyToClipboard(generatedLinks.passworded)}
              >
                Copy
              </button>
            </div>
          </div>
          
          <div style={styles.instructions}>
            <h4>📝 How to Test:</h4>
            <ol style={styles.instructionList}>
              <li>Copy either link and open in a new incognito/private window</li>
              <li>You'll be redirected to login if not authenticated</li>
              <li>After login, you'll be taken to the meeting join page</li>
              <li>Normal links require password entry, passworded links auto-fill it</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '20px auto',
    padding: '30px',
    backgroundColor: 'white',
    borderRadius: '15px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Inter, sans-serif',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '10px',
    textAlign: 'center',
  },
  description: {
    fontSize: '1rem',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '30px',
    lineHeight: '1.5',
  },
  form: {
    marginBottom: '30px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  generateButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  results: {
    marginTop: '30px',
  },
  linkSection: {
    marginBottom: '25px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  linkTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '8px',
  },
  linkDescription: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '12px',
  },
  linkContainer: {
    display: 'flex',
    gap: '10px',
  },
  linkInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.85rem',
    backgroundColor: 'white',
    color: '#374151',
  },
  copyButton: {
    padding: '10px 15px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  instructions: {
    marginTop: '25px',
    padding: '20px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    border: '1px solid #bfdbfe',
  },
  instructionList: {
    color: '#1e40af',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    paddingLeft: '20px',
  },
};

export default MeetingLinkGenerator;