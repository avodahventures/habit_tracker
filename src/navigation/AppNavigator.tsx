import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HabitTrackerScreen } from '../screens/HabitTrackerScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DebugScreen } from '../screens/DebugScreen'; // Add this

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1E3A5F',
            borderTopColor: '#3D5A7F',
          },
          tabBarActiveTintColor: '#60A5FA',
          tabBarInactiveTintColor: '#94A3B8',
        }}
      >
        <Tab.Screen 
          name="Habits" 
          component={HabitTrackerScreen}
          options={{
            tabBarLabel: 'Habits',
          }}
        />
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
          }}
        />
        <Tab.Screen 
          name="Journal" 
          component={JournalScreen}
          options={{
            tabBarLabel: 'Journal',
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
          }}
        />
        <Tab.Screen 
          name="Debug" 
          component={DebugScreen}
          options={{
            tabBarLabel: 'Debug',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}