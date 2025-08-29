import React, { useState } from 'react';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Progress } from './ui/Progress';
import { PageLayout } from './PageLayout';
import { FileUpload } from './FileUpload';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface FileTransferProps {}

export function FileTransfer({}: FileTransferProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [fileMessage, setFileMessage] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !recipientEmail || !senderEmail) return;

    // In a real app, you would send the files and email info to your backend here
    // For now, we'll just simulate the success
    setUploadStatus('success');
  };

  return (
    <PageLayout 
      title="Send large files to your friends"
      subtitle="No registration needed"
      maxWidth="4xl"
    >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Upload Component */}
          <div>
            <FileUpload
              files={files}
              onFilesChange={setFiles}
              maxSize={2 * 1024 * 1024 * 1024} // 2GB max file size
              uploadText="Drag & drop files here or click to browse"
              subtitle="Up to 1GB per file."
              showFileList={true}
              showUploadProgress={false}
            />
          </div>

          {/* Email Form Section */}
          <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recipient Details</h3>
            <p className="text-sm text-gray-600">Who should receive these files?</p>
          </div>
          
          <div className="space-y-6">
            {/* First row: To and File Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700">
                  Recipient Email
                </label>
                <Input
                  type="email"
                  id="recipient-email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full border-1 border-gray-300 rounded-md py-2 px-4 shadow-xs"
                  placeholder="friend@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="file-title" className="block text-sm font-medium text-gray-700">
                  File Title
                </label>
                <Input
                  type="text"
                  id="file-title"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  className="w-full border-1 border-gray-300 rounded-md py-2 px-4 shadow-xs"
                  placeholder="My important files"
                  required
                />
              </div>
            </div>
            
            {/* Message Section */}
            <div className="space-y-2">
              <label htmlFor="file-message" className="block text-sm font-medium text-gray-700">
                Personal Message
              </label>
              <textarea
                id="file-message"
                value={fileMessage}
                onChange={(e) => setFileMessage(e.target.value)}
                className="w-full border-1 border-gray-300 rounded-md py-2 px-4 shadow-xs resize-none"
                placeholder="Add a personal note to your files..."
                rows={3}
              />
            </div>

            {/* Sender Email */}
            <div className="space-y-2">
              <label htmlFor="sender-email" className="block text-sm font-medium text-gray-700">
                Your Email
              </label>
              <Input
                type="email"
                id="sender-email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full border-1 border-gray-300 rounded-md py-2 px-4 shadow-xs"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-green-800 font-medium">Files sent successfully!</p>
              <p className="text-green-700 text-sm">The recipient will receive an email with the download link.</p>
            </div>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-red-800 font-medium">Upload failed</p>
              <p className="text-red-700 text-sm">Please check your connection and try again.</p>
            </div>
          </div>
        )}

        {/* Send Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={files.length === 0 || !recipientEmail || !senderEmail}
            className={`group relative overflow-hidden px-8 py-3 rounded-xl font-medium transition-all duration-300 ${
              files.length === 0 || !recipientEmail || !senderEmail
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span>Send Files</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </Button>
        </div>
    </PageLayout>
  );
} 