/**
 * Utility function to handle image URLs
 * @param url The image URL from the backend
 * @returns The complete URL to display the image
 */
export const getImageUrl = (url: string | null | undefined): string => {
  if (!url || url === 'null' || url === 'undefined') {
    return '/images/default-event.png';
  }

  // Check if it's already a complete URL (Cloudinary)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Validate Cloudinary URL format
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url;
    }
  }

  // For local assets in the public folder
  if (url.startsWith('/images/')) {
    return url;
  }

  // If we get here, something is wrong - return default image
  console.warn('Invalid image URL format:', url);
  return '/images/default-event.png';
};

/**
 * Utility function to extract the image URL from a backend response
 * @param response The response from the backend image upload
 * @returns The image URL to use
 */
export const getImageUrlFromResponse = (response: any): string => {
  // Log the response for debugging
  console.log('Processing upload response:', response);

  // Direct URL from response
  if (typeof response === 'string' && response.includes('cloudinary.com')) {
    return response;
  }

  // Handle Cloudinary response format
  if (response && typeof response === 'object') {
    // Direct URL property
    if (response.url && response.url.includes('cloudinary.com')) {
      return response.url;
    }

    // Nested response from backend
    if (response.data && typeof response.data === 'object') {
      if (response.data.url && response.data.url.includes('cloudinary.com')) {
        return response.data.url;
      }
      if (response.data.secure_url && response.data.secure_url.includes('cloudinary.com')) {
        return response.data.secure_url;
      }
    }

    // Direct secure_url property
    if (response.secure_url && response.secure_url.includes('cloudinary.com')) {
      return response.secure_url;
    }
  }

  // If no valid Cloudinary URL found, log and return default
  console.warn('No valid Cloudinary URL in upload response:', response);
  return '/images/default-event.png';
}; 