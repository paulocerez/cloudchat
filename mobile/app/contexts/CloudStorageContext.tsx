import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  url?: string;
}

interface CloudStorageContextType {
  files: FileItem[];
  uploadFile: (file: any) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  downloadFile: (fileId: string) => Promise<void>;
  isLoading: boolean;
}

const CloudStorageContext = createContext<CloudStorageContextType | undefined>(undefined);

export const useCloudStorage = () => {
  const context = useContext(CloudStorageContext);
  if (!context) {
    throw new Error('useCloudStorage must be used within a CloudStorageProvider');
  }
  return context;
};

export default function CloudStorageProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const savedFiles = await SecureStore.getItemAsync('cloudchat_files');
      if (savedFiles) {
        setFiles(JSON.parse(savedFiles));
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const saveFiles = async (newFiles: FileItem[]) => {
    try {
      await SecureStore.setItemAsync('cloudchat_files', JSON.stringify(newFiles));
    } catch (error) {
      console.error('Error saving files:', error);
    }
  };

  const uploadFile = async (file: any) => {
    setIsLoading(true);
    try {
      const newFile: FileItem = {
        id: Date.now().toString(),
        name: file.name || 'Unknown file',
        size: file.size || 0,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date(),
        url: file.uri || file.url,
      };

      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      await saveFiles(updatedFiles);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const updatedFiles = files.filter(file => file.id !== fileId);
      setFiles(updatedFiles);
      await saveFiles(updatedFiles);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const downloadFile = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (file?.url) {
        // For now, just open the file URL
        // In a real app, you'd implement actual download logic
        console.log('Downloading file:', file.name);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const value: CloudStorageContextType = {
    files,
    uploadFile,
    deleteFile,
    downloadFile,
    isLoading,
  };

  return (
    <CloudStorageContext.Provider value={value}>
      {children}
    </CloudStorageContext.Provider>
  );
};
