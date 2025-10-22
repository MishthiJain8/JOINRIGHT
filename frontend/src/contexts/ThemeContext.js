import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const initializeTheme = () => {
      // Check for saved theme preference
      const savedTheme = localStorage.getItem('theme');
      const savedDarkMode = localStorage.getItem('darkMode');
      
      let shouldUseDarkMode = false;
      
      if (savedTheme === 'dark' || savedDarkMode === 'true') {
        shouldUseDarkMode = true;
      } else if (!savedTheme && !savedDarkMode) {
        // If no saved preference, check system preference
        shouldUseDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      setIsDarkMode(shouldUseDarkMode);
      applyTheme(shouldUseDarkMode);
    };

    initializeTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      // Only apply system theme if user hasn't set a preference
      if (!localStorage.getItem('theme') && !localStorage.getItem('darkMode')) {
        setIsDarkMode(e.matches);
        applyTheme(e.matches);
      }
    };

    mediaQuery.addListener(handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeListener(handleSystemThemeChange);
    };
  }, []);

  const applyTheme = (darkMode) => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    // Don't apply theme changes if admin dashboard is active
    if (htmlElement.classList.contains('admin-theme-locked')) {
      return;
    }
    
    if (darkMode) {
      // Apply dark theme
      htmlElement.setAttribute('data-theme', 'dark');
      htmlElement.classList.add('dark-mode');
      bodyElement.classList.add('dark-mode');
    } else {
      // Apply light theme
      htmlElement.setAttribute('data-theme', 'light');
      htmlElement.classList.remove('dark-mode');
      bodyElement.classList.remove('dark-mode');
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    // Save preference to localStorage
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    // Apply theme
    applyTheme(newDarkMode);
  };

  const setTheme = (theme) => {
    const darkMode = theme === 'dark';
    setIsDarkMode(darkMode);
    
    // Save preference
    localStorage.setItem('theme', theme);
    localStorage.setItem('darkMode', darkMode.toString());
    
    // Apply theme
    applyTheme(darkMode);
  };

  const value = {
    isDarkMode,
    theme: isDarkMode ? 'dark' : 'light',
    toggleTheme,
    setTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;