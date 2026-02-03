import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PremiumContextType {
  isPremium: boolean;
  setPremium: (status: boolean) => void;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  setPremium: () => {},
});

export const usePremium = () => useContext(PremiumContext);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('isPremium');
      if (status === 'true') {
        setIsPremium(true);
      }
    } catch (error) {
      console.error('Error loading premium status:', error);
    }
  };

  const setPremium = async (status: boolean) => {
    try {
      await AsyncStorage.setItem('isPremium', status.toString());
      setIsPremium(status);
    } catch (error) {
      console.error('Error saving premium status:', error);
    }
  };

  return (
    <PremiumContext.Provider value={{ isPremium, setPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}