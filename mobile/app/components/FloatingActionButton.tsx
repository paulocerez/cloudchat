import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function FloatingActionButton() {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to a send screen or open a modal
    console.log('FAB pressed - opening send interface');
    // You can implement navigation logic here
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fab} onPress={handlePress} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40, // Position to overlap the tab bar
    left: '50%', // Center horizontally
    transform: [{ translateX: -32 }], // Center the button (half of 64px width)
    alignItems: 'center',
    zIndex: 1000,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
