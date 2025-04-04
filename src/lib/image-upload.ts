import { supabase } from './supabase';

/**
 * Uploads an image to Supabase Storage
 * @param file The file to upload
 * @returns The public URL of the uploaded image or a data URL if upload fails
 */
export const uploadImage = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    throw new Error('Invalid file type. Please upload an image (JPG, PNG, GIF, or WEBP)');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 5MB');
  }

  try {
    // Try to get a list of available buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      // Fall back to data URL if we can't access storage
      return createDataUrl(file);
    }

    if (!buckets || buckets.length === 0) {
      console.error('No storage buckets available');
      // Fall back to data URL if no buckets are available
      return createDataUrl(file);
    }

    // Use the first available bucket
    const bucketName = buckets[0].name;

    // Generate a unique file name to prevent collisions
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomString}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading to bucket:', uploadError);
      // Fall back to data URL if upload fails
      return createDataUrl(file);
    }

    // Get the public URL
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      console.error('Failed to get public URL');
      // Fall back to data URL if we can't get a public URL
      return createDataUrl(file);
    }

    return data.publicUrl;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    // Fall back to data URL for any other errors
    return createDataUrl(file);
  }
};

/**
 * Creates a data URL from a file
 * @param file The file to convert to a data URL
 * @returns A data URL representing the file
 */
async function createDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to create data URL'));
    reader.readAsDataURL(file);
  });
}

/**
 * Deletes an image from Supabase Storage
 * @param url The public URL of the image to delete
 * @returns True if deletion was successful
 */
export const deleteImage = async (url: string): Promise<boolean> => {
  // If it's a data URL or empty, just return true (nothing to delete)
  if (!url || url.startsWith('data:')) return true;

  try {
    // Extract the file path and bucket from the URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    // Try to find the bucket name and path
    // The URL format is typically /storage/v1/object/public/[bucket-name]/[file-path]
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex === -1 || publicIndex + 1 >= pathParts.length) {
      console.error('Could not parse bucket from URL:', url);
      return false;
    }

    const bucketName = pathParts[publicIndex + 1];
    const filePath = pathParts.slice(publicIndex + 2).join('/');

    if (!bucketName || !filePath) {
      console.error('Invalid bucket or file path:', { bucketName, filePath });
      return false;
    }

    // Delete the file
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Error removing file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};