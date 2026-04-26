import { aesGcmEncrypt, aesGcmDecrypt } from './crypto';

const MAGIC = new Uint8Array([0x56, 0x54]); // 'VT'
const VERSION = 1;

export function capacityBytes(width: number, height: number): number {
  return Math.floor((width * height * 3) / 8) - 6;
}

export async function encodeLSB(
  imageBlob: Blob,
  payload: Uint8Array,
  passphrase?: string
): Promise<Blob> {
  const img = await createImageBitmap(imageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let finalPayload = payload;
  if (passphrase) {
    finalPayload = await aesGcmEncrypt(payload, passphrase);
  }

  const len = finalPayload.length;
  if (len > capacityBytes(canvas.width, canvas.height)) {
    throw new Error('Payload too large for this image');
  }

  const header = new Uint8Array(6);
  header[0] = MAGIC[0];
  header[1] = MAGIC[1];
  header[2] = VERSION;
  header[3] = (len >> 16) & 0xff;
  header[4] = (len >> 8) & 0xff;
  header[5] = len & 0xff;

  const fullData = new Uint8Array(header.length + finalPayload.length);
  fullData.set(header, 0);
  fullData.set(finalPayload, header.length);

  let dataIdx = 0;
  let bitIdx = 0;

  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 === 0) continue; // Skip alpha channel

    if (dataIdx < fullData.length) {
      const bit = (fullData[dataIdx] >> (7 - bitIdx)) & 1;
      data[i] = (data[i] & ~1) | bit;

      bitIdx++;
      if (bitIdx === 8) {
        bitIdx = 0;
        dataIdx++;
      }
    } else {
      break;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });
}

export async function decodeLSB(
  imageBlob: Blob,
  passphrase?: string
): Promise<Uint8Array> {
  const img = await createImageBitmap(imageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const header = new Uint8Array(6);
  let dataIdx = 0;
  let bitIdx = 0;
  let currentByte = 0;

  let i = 0;
  // Read header
  for (; i < data.length && dataIdx < 6; i++) {
    if ((i + 1) % 4 === 0) continue;
    
    currentByte = (currentByte << 1) | (data[i] & 1);
    bitIdx++;
    
    if (bitIdx === 8) {
      header[dataIdx] = currentByte;
      dataIdx++;
      bitIdx = 0;
      currentByte = 0;
    }
  }

  if (header[0] !== MAGIC[0] || header[1] !== MAGIC[1]) {
    throw new Error('No valid steganography signature found');
  }

  const len = (header[3] << 16) | (header[4] << 8) | header[5];
  const payload = new Uint8Array(len);
  dataIdx = 0;

  for (; i < data.length && dataIdx < len; i++) {
    if ((i + 1) % 4 === 0) continue;
    
    currentByte = (currentByte << 1) | (data[i] & 1);
    bitIdx++;
    
    if (bitIdx === 8) {
      payload[dataIdx] = currentByte;
      dataIdx++;
      bitIdx = 0;
      currentByte = 0;
    }
  }

  if (passphrase) {
    return aesGcmDecrypt(payload, passphrase);
  }
  return payload;
}
