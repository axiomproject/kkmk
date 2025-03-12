import React, { createContext, useState, useContext, useEffect } from 'react';

interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const adjustColor = (color: string, amount: number) => {
  const clamp = (num: number) => Math.min(255, Math.max(0, num));
  
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const num = parseInt(hex, 16);
    const r = clamp(((num >> 16) & 255) + amount);
    const g = clamp(((num >> 8) & 255) + amount);
    const b = clamp((num & 255) + amount);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  return color;
};

const getBackgroundColor = (primaryColor: string) => {
  const themeMap: { [key: string]: string } = {
    '#4CAF50': '#f0f7f0', // Green
    '#2196F3': '#f0f4f8', // Blue
    '#9C27B0': '#f6f0f8', // Purple
    '#FF9800': '#fff7eb', // Orange
    '#f44336': '#fff0f0', // Red
    '#009688': '#e6f7f7', // Teal
  };
  return themeMap[primaryColor] || '#f8f9fa';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColor] = useState('#4CAF50');
  const [secondaryColor, setSecondaryColor] = useState('#2c5282');

  useEffect(() => {
    // Load saved theme colors from localStorage
    const savedPrimary = localStorage.getItem('primaryColor');
    const savedSecondary = localStorage.getItem('secondaryColor');
    
    if (savedPrimary) setPrimaryColor(savedPrimary);
    if (savedSecondary) setSecondaryColor(savedSecondary);
    
    // Update CSS variables
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
    
    // Calculate and set hover colors (slightly darker)
    const primaryHover = adjustColor(primaryColor, -20);
    const secondaryHover = adjustColor(secondaryColor, -20);
    document.documentElement.style.setProperty('--primary-hover', primaryHover);
    document.documentElement.style.setProperty('--secondary-hover', secondaryHover);
    
    // Update background colors
    const backgroundColor = getBackgroundColor(primaryColor);
    document.documentElement.style.setProperty('--background-light', backgroundColor);
  }, [primaryColor, secondaryColor]);

  return (
    <ThemeContext.Provider value={{ 
      primaryColor, 
      setPrimaryColor: (color: string) => {
        setPrimaryColor(color);
        localStorage.setItem('primaryColor', color);
      },
      secondaryColor, 
      setSecondaryColor: (color: string) => {
        setSecondaryColor(color);
        localStorage.setItem('secondaryColor', color);
      }
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
