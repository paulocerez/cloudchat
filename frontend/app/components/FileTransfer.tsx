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
    >
            {/* File Upload Component */}
      <FileUpload
        files={files}
        onFilesChange={setFiles}
        maxSize={2 * 1024 * 1024 * 1024} // 2GB max file size
        uploadText="Drag & drop files here or click to browse"
        subtitle="Up to 1GB per file."
        showFileList={true}
        showUploadProgress={false}
      />

      {/* Email Inputs */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <div className="flex-1">
          <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700 mb-2">
            To
          </label>
          <Input
            type="email"
            id="recipient-email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full border-1 border-gray-300 rounded-md py-2 px-4 shadow-xs"
            placeholder="Enter recipient's email address"
            required
          />
        </div>
        <div className="flex-1">
          <label htmlFor="sender-email" className="block text-sm font-medium text-gray-700 mb-2">
            From
          </label>
          <Input
            type="email"
            id="sender-email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            className="w-full border-1 border-gray-300 rounded-md py-2 px-4 shadow-xs"
            placeholder="Enter your email address"
            required
          />
        </div>
      </div>

      {/* Status Messages */}
      {uploadStatus === 'success' && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 font-medium">
            Files sent successfully! The recipient will receive an email with the download link.
          </p>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800 font-medium">
            Upload failed. Please try again.
          </p>
        </div>
      )}

      {/* Send Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={files.length === 0 || !recipientEmail || !senderEmail}
          variant="outline"
          size="lg"
          className={`group border-1 shadow-xs font-medium px-4 transition-all duration-200 ${
            files.length === 0 || !recipientEmail || !senderEmail
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm">Send files</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </Button>
      </div>
    </PageLayout>
  );
} 