import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const getSystemTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialThemeState = () => {
  if (typeof window === 'undefined') {
    return { theme: 'light', source: 'system' };
  }

  const storedPreference = localStorage.getItem('themePreference');
  if (storedPreference === 'user') {
    const savedTheme = localStorage.getItem('theme') || 'light';
    return { theme: savedTheme, source: 'user' };
  }

  return { theme: getSystemTheme(), source: 'system' };
};

export const ThemeProvider = ({ children }) => {
  const initialState = getInitialThemeState();
  const [theme, setTheme] = useState(initialState.theme);
  const [preferenceSource, setPreferenceSource] = useState(initialState.source);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('themePreference', preferenceSource);
    if (preferenceSource === 'user') {
      localStorage.setItem('theme', theme);
    } else {
      localStorage.removeItem('theme');
    }
  }, [theme, preferenceSource]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (preferenceSource !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      setTheme(event.matches ? 'dark' : 'light');
    };

    // Set current system theme immediately
    setTheme(mediaQuery.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferenceSource]);

  const toggleTheme = () => {
    setPreferenceSource('user');
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    preferenceSource,
    setPreferenceSource,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

