export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  url?: string;
  path?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface FileUploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface CloudStorageContextType {
  files: FileItem[];
  uploadFile: (file: File | any) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  downloadFile: (fileId: string) => Promise<void>;
  isLoading: boolean;
  uploadProgress: FileUploadProgress[];
}

export interface FileTransferData {
  files: FileItem[];
  recipientEmail?: string;
  message?: string;
  expiresAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
