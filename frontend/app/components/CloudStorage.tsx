import React, { useState } from 'react';
import { 
  Folder, 
  Image, 
  Video, 
  File, 
  Grid3X3, 
  List, 
  Search, 
  MoreVertical, 
  Download, 
  Trash2, 
  Share2,
  Eye,
  Calendar,
  HardDrive,
  Plus,
  Star
} from 'lucide-react';
import { PageLayout } from './PageLayout';
import { FileUpload } from './FileUpload';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video';
  size: number;
  url: string;
  thumbnail?: string;
  uploadedAt: Date;
  isStarred: boolean;
  tags: string[];
}

interface CloudStorageProps {}

export function CloudStorage({}: CloudStorageProps) {
  const [files, setFiles] = useState<MediaFile[]>([
    {
      id: '1',
      name: 'sunset_beach.jpg',
      type: 'image',
      size: 2048576,
      url: '/api/files/1',
      thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop',
      uploadedAt: new Date('2024-01-15'),
      isStarred: true,
      tags: ['nature', 'beach']
    },
    {
      id: '2',
      name: 'mountain_hike.mp4',
      type: 'video',
      size: 15728640,
      url: '/api/files/2',
      thumbnail: 'https://images.unsplash.com/photo-1464822759844-d150baec0134?w=300&h=200&fit=crop',
      uploadedAt: new Date('2024-01-14'),
      isStarred: false,
      tags: ['adventure', 'outdoors']
    },
    {
      id: '3',
      name: 'city_lights.jpg',
      type: 'image',
      size: 3145728,
      url: '/api/files/3',
      thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=300&h=200&fit=crop',
      uploadedAt: new Date('2024-01-13'),
      isStarred: true,
      tags: ['urban', 'night']
    },
    {
      id: '4',
      name: 'forest_walk.mp4',
      type: 'video',
      size: 20971520,
      url: '/api/files/4',
      thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=200&fit=crop',
      uploadedAt: new Date('2024-01-12'),
      isStarred: false,
      tags: ['nature', 'forest']
    }
  ]);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleUploadComplete = (uploadedFiles: FileWithPreview[]) => {
    // Add new files to the list
    const newFiles = uploadedFiles.map((file, index) => ({
      id: Date.now().toString() + index,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'video' as 'image' | 'video',
      size: file.size,
      url: URL.createObjectURL(file),
      thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploadedAt: new Date(),
      isStarred: false,
      tags: []
    }));
    
    setFiles(prev => [...newFiles, ...prev]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const toggleStar = (fileId: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, isStarred: !file.isStarred } : file
    ));
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const usedSpace = formatFileSize(totalSize);

  return (
    <PageLayout 
      title="Cloud Storage"
      subtitle="Store and organize your memories"
      maxWidth="4xl"
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg">
            <HardDrive className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">{usedSpace} used</span>
          </div>
          <button className="bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 border border-gray-200 transition-colors text-sm">
            <Plus className="h-4 w-4 inline mr-2" />
            Upload
          </button>
        </div>

        {/* Search and View Controls */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files and tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
            />
          </div>
          <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

        {/* Upload Area */}
        <FileUpload
          onUploadComplete={handleUploadComplete}
          accept={{
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
            'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
          }}
          uploadText="Drag & drop images and videos here"
          subtitle="Supports JPG, PNG, GIF, MP4, MOV and more"
          showFileList={false}
          className="mb-8"
        />

        {/* Files Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer ${
                  selectedFiles.includes(file.id) ? 'ring-2 ring-gray-500' : ''
                }`}
                onClick={() => toggleFileSelection(file.id)}
              >
                {/* Thumbnail */}
                <div className="aspect-square relative overflow-hidden">
                  {file.thumbnail ? (
                    <img
                      src={file.thumbnail}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      {file.type === 'image' ? (
                        <Image className="h-12 w-12 text-gray-400" />
                      ) : (
                        <Video className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                      <button className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors">
                        <Eye className="h-4 w-4 text-gray-700" />
                      </button>
                      <button className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors">
                        <Download className="h-4 w-4 text-gray-700" />
                      </button>
                      <button className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors">
                        <Share2 className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </div>

                  {/* Star Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(file.id);
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${
                      file.isStarred 
                        ? 'bg-yellow-400 text-yellow-900' 
                        : 'bg-white/80 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${file.isStarred ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* File Info */}
                <div className="p-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-normal text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                      </p>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Tags */}
                  {file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {file.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {file.tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{file.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`group bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer ${
                  selectedFiles.includes(file.id) ? 'ring-2 ring-gray-500' : ''
                }`}
                onClick={() => toggleFileSelection(file.id)}
              >
                <div className="flex items-center space-x-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {file.thumbnail ? (
                      <img
                        src={file.thumbnail}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        {file.type === 'image' ? (
                          <Image className="h-6 w-6 text-gray-400" />
                        ) : (
                          <Video className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-normal text-gray-900 truncate">
                        {file.name}
                      </p>
                      {file.isStarred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                    </p>
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredFiles.length === 0 && (
          <div className="text-center py-16">
            <Folder className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms' : 'Upload your first image or video to get started'}
            </p>
          </div>
        )}
    </PageLayout>
  );
} 