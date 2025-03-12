import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/ThemeSelector.css';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const colorPresets = [
  { name: 'Green', primary: '#4CAF50', secondary: '#2c5282' },
  { name: 'Blue', primary: '#2196F3', secondary: '#1a365d' },
  { name: 'Purple', primary: '#9C27B0', secondary: '#4a235a' },
  { name: 'Orange', primary: '#FF9800', secondary: '#c66900' },
  { name: 'Red', primary: '#f44336', secondary: '#ba000d' },
  { name: 'Teal', primary: '#009688', secondary: '#00695c' },
];

export const ThemeSelector: React.FC = () => {
  const { primaryColor, setPrimaryColor, setSecondaryColor } = useTheme();
  const [startIndex, setStartIndex] = useState(0);
  
  // Number of presets to show at once
  const presetsToShow = 3;
  
  const handleThemeChange = (primary: string, secondary: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
  };
  
  const handlePrevious = () => {
    setStartIndex((prev) => 
      prev === 0 ? Math.max(0, colorPresets.length - presetsToShow) : Math.max(0, prev - presetsToShow)
    );
  };
  
  const handleNext = () => {
    setStartIndex((prev) => 
      prev + presetsToShow >= colorPresets.length ? 0 : prev + presetsToShow
    );
  };

  // Get visible presets based on current startIndex
  const visiblePresets = colorPresets.slice(startIndex, startIndex + presetsToShow);

  return (
    <div className="theme-selector">
      <h3>Choose Theme</h3>
      <div className="color-presets-container">
        <button 
          className="arrow-button prev-button" 
          onClick={handlePrevious}
          aria-label="Previous themes"
        >
          <FiChevronLeft size={24} />
        </button>
        
        <div className="color-presets">
          {visiblePresets.map((preset) => (
            <button
              key={preset.name}
              className={`color-preset ${
                preset.primary === primaryColor ? 'active' : ''
              }`}
              onClick={() => handleThemeChange(preset.primary, preset.secondary)}
              style={{
                '--primary': preset.primary,
                '--secondary': preset.secondary,
              } as React.CSSProperties}
            >
              <div className="color-preview">
                <span className="primary-color"></span>
                <span className="secondary-color"></span>
              </div>
              <span className="preset-name">{preset.name}</span>
            </button>
          ))}
        </div>
        
        <button 
          className="arrow-button next-button" 
          onClick={handleNext}
          aria-label="Next themes"
        >
          <FiChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
