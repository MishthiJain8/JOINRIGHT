import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthDebug = () => {
  const { user, isAuthenticated, isLoading, error } = useAuth();

  const authToken = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#4ade80' }}>🐛 Auth Debug</h4>
      
      <div><strong>Context State:</strong></div>
      <div>• isAuthenticated: {isAuthenticated ? '✅' : '❌'}</div>
      <div>• isLoading: {isLoading ? '⏳' : '✅'}</div>
      <div>• user: {user ? `${user.email} (${user.role})` : 'null'}</div>
      <div>• error: {error || 'none'}</div>
      
      <div style={{ marginTop: '10px' }}><strong>localStorage:</strong></div>
      <div>• authToken: {authToken ? `${authToken.slice(0, 20)}...` : 'null'}</div>
      <div>• userData: {userData ? 'exists' : 'null'}</div>
      <div>• isLoggedIn: {isLoggedIn || 'null'}</div>

      <div style={{ marginTop: '10px' }}><strong>Current URL:</strong></div>
      <div>{window.location.pathname}</div>
    </div>
  );
};

export default AuthDebug;