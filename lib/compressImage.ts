// Browser-side image compression (no library needed).
// Resizes the longest side to maxSize and converts to WebP.
export async function compressImage(
  file: File,
  maxSize = 1280,
  quality = 0.75
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image compress nahi ho payi."))),
      "image/webp",
      quality
    )
  );

  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
    type: "image/webp",
  });
}