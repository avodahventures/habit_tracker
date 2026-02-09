import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HabitTrackerScreen } from '../screens/HabitTrackerScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  const { currentTheme } = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: currentTheme.colors[1], // Use theme background
            borderTopColor: currentTheme.cardBorder, // Use theme border
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarActiveTintColor: currentTheme.accent, // Use theme accent
          tabBarInactiveTintColor: currentTheme.textSecondary, // Use theme text
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen 
          name="Habits" 
          component={HabitTrackerScreen}
          options={{
            tabBarLabel: 'Habits',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>✅</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>📊</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Journal" 
          component={JournalScreen}
          options={{
            tabBarLabel: 'Journal',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>📖</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>⚙️</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}