import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCloudStorage } from '../contexts/CloudStorageContext';

const { width } = Dimensions.get('window');

export default function FileList() {
  const { files, deleteFile, downloadFile } = useCloudStorage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString();
  };

  const handleDelete = (fileId: string, fileName: string) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteFile(fileId) },
      ]
    );
  };

  const renderFileItem = ({ item }: { item: any }) => (
    <View style={styles.fileItem}>
      <View style={styles.fileInfo}>
        <View style={styles.fileIconContainer}>
          <Ionicons 
            name={getFileIcon(item.type) as any} 
            size={24} 
            color="#1F2937" 
          />
        </View>
        
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.fileMeta}>
            {formatFileSize(item.size)} • {formatDate(item.uploadedAt)}
          </Text>
        </View>
      </View>

      <View style={styles.fileActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => downloadFile(item.id)}
        >
          <Ionicons name="download-outline" size={20} color="#1F2937" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGridItem = ({ item }: { item: any }) => (
    <View style={styles.gridItem}>
      <View style={styles.gridThumbnail}>
        <View style={styles.gridIconContainer}>
          <Ionicons 
            name={getFileIcon(item.type) as any} 
            size={32} 
            color="#6B7280" 
          />
        </View>
        
        <View style={styles.gridOverlay}>
          <TouchableOpacity style={styles.gridActionButton}>
            <Ionicons name="eye-outline" size={16} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridActionButton}>
            <Ionicons name="download-outline" size={16} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridActionButton}>
            <Ionicons name="share-outline" size={16} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.gridFileInfo}>
        <Text style={styles.gridFileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.gridFileMeta}>
          {formatFileSize(item.size)} • {formatDate(item.uploadedAt)}
        </Text>
      </View>
    </View>
  );

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return 'image-outline';
    if (type.startsWith('video/')) return 'videocam-outline';
    if (type.startsWith('audio/')) return 'musical-notes-outline';
    if (type.includes('pdf')) return 'document-text-outline';
    if (type.includes('word') || type.includes('document')) return 'document-outline';
    if (type.includes('spreadsheet') || type.includes('excel')) return 'grid-outline';
    if (type.includes('presentation') || type.includes('powerpoint')) return 'easel-outline';
    return 'document-outline';
  };

  if (files.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cloud-upload-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No files yet</Text>
        <Text style={styles.emptySubtitle}>Upload your first file to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Your Files</Text>
          <Text style={styles.fileCount}>{files.length} files</Text>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'grid' && styles.toggleButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid-outline" size={20} color={viewMode === 'grid' ? '#1F2937' : '#6B7280'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list-outline" size={20} color={viewMode === 'list' ? '#1F2937' : '#6B7280'} />
          </TouchableOpacity>
        </View>
      </View>
      
      {viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={files}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContainer}
        />
      ) : (
        <FlatList
          key="list"
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  fileCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  gridItem: {
    width: (width - 60) / 2,
    marginBottom: 16,
    marginHorizontal: 5,
  },
  gridThumbnail: {
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gridIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  gridActionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridFileInfo: {
    paddingHorizontal: 4,
  },
  gridFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  gridFileMeta: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
});
