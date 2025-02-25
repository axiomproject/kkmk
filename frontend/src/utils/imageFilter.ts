interface ImageAnalysis {
  isExplicit: boolean;
  reason?: string;
}

export async function analyzeImage(file: File): Promise<ImageAnalysis> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Create canvas to analyze image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve({ isExplicit: false });
        return;
      }

      // Draw image on canvas
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Analyze skin tone pixels
      let skinTonePixels = 0;
      let totalPixels = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check for skin-tone like colors
        if (
          r > 60 && r < 255 &&
          g > 40 && g < 200 &&
          b > 20 && b < 180 &&
          Math.abs(r - g) > 15 &&
          r > g && 
          r > b
        ) {
          skinTonePixels++;
        }
      }

      // Calculate skin tone percentage
      const skinTonePercentage = (skinTonePixels / totalPixels) * 100;

      // Clean up
      URL.revokeObjectURL(objectUrl);
      canvas.remove();

      // Check conditions
      const isExplicit = skinTonePercentage > 30;

      resolve({
        isExplicit,
        reason: isExplicit ? 'Image contains potentially inappropriate content' : undefined
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ isExplicit: false });
    };

    img.src = objectUrl;
  });
}
