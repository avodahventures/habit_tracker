import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_NAME_KEY = 'userName';

interface UserProfileContextType {
  name: string;
  setName: (name: string) => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType>({
  name: '',
  setName: async () => {},
});

export const useUserProfile = () => useContext(UserProfileContext);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [name, setNameState] = useState('');

  useEffect(() => {
    loadName();
  }, []);

  const loadName = async () => {
    try {
      const stored = await AsyncStorage.getItem(USER_NAME_KEY);
      if (stored) {
        setNameState(stored);
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const setName = async (newName: string) => {
    try {
      await AsyncStorage.setItem(USER_NAME_KEY, newName);
      setNameState(newName);
    } catch (error) {
      console.error('Error saving user name:', error);
    }
  };

  return (
    <UserProfileContext.Provider value={{ name, setName }}>
      {children}
    </UserProfileContext.Provider>
  );
}
