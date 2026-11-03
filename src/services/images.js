// Compresión de fotos en el navegador antes de subirlas a Storage.
// Una foto de celular (3–8 MB) queda en unos 200–500 KB: suficiente para tarjetas y galería.
const MAX_SIDE = 1600;
const QUALITY = 0.82;

// Medidas que caben en un cuadrado de `max` px sin deformar; nunca agranda.
export function fitWithin(width, height, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Devuelve un JPEG reducido, o el archivo original si no se puede decodificar o ya era más liviano.
export async function compressImage(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // un PNG transparente queda con fondo blanco en JPEG, no negro
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.\w+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file; // Storage decidirá si lo acepta (formato y tamaño)
  }
}
