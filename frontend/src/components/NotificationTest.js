import React from 'react';

// Simple test component to help create test meetings for notification testing
const NotificationTest = ({ onCreateTestMeeting }) => {
  const createTestMeeting = (minutesFromNow) => {
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + minutesFromNow * 60000);
    
    const testMeeting = {
      _id: `test-${Date.now()}`,
      title: `Test Meeting in ${minutesFromNow} minutes`,
      description: 'This is a test meeting for notification testing',
      scheduledAt: scheduledTime.toISOString(),
      meetingId: `TEST${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      status: 'scheduled',
      creator: 'test@example.com',
      participants: []
    };
    
    if (onCreateTestMeeting) {
      onCreateTestMeeting(testMeeting);
    }
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
        if (permission === 'granted') {
          new Notification('Notifications Enabled!', {
            body: 'You will now receive meeting reminders.',
            icon: '/favicon.ico'
          });
        }
      });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      display: process.env.NODE_ENV === 'development' ? 'block' : 'none'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
        🔔 Notification Testing
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => createTestMeeting(1)}
          style={{
            padding: '8px 12px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Create Meeting in 1 min
        </button>
        <button
          onClick={() => createTestMeeting(30)}
          style={{
            padding: '8px 12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Create Meeting in 30 min
        </button>
        <button
          onClick={() => createTestMeeting(59)}
          style={{
            padding: '8px 12px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Create Meeting in 59 min
        </button>
        <button
          onClick={requestNotificationPermission}
          style={{
            padding: '8px 12px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Enable Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationTest;