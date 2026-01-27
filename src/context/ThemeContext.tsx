import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, ThemeType, Theme } from '../utils/themes';

interface ThemeContextType {
  currentTheme: Theme;
  themeType: ThemeType;
  setTheme: (theme: ThemeType) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeType, setThemeType] = useState<ThemeType>('nightSky');
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes.nightSky);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme && (savedTheme === 'nightSky' || savedTheme === 'amberGold' || savedTheme === 'pureBlack')) {
        setThemeType(savedTheme as ThemeType);
        setCurrentTheme(themes[savedTheme as ThemeType]);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setTheme = async (theme: ThemeType) => {
    try {
      await AsyncStorage.setItem('appTheme', theme);
      setThemeType(theme);
      setCurrentTheme(themes[theme]);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, themeType, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}