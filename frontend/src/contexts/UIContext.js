import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const UIContext = createContext();

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }) => {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const location = useLocation();

  // Auto-hide header/footer in meeting routes
  useEffect(() => {
    const isMeetingRoute = location.pathname.startsWith('/live/');
    setIsInMeeting(isMeetingRoute);
    
    if (isMeetingRoute) {
      // Hide header and footer in meetings for immersive experience
      setIsHeaderVisible(false);
      setIsFooterVisible(false);
    } else {
      // Show header and footer in other pages
      setIsHeaderVisible(true);
      setIsFooterVisible(true);
    }
  }, [location.pathname]);

  const hideHeader = () => setIsHeaderVisible(false);
  const showHeader = () => setIsHeaderVisible(true);
  const toggleHeader = () => setIsHeaderVisible(prev => !prev);

  const hideFooter = () => setIsFooterVisible(false);
  const showFooter = () => setIsFooterVisible(true);
  const toggleFooter = () => setIsFooterVisible(prev => !prev);

  const enterImmersiveMode = () => {
    setIsHeaderVisible(false);
    setIsFooterVisible(false);
  };

  const exitImmersiveMode = () => {
    if (!isInMeeting) {
      setIsHeaderVisible(true);
      setIsFooterVisible(true);
    }
  };

  const value = {
    isHeaderVisible,
    isFooterVisible,
    isInMeeting,
    hideHeader,
    showHeader,
    toggleHeader,
    hideFooter,
    showFooter,
    toggleFooter,
    enterImmersiveMode,
    exitImmersiveMode,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};