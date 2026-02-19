import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HabitTrackerScreen } from '../screens/HabitTrackerScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { currentTheme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: currentTheme.colors[1],
          borderTopColor: currentTheme.cardBorder,
        },
        tabBarActiveTintColor: currentTheme.accent,
        tabBarInactiveTintColor: currentTheme.textSecondary,
      }}
    >
      <Tab.Screen
        name="Habits"
        component={HabitTrackerScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>✅</Text>,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen 
          name="Payment" 
          component={PaymentScreen}
          options={{
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}