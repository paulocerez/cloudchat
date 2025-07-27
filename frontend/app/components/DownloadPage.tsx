import React, { useState } from 'react';
import { Download, File, Calendar, User, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { PageLayout } from './PageLayout';

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

interface DownloadPageProps {
  transferId?: string;
  senderName?: string;
  senderEmail?: string;
  message?: string;
  files?: FileInfo[];
  expiresAt?: Date;
}

export function DownloadPage({
  transferId = 'abc123',
  senderName = 'John Doe',
  senderEmail = 'john@example.com',
  message = 'Here are the files you requested.',
  files = [
    { name: 'document.pdf', size: 2048576, type: 'application/pdf' },
    { name: 'image.jpg', size: 1048576, type: 'image/jpeg' },
  ],
  expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
}: DownloadPageProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDownload = (fileName: string) => {
    setDownloading(fileName);
    // Simulate download
    setTimeout(() => {
      setDownloading(null);
    }, 2000);
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <PageLayout 
      title="Files ready to download"
      subtitle="Someone has shared files with you"
    >
          {/* Sender Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm">{senderName}</h3>
              <p className="text-xs text-gray-500">{senderEmail}</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-700 text-sm">{message}</p>
            </div>
          )}

          {/* Files List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-normal text-gray-900">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </h3>
              <span className="text-xs text-gray-500">
                {formatFileSize(totalSize)}
              </span>
            </div>
            
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-6 w-6 text-gray-400" />
                    <div>
                      <p className="font-normal text-gray-900 text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(file.name)}
                    disabled={downloading === file.name}
                    className={`px-3 py-1.5 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors text-sm ${
                      downloading === file.name
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {downloading === file.name ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" />
                        <span>Downloading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Download All Button */}
          <div className="flex justify-end">
            <button
              onClick={() => handleDownload('all')}
              disabled={downloading !== null}
              className={`inline-flex items-center space-x-2 py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors text-sm ${
                downloading !== null
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {downloading === 'all' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                  <span>Downloading all ...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download all</span>
                </>
              )}
            </button>
          </div>

          {/* Transfer Info */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <Calendar className="h-3 w-3" />
                <span>Expires {formatDate(expiresAt)}</span>
              </div>
              <span>Transfer ID: {transferId}</span>
            </div>
    </PageLayout>
  );
} 