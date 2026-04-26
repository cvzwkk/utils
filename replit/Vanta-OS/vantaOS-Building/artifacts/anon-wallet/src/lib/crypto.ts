export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function aesGcmEncrypt(plain: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plain
  );
  const encrypted = new Uint8Array(encryptedBuf);
  
  const out = new Uint8Array(salt.length + iv.length + encrypted.length);
  out.set(salt, 0);
  out.set(iv, salt.length);
  out.set(encrypted, salt.length + iv.length);
  return out;
}

export async function aesGcmDecrypt(data: Uint8Array, passphrase: string): Promise<Uint8Array> {
  if (data.length < 16 + 12) throw new Error("Invalid ciphertext");
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 16 + 12);
  const encrypted = data.slice(16 + 12);
  
  const key = await deriveKey(passphrase, salt);
  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );
  return new Uint8Array(decryptedBuf);
}
