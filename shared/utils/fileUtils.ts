import { FileItem } from '../types';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getFileIcon = (type: string): string => {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type.includes('pdf')) return 'pdf';
  if (type.includes('word') || type.includes('document')) return 'document';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'spreadsheet';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'presentation';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'archive';
  if (type.includes('text') || type.includes('plain')) return 'text';
  return 'file';
};

export const getFileTypeCategory = (type: string): string => {
  if (type.startsWith('image/')) return 'Images';
  if (type.startsWith('video/')) return 'Videos';
  if (type.startsWith('audio/')) return 'Audio';
  if (type.includes('pdf')) return 'Documents';
  if (type.includes('word') || type.includes('document')) return 'Documents';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'Spreadsheets';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'Presentations';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'Archives';
  if (type.includes('text') || type.includes('plain')) return 'Text Files';
  return 'Other Files';
};

export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -1));
    }
    return file.type === type;
  });
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

export const groupFilesByType = (files: FileItem[]): Record<string, FileItem[]> => {
  return files.reduce((groups, file) => {
    const category = getFileTypeCategory(file.type);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(file);
    return groups;
  }, {} as Record<string, FileItem[]>);
};
