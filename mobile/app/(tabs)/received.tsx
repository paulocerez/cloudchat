import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReceivedTransfer {
  id: string;
  senderName: string;
  senderEmail: string;
  message: string;
  files: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  totalSize: number;
  expiresAt: Date;
  isExpired: boolean;
  downloadUrl: string;
}

export default function ReceivedScreen() {
  // Mock data for received transfers
  const [receivedTransfers] = useState<ReceivedTransfer[]>([
    {
      id: '1',
      senderName: 'Alice Johnson',
      senderEmail: 'alice.johnson@example.com',
      message: 'Here are the project files we discussed. Let me know if you need anything else!',
      files: [
        { name: 'Project_Overview.pdf', size: 2048576, type: 'application/pdf' },
        { name: 'Design_Mockups.zip', size: 15728640, type: 'application/zip' },
        { name: 'Meeting_Notes.docx', size: 524288, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      ],
      totalSize: 17977344,
      expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
      isExpired: false,
      downloadUrl: 'https://example.com/download/1'
    },
    {
      id: '2',
      senderName: 'Bob Smith',
      senderEmail: 'bob.smith@company.com',
      message: 'Updated contract documents for review',
      files: [
        { name: 'Contract_v2.pdf', size: 1048576, type: 'application/pdf' },
        { name: 'Terms_Sheet.xlsx', size: 262144, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      ],
      totalSize: 1310720,
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      isExpired: true,
      downloadUrl: 'https://example.com/download/2'
    },
    {
      id: '3',
      senderName: 'Carol Davis',
      senderEmail: 'carol.davis@startup.io',
      message: 'Product demo videos and screenshots',
      files: [
        { name: 'Demo_Video.mp4', size: 52428800, type: 'video/mp4' },
        { name: 'Screenshots.zip', size: 8388608, type: 'application/zip' }
      ],
      totalSize: 60817408,
      expiresAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
      isExpired: false,
      downloadUrl: 'https://example.com/download/3'
    }
  ]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatExpiryDate = (date: Date): string => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  const handleDownload = (transfer: ReceivedTransfer) => {
    if (transfer.isExpired) {
      Alert.alert('Transfer Expired', 'This transfer has expired and can no longer be downloaded.');
      return;
    }
    
    Alert.alert(
      'Download Files',
      `Download ${transfer.files.length} file(s) from ${transfer.senderName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => console.log('Downloading transfer:', transfer.id) },
      ]
    );
  };

  const renderTransferItem = ({ item }: { item: ReceivedTransfer }) => (
    <View style={styles.transferCard}>
      <View style={styles.transferHeader}>
        <View style={styles.senderInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#6B7280" />
          </View>
          <View style={styles.senderDetails}>
            <Text style={styles.senderName}>{item.senderName}</Text>
            <Text style={styles.senderEmail}>{item.senderEmail}</Text>
          </View>
        </View>
        <View style={[
          styles.expiryBadge,
          item.isExpired && styles.expiryBadgeExpired
        ]}>
          <Text style={[
            styles.expiryText,
            item.isExpired && styles.expiryTextExpired
          ]}>
            {formatExpiryDate(item.expiresAt)}
          </Text>
        </View>
      </View>

      {item.message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      )}

      <View style={styles.filesContainer}>
        <Text style={styles.filesTitle}>
          {item.files.length} file{item.files.length !== 1 ? 's' : ''} • {formatFileSize(item.totalSize)}
        </Text>
        {item.files.map((file, index) => (
          <View key={index} style={styles.fileItem}>
            <Ionicons 
              name={file.type.startsWith('image/') ? 'image-outline' : 
                    file.type.startsWith('video/') ? 'videocam-outline' :
                    file.type.includes('pdf') ? 'document-text-outline' :
                    'document-outline'} 
              size={20} 
              color="#6B7280" 
            />
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={styles.fileSize}>
              {formatFileSize(file.size)}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.downloadButton,
          item.isExpired && styles.downloadButtonExpired
        ]}
        onPress={() => handleDownload(item)}
        disabled={item.isExpired}
      >
        <Ionicons 
          name={item.isExpired ? "time-outline" : "download-outline"} 
          size={20} 
          color={item.isExpired ? "#9CA3AF" : "#fff"} 
        />
        <Text style={[
          styles.downloadButtonText,
          item.isExpired && styles.downloadButtonTextExpired
        ]}>
          {item.isExpired ? 'Expired' : 'Download All'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Received Files</Text>
        <Text style={styles.headerSubtitle}>
          {receivedTransfers.filter(t => !t.isExpired).length} active transfers
        </Text>
      </View>

      {receivedTransfers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="download-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No received files</Text>
          <Text style={styles.emptySubtitle}>
            Files shared with you will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={receivedTransfers}
          renderItem={renderTransferItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  listContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  transferCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  senderEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  expiryBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiryBadgeExpired: {
    backgroundColor: '#F3F4F6',
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  expiryTextExpired: {
    color: '#6B7280',
  },
  messageContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  filesContainer: {
    marginBottom: 16,
  },
  filesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  downloadButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonExpired: {
    backgroundColor: '#F3F4F6',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  downloadButtonTextExpired: {
    color: '#9CA3AF',
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
