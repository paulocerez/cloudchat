import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  isConnected: boolean;
  followers?: number;
}

export default function SocialsScreen() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Mock social platforms data
  const [socialPlatforms] = useState<SocialPlatform[]>([
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'logo-instagram',
      color: '#E4405F',
      description: 'Share photos and stories with your followers',
      isConnected: true,
      followers: 1250
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: 'musical-notes',
      color: '#000000',
      description: 'Create and share short-form videos',
      isConnected: false,
      followers: 0
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: 'logo-youtube',
      color: '#FF0000',
      description: 'Upload and share videos with the world',
      isConnected: false,
      followers: 0
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      description: 'Share thoughts and media in real-time',
      isConnected: false,
      followers: 0
    }
  ]);

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId);
  };

  const handleConnectPlatform = (platform: SocialPlatform) => {
    if (platform.isConnected) {
      Alert.alert(
        'Already Connected',
        `You're already connected to ${platform.name}`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Connect Platform',
      `Connect to ${platform.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: () => console.log('Connecting to:', platform.name) },
      ]
    );
  };

  const handleUploadToSocial = () => {
    if (!selectedPlatform) {
      Alert.alert('Select Platform', 'Please select a social platform first');
      return;
    }

    setUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      setUploading(false);
      const platform = socialPlatforms.find(p => p.id === selectedPlatform);
      Alert.alert(
        'Upload Complete!',
        `Your content has been uploaded to ${platform?.name}`,
        [{ text: 'OK' }]
      );
    }, 3000);
  };

  const renderPlatformCard = (platform: SocialPlatform) => (
    <TouchableOpacity
      key={platform.id}
      style={[
        styles.platformCard,
        selectedPlatform === platform.id && styles.platformCardSelected,
        { borderColor: platform.color }
      ]}
      onPress={() => handlePlatformSelect(platform.id)}
    >
      <View style={styles.platformHeader}>
        <View style={[styles.platformIcon, { backgroundColor: platform.color }]}>
          <Ionicons name={platform.icon as any} size={24} color="#fff" />
        </View>
        <View style={styles.platformInfo}>
          <Text style={styles.platformName}>{platform.name}</Text>
          <Text style={styles.platformDescription}>{platform.description}</Text>
        </View>
        <View style={styles.platformStatus}>
          {platform.isConnected ? (
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => handleConnectPlatform(platform)}
            >
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {platform.isConnected && platform.followers && (
        <View style={styles.followersInfo}>
          <Ionicons name="people-outline" size={16} color="#6B7280" />
          <Text style={styles.followersText}>{platform.followers.toLocaleString()} followers</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social Media</Text>
        <Text style={styles.headerSubtitle}>Share your content directly to social platforms</Text>
      </View>

      {/* Platform Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Platform</Text>
        <View style={styles.platformsContainer}>
          {socialPlatforms.map(renderPlatformCard)}
        </View>
      </View>

      {/* Upload Section */}
      {selectedPlatform && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Content</Text>
          <View style={styles.uploadCard}>
            <View style={styles.uploadPreview}>
              <Ionicons name="image-outline" size={48} color="#6B7280" />
              <Text style={styles.uploadPreviewText}>Content Preview</Text>
              <Text style={styles.uploadPreviewSubtext}>Tap to select media</Text>
            </View>
            
            <TouchableOpacity
              style={styles.selectMediaButton}
              onPress={() => console.log('Select media pressed')}
            >
              <Ionicons name="images-outline" size={20} color="#3B82F6" />
              <Text style={styles.selectMediaText}>Select Media</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upload Button */}
      {selectedPlatform && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUploadToSocial}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Ionicons name="hourglass-outline" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  Upload to {socialPlatforms.find(p => p.id === selectedPlatform)?.name}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Tips Section */}
      <View style={styles.section}>
        <View style={styles.tipsCard}>
          <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
          <View style={styles.tipsText}>
            <Text style={styles.tipsTitle}>Pro Tips</Text>
            <Text style={styles.tipsDescription}>
              • Use high-quality images and videos for better engagement{'\n'}
              • Add relevant hashtags to increase discoverability{'\n'}
              • Post consistently to grow your following{'\n'}
              • Engage with your audience through comments and likes
            </Text>
          </View>
        </View>
      </View>
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
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  platformsContainer: {
    gap: 12,
  },
  platformCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  platformCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  platformDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  platformStatus: {
    alignItems: 'flex-end',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  connectButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  followersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  followersText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  uploadCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  uploadPreviewSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  selectMediaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  uploadButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsText: {
    flex: 1,
    marginLeft: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  tipsDescription: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});
