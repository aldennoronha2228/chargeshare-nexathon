/** Reduces charger photos before upload to Firebase Storage or Cloudinary. */
export async function optimizeImageForUpload(file: File): Promise<File> {
  // Small photos are already quick to send; avoid CPU work for these.
  if (file.size <= 150 * 1024) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Preserve support for browser image formats that canvas cannot decode.
    return file;
  }

  const maxDimension = 1080;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('This browser could not optimize the image. Try a JPG or PNG photo.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const toWebp = () => new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Could not optimize the selected image.')),
      'image/webp',
      0.68,
    );
  });

  try {
    let optimized = await toWebp();
    if (optimized.size > 250 * 1024) {
      // A smaller second pass keeps slow mobile connections from sending multi-megabyte photos.
      canvas.width = Math.max(1, Math.round(canvas.width * 0.7));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.7));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      optimized = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Could not optimize the selected image.')),
          'image/webp',
          0.5,
        );
      });
    }

    const extension = optimized.type === 'image/webp'
      ? 'webp'
      : optimized.type === 'image/png'
        ? 'png'
        : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'charger-photo';
    return new File([optimized], `${baseName}.${extension}`, {
      type: optimized.type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
