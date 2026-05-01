import { Tabs } from 'expo-router';
import React from 'react';
import { BlurView } from 'expo-blur';
import { Home, FolderOpen, Wrench, BookOpen, Bot } from 'lucide-react-native';
import { StyleSheet, View, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#2563EB', // Elegant Blue
        tabBarInactiveTintColor: '#94A3B8', // Slate
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />
          )
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => <FolderOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size }) => <Bot size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, size }) => <Wrench size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="standards"
        options={{
          title: 'Standards',
          tabBarIcon: ({ color, size }) => <BookOpen size={24} color={color} />,
        }}
      />
      {/* Hidden legacy routes */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 0,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#FFFFFF',
    height: 90,
    paddingBottom: 30,
    paddingTop: 10,
  }
});
