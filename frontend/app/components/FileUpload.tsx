import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface FileUploadProps {
  onFilesChange?: (files: FileWithPreview[]) => void;
  onUploadComplete?: (uploadedFiles: FileWithPreview[]) => void;
  files?: FileWithPreview[];
  maxSize?: number;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  className?: string;
  uploadText?: string;
  subtitle?: string;
  showFileList?: boolean;
  autoUpload?: boolean;
  showUploadProgress?: boolean;
}

export function FileUpload({
  onFilesChange,
  onUploadComplete,
  files: externalFiles,
  maxSize = 2 * 1024 * 1024 * 1024, // 2GB default
  accept,
  multiple = true,
  className = '',
  uploadText = "Drag & drop files here or click to browse",
  subtitle = "Up to 1GB per file.",
  showFileList = true,
  autoUpload = false,
  showUploadProgress = true
}: FileUploadProps) {
  const [internalFiles, setInternalFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  // Use external files if provided, otherwise use internal state
  const files = externalFiles || internalFiles;
  const setFiles = onFilesChange || setInternalFiles;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    
    if (multiple) {
      setFiles([...files, ...newFiles]);
    } else {
      // Clear existing files if not multiple
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      setFiles(newFiles);
    }

    // Auto upload if enabled
    if (autoUpload) {
      handleUpload(newFiles);
    }
  }, [files, multiple, setFiles, autoUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    maxSize,
    accept
  });

  const handleUpload = async (filesToUpload: FileWithPreview[]) => {
    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploadStatus('success');
            setIsUploading(false);
            
            // Call onUploadComplete callback
            if (onUploadComplete) {
              onUploadComplete(filesToUpload);
            }
            
            // Clear files after successful upload
            if (!externalFiles) {
              setInternalFiles([]);
            }
            
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // In a real app, you would upload files to your backend here
      // For now, we'll just simulate the upload
    } catch (error) {
      setUploadStatus('error');
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    setFiles(files.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className={className}>
      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`p-12 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-gray-400 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-6 w-6 text-gray-400 mb-6" />
        {isDragActive ? (
          <p className="text-gray-700 font-medium text-lg">Drop files here</p>
        ) : (
          <div>
            <p className="text-gray-700 font-medium text-md">
              {uploadText}
            </p>
            <p className="text-gray-500 text-sm">
              {subtitle}
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {showFileList && files.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-normal text-gray-900">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </h3>
            <span className="text-sm text-gray-500">
              {formatFileSize(totalSize)}
            </span>
          </div>
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-4">
                  <File className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {!autoUpload && files.length > 0 && !isUploading && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => handleUpload(files)}
            disabled={isUploading}
            className="bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 border border-gray-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload {files.length} file{files.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {showUploadProgress && isUploading && (
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Uploading files...</span>
            <span className="text-gray-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadStatus === 'success' && (
        <div className="mt-6 flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 font-medium">
            Files uploaded successfully!
          </p>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="mt-6 flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800 font-medium">
            Upload failed. Please try again.
          </p>
        </div>
      )}
    </div>
  );
} 