import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';

export default function StorageScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <FileUpload />
      <FileList />
    </ScrollView>
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
