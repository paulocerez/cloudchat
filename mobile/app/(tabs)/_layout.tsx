import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useClientOnlyValue } from '../../components/useClientOnlyValue';

const CustomTabBarButton = ({ children, onPress, accessibilityState }: any) => {
  const isSelected = accessibilityState?.selected;
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.customTabButton,
        isSelected && styles.customTabButtonActive
      ]}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          height: 90,
          paddingHorizontal: 10,
          paddingBottom: 20,
          paddingTop: 10,
          backgroundColor: '#F3F4F6',
          marginHorizontal: 10,
          borderRadius: 20,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: '#1F2937',
        tabBarInactiveTintColor: '#9CA3AF',
      }}>
      <Tabs.Screen
        name="storage"
        options={{
          title: 'Storage',
          tabBarIcon: ({ color }) => <Ionicons name="folder-open" size={28} color={color} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="received"
        options={{
          title: 'Received',
          tabBarIcon: ({ color }) => <Ionicons name="mail" size={28} color={color} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="spacer"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" size={28} color={color} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="socials"
        options={{
          title: 'Socials',
          tabBarIcon: ({ color }) => <Ionicons name="globe" size={28} color={color} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  customTabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  customTabButtonActive: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 4,
  },
});


