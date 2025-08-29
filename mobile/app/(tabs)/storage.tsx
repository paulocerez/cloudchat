import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';

export default function StorageScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cloud Storage</Text>
        <Text style={styles.headerSubtitle}>Manage and organize your files</Text>
      </View>
      <FileUpload />
      <FileList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
});
