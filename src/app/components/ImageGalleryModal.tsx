'use client';

import { useState, useEffect } from 'react';

interface ImageInfo {
  name: string;
  url: string;
  size: number;
  modified: string;
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function ImageGalleryModal({ isOpen, onClose, isDark }: ImageGalleryModalProps) {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>('');

  useEffect(() => {
    if (isOpen && !selectedImage) {
      loadImages();
    }
  }, [isOpen, selectedImage, targetUserId]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const url = targetUserId ? `/api/images?targetUserId=${targetUserId}` : '/api/images';
      const res = await fetch(url);
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
        if (data.isAdmin && !isAdmin) {
          setIsAdmin(true);
          // Fetch users for dropdown
          const usersRes = await fetch('/api/admin/users');
          const usersData = await usersRes.json();
          if (usersData.users) {
            setUsers(usersData.users);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch images:", err);
    }
    setLoading(false);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
    setDeleting(true);
    try {
      const url = targetUserId 
        ? `/api/images?filename=${encodeURIComponent(filename)}&targetUserId=${targetUserId}`
        : `/api/images?filename=${encodeURIComponent(filename)}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        setImages(prev => prev.filter(img => img.name !== filename));
        if (selectedImage?.name === filename) {
          setSelectedImage(null);
        }
      } else {
        alert('Failed to delete image');
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
      alert('Failed to delete image');
    }
    setDeleting(false);
  };

  const handleDownload = (image: ImageInfo) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg w-full max-w-6xl h-[90vh] flex flex-col`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {selectedImage ? selectedImage.name : 'Generated Images Gallery'}
            </h3>
            {isAdmin && !selectedImage && (
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className={`text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
              >
                <option value="">My Images</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={() => selectedImage ? setSelectedImage(null) : onClose()} className={`${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedImage ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name} 
                className={`max-w-full max-h-[70vh] object-contain rounded border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => handleDownload(selectedImage)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button 
                  onClick={() => handleDelete(selectedImage.name)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded flex items-center gap-2 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              <div className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <p>Size: {formatSize(selectedImage.size)}</p>
                <p>Modified: {formatDate(selectedImage.modified)}</p>
              </div>
            </div>
          ) : loading ? (
            <div className={`text-center text-sm py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading images...</div>
          ) : images.length === 0 ? (
            <div className={`text-center text-sm py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No images found in /public/images</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map(img => (
                <div 
                  key={img.name} 
                  className={`group relative aspect-square rounded border overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}
                  onClick={() => setSelectedImage(img)}
                >
                  <img 
                    src={img.url} 
                    alt={img.name} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">View</span>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 p-1 ${isDark ? 'bg-black/70' : 'bg-white/80'}`}>
                    <p className={`text-[10px] truncate px-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{img.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
