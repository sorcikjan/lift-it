'use client';
/** Fotka stroje (C4): zmenší na 800 px a uloží jako JPEG data URL (funguje offline, synchronizuje se s cvikem). */
export async function photoToDataUrl(file: File, max = 800, quality = 0.75): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
