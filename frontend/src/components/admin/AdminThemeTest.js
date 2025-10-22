import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const AdminThemeTest = () => {
  const { isDarkMode, toggleTheme, theme } = useTheme();

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      margin: '20px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{ color: '#1f2937', marginBottom: '16px' }}>
        🧪 Admin Theme Test Panel
      </h3>
      
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0' }}>
          Current Theme Context: <strong style={{ color: isDarkMode ? '#ef4444' : '#10b981' }}>
            {theme} mode
          </strong>
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0' }}>
          Dark Mode State: <strong>{isDarkMode ? 'true' : 'false'}</strong>
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0' }}>
          HTML data-theme: <strong>{document.documentElement.getAttribute('data-theme') || 'none'}</strong>
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0' }}>
          Body classes: <strong>{document.body.className || 'none'}</strong>
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0' }}>
          Admin Lock Active: <strong style={{ color: document.documentElement.classList.contains('admin-theme-locked') ? '#10b981' : '#ef4444' }}>
            {document.documentElement.classList.contains('admin-theme-locked') ? 'YES' : 'NO'}
          </strong>
        </p>
      </div>

      <button
        onClick={toggleTheme}
        style={{
          padding: '8px 16px',
          backgroundColor: isDarkMode ? '#374151' : '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }}
      >
        🌓 Try Theme Toggle (Should Not Affect Admin)
      </button>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '6px'
      }}>
        <p style={{ 
          color: '#374151', 
          fontSize: '12px', 
          margin: 0, 
          fontStyle: 'italic' 
        }}>
          ✅ If admin theme isolation is working correctly:<br/>
          • This panel should always appear in light theme<br/>
          • Theme toggle should not change admin appearance<br/>
          • Admin Lock Active should show "YES"<br/>
          • Theme context may change but UI stays light
        </p>
      </div>
    </div>
  );
};

export default AdminThemeTest;