/**
 * Utility function to handle both Cloudinary and local image URLs
 * @param url The image URL from the backend
 * @returns The complete URL to display the image
 */
export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) {
    return '/images/default-avatar.jpg'; // Default image path
  }

  // Check if it's a Cloudinary URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Check if it's a local asset from the public folder
  if (url.startsWith('/images/')) {
    return url;
  }

  // For legacy URLs that start with /uploads/
  if (url.startsWith('/uploads/')) {
    return `${import.meta.env.VITE_API_URL}${url}`;
  }

  // For relative paths, assume they're from the API
  return `${import.meta.env.VITE_API_URL}${url}`;
}; 