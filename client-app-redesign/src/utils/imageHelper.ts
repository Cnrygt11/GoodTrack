/**
 * Resizes and compresses an image file using Canvas.
 * Returns a Promise that resolves to a compressed base64 data URL (image/jpeg, quality 0.7).
 * Max width and height are constrained to 800px.
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio and bounds
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original image read if canvas context fails
          resolve(event.target?.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas content to compressed base64 JPEG format
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => {
        reject(new Error('Resim yüklenirken hata oluştu: ' + err));
      };
    };
    reader.onerror = (err) => {
      reject(new Error('Dosya okunurken hata oluştu: ' + err));
    };
  });
}

/**
 * Liste/kartlarda gösterilmek üzere küçük bir thumbnail (varsayılan ~160px, kalite 0.6) üretir.
 * Tam görselden ayrı olarak saklanır; liste yükünü büyük ölçüde azaltır (~10KB).
 */
export function makeThumbnail(file: File, size = 160): Promise<string> {
  return compressImage(file, size, size, 0.6);
}
