import React, { useState, useRef } from 'react';
import { Camera, X, Upload, Loader2 } from 'lucide-react';
import { uploadImage } from '../../lib/image-upload';
import { useToast } from './toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onFileSelected?: (file: File) => void;
  onError?: (error: string) => void;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  className?: string;
}

export function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onFileSelected,
  onError,
  size = 'md',
  shape = 'circle',
  className = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  // Size classes
  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  // Shape classes
  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-lg',
  };

  // Button size classes
  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  // Icon size classes
  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Show preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      setIsUploading(true);

      // Instead of uploading directly, just pass the file to the parent component
      // This allows the parent to handle the actual upload during form submission
      // and avoids duplicate uploads
      onImageUploaded(objectUrl);

      // Store the file in the parent component
      if (onFileSelected) {
        onFileSelected(file);
      }

      // Show success message
      addToast('Image selected successfully', 'success');
    } catch (error: any) {
      console.error('Error processing image:', error);

      // Clear preview
      setPreviewUrl(null);

      // Call error callback if provided
      if (onError) {
        onError(error.message || 'Failed to process image');
      }

      // Show error message
      addToast(error.message || 'Failed to process image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearImage = () => {
    setPreviewUrl(null);
    onImageUploaded('');
  };

  // Determine which image URL to display
  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClasses[size]} ${shapeClasses[shape]} overflow-hidden bg-gray-100 flex items-center justify-center`}>
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <Upload className={`${iconSizeClasses[size]} text-gray-400`} />
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Loader2 className={`${iconSizeClasses[size]} text-white animate-spin`} />
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`absolute bottom-0 right-0 bg-[#CC7357] text-white ${buttonSizeClasses[size]} rounded-full cursor-pointer hover:bg-[#B66347] transition-colors`}
      >
        <Camera className={iconSizeClasses[size]} />
      </button>

      {/* Clear button - only show if there's an image */}
      {displayUrl && (
        <button
          type="button"
          onClick={handleClearImage}
          disabled={isUploading}
          className={`absolute top-0 right-0 bg-red-500 text-white ${buttonSizeClasses[size]} rounded-full cursor-pointer hover:bg-red-600 transition-colors`}
        >
          <X className={iconSizeClasses[size]} />
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </div>
  );
}