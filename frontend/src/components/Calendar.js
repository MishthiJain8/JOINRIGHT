import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaPlus, FaClock, FaUsers, FaVideo } from 'react-icons/fa';
import './Calendar.css';

const Calendar = ({ onCreateMeeting, onJoinMeeting, userEmail }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [currentDate, userEmail]);

  const fetchMeetings = async () => {
    if (!userEmail) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/meetings/user/${userEmail}`);
      const data = await response.json();
      
      if (response.ok && data.meetings) {
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMeetingsForDate = (date) => {
    const dateString = date.toDateString();
    return meetings.filter(meeting => 
      new Date(meeting.scheduledAt).toDateString() === dateString
    );
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + direction)));
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (meeting) => {
    const now = new Date();
    const meetingTime = new Date(meeting.scheduledAt);
    
    switch (meeting.status) {
      case 'ongoing':
        return '#10b981'; // green
      case 'ended':
        return '#6b7280'; // gray
      case 'scheduled':
        return meetingTime > now ? '#3b82f6' : '#ef4444'; // blue if future, red if past
      default:
        return '#6b7280';
    }
  };

  const canJoinMeeting = (meeting) => {
    const now = new Date();
    const meetingTime = new Date(meeting.scheduledAt);
    const fiveMinutesBefore = new Date(meetingTime.getTime() - 5 * 60 * 1000);
    
    return (meeting.status === 'ongoing') || 
           (meeting.status === 'scheduled' && now >= fiveMinutesBefore);
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayMeetings = getMeetingsForDate(date);
      const isCurrentDay = isToday(date);
      const isSelectedDay = isSelected(date);

      days.push(
        <div
          key={day}
          className={`calendar-day ${isCurrentDay ? 'today' : ''} ${isSelectedDay ? 'selected' : ''} ${dayMeetings.length > 0 ? 'has-meetings' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <span className="day-number">{day}</span>
          {dayMeetings.length > 0 && (
            <div className="meeting-indicators">
              {dayMeetings.slice(0, 3).map((meeting, index) => (
                <div
                  key={meeting._id || index}
                  className="meeting-dot"
                  style={{ backgroundColor: getStatusColor(meeting) }}
                  title={meeting.title}
                />
              ))}
              {dayMeetings.length > 3 && (
                <span className="more-meetings">+{dayMeetings.length - 3}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateMeetings = getMeetingsForDate(selectedDate);

  return (
    <div className="calendar-component">
      <div className="calendar-container">
        {/* Calendar Header */}
        <div className="calendar-header">
          <div className="month-navigation">
            <button 
              onClick={() => navigateMonth(-1)}
              className="nav-button"
            >
              <FaChevronLeft />
            </button>
            <h2 className="month-year">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h2>
            <button 
              onClick={() => navigateMonth(1)}
              className="nav-button"
            >
              <FaChevronRight />
            </button>
          </div>
          <button 
            onClick={() => onCreateMeeting?.()}
            className="create-meeting-btn"
          >
            <FaPlus /> New Meeting
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {/* Days of week header */}
          <div className="weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="calendar-days">
            {loading ? (
              <div className="calendar-loading">Loading...</div>
            ) : (
              renderCalendarDays()
            )}
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      <div className="selected-date-details">
        <h3>
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}
        </h3>
        
        {selectedDateMeetings.length === 0 ? (
          <div className="no-meetings">
            <p>No meetings scheduled for this date</p>
            <button 
              onClick={() => onCreateMeeting?.(selectedDate)}
              className="create-meeting-link"
            >
              <FaPlus /> Schedule a meeting
            </button>
          </div>
        ) : (
          <div className="meetings-list">
            {selectedDateMeetings.map(meeting => (
              <div key={meeting._id} className="meeting-item">
                <div className="meeting-info">
                  <div className="meeting-title-time">
                    <h4>{meeting.title}</h4>
                    <span className="meeting-time">
                      <FaClock /> {formatTime(meeting.scheduledAt)}
                    </span>
                  </div>
                  
                  {meeting.description && (
                    <p className="meeting-description">{meeting.description}</p>
                  )}
                  
                  <div className="meeting-meta">
                    <span className="participants">
                      <FaUsers /> {meeting.participants?.length || 0} participants
                    </span>
                    <span 
                      className={`status ${meeting.status}`}
                      style={{ color: getStatusColor(meeting) }}
                    >
                      {meeting.status}
                    </span>
                  </div>
                </div>
                
                <div className="meeting-actions">
                  {canJoinMeeting(meeting) && (
                    <button 
                      onClick={() => onJoinMeeting?.(meeting)}
                      className="join-btn"
                      title="Join Meeting"
                    >
                      <FaVideo />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;