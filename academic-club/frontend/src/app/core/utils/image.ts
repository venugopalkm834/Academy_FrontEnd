// Phone cameras produce big photos: shrink to a JPEG that fits the 2 MB upload limit.
export async function shrinkImage(file: File, max = 900): Promise<Blob> {
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { throw { error: { message: 'Could not read this photo. Please use a JPG or PNG image.' } }; }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej({ error: { message: 'Could not process the photo.' } })), 'image/jpeg', 0.85));
}
