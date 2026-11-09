import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/context/ThemeContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { UserProfileProvider } from './src/context/UserProfileContext';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { AppNavigator } from './src/navigation/AppNavigator';
import { db } from './src/database/database';
import { getReminderHours } from './src/utils/reminderSettings';
import { scheduleHabitReminders } from './src/utils/pushNotifications';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await db.init();

      // Check onboarding status
      const onboardingComplete = await AsyncStorage.getItem('hasCompletedOnboarding');
      setHasCompletedOnboarding(onboardingComplete === 'true');

      // Re-arm habit reminder notifications for returning users
      if (onboardingComplete === 'true') {
        const hours = await getReminderHours();
        scheduleHabitReminders(hours);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);

      const hours = await getReminderHours();
      scheduleHabitReminders(hours);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <PremiumProvider>
        <UserProfileProvider>
          {hasCompletedOnboarding ? (
            <AppNavigator />
          ) : (
            <OnboardingNavigator onComplete={handleOnboardingComplete} />
          )}
        </UserProfileProvider>
      </PremiumProvider>
    </ThemeProvider>
  );
}