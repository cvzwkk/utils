# ATTENTION NOT WORKING PROPERLY! NEEDS BE FIXED, USE IT AS SAMPLE BASE

!pip install -q cryptography opencv-python-headless numpy pillow reedsolo

import os, hashlib, base64, zlib
import numpy as np
import cv2
from PIL import Image
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from IPython.display import display, Image as IPythonImage
from reedsolo import RSCodec

KEY_PATH = "/content/key.enc"
RS_PARITY = 16  # minimal RS parity → correct small errors
rs = RSCodec(RS_PARITY)

# ──────────────────────────────
# Crypto engine
# ──────────────────────────────
class GrokPermuteCrypto:
    def __init__(self, master_key: bytes):
        hkdf = HKDF(algorithm=hashes.SHA512(), length=96,
                    salt=b'grok_stego_salt_v2', info=b'post_quantum_derive')
        derived = hkdf.derive(master_key)
        self.chacha_key     = derived[:32]
        self.permute_key    = derived[32:64]
        self.negentropy_key = derived[64:]
        self.chacha = ChaCha20Poly1305(self.chacha_key)

    def _grok_permute(self, data: bytearray, reverse=False) -> bytearray:
        length = len(data)
        indices = list(range(length))
        seed = hashlib.sha512(self.permute_key + length.to_bytes(8, 'big')).digest()
        while len(seed) < length*4: seed += hashlib.sha512(seed).digest()
        for i in range(length-1,0,-1):
            j = int.from_bytes(seed[i*4:(i*4)+4],'big') % (i+1)
            indices[i], indices[j] = indices[j], indices[i]
        result = bytearray(length)
        if not reverse:
            for i,val in enumerate(data): result[indices[i]] = val
        else:
            inv = [0]*length
            for i,pos in enumerate(indices): inv[pos]=i
            for i,val in enumerate(data): result[inv[i]] = val
        return result

    def _negentropy_mask(self, data: bytearray) -> bytearray:
        mask = bytearray()
        current = self.negentropy_key
        while len(mask)<len(data):
            current = hashlib.sha512(current).digest()
            mask.extend(current)
        return bytearray(a^b for a,b in zip(data,mask[:len(data)]))

    def encrypt_payload(self, plaintext: bytes) -> bytes:
        nonce = os.urandom(12)
        ciphertext = self.chacha.encrypt(nonce, plaintext, None)
        masked = self._negentropy_mask(bytearray(nonce + ciphertext))
        return bytes(self._grok_permute(masked))

    def decrypt_payload(self, payload: bytes) -> bytes:
        unpermuted = self._grok_permute(bytearray(payload), reverse=True)
        unmasked = self._negentropy_mask(unpermuted)
        nonce = bytes(unmasked[:12])
        ciphertext = bytes(unmasked[12:])
        return self.chacha.decrypt(nonce, ciphertext, None)

# ──────────────────────────────
# Deterministic indices with replace=True if needed
# ──────────────────────────────
def get_stego_indices(total_pixels: int, payload_bytes: int):
    seed = int.from_bytes(hashlib.sha256(KEY_PATH.encode()+payload_bytes.to_bytes(8,'big')).digest()[:4],'big')
    rng = np.random.default_rng(seed)
    num_bits = payload_bytes*8
    if num_bits>total_pixels:
        return rng.choice(total_pixels,num_bits,replace=True)
    else:
        return rng.choice(total_pixels,num_bits,replace=False)

# ──────────────────────────────
# Compact LSB Stego
# ──────────────────────────────
class AntiForensicStego:

    @staticmethod
    def _load_and_convert(path:str):
        pil = Image.open(path).convert("RGB")
        arr = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
        return arr

    @staticmethod
    def embed(carrier_path:str,payload:bytes,output_path:str):
        img = AntiForensicStego._load_and_convert(carrier_path)
        enc_rs = rs.encode(payload)
        bits = np.unpackbits(np.frombuffer(enc_rs, np.uint8))
        flat = img.ravel()
        if len(bits) > len(flat):
            print(f"[!] Payload {len(bits)//8} bytes exceeds image capacity {len(flat)//8}. Using overlapping pixels.")
        indices = get_stego_indices(len(flat), len(enc_rs))
        for i,b in enumerate(bits):
            idx = indices[i]
            flat[idx] = (int(flat[idx]) & 0b11111110) | int(b)
        cv2.imwrite(output_path, flat.reshape(img.shape))

    @staticmethod
    def extract(stego_path:str) -> bytes:
        img = AntiForensicStego._load_and_convert(stego_path)
        flat = img.ravel()
        # first assume RS payload is smaller than image
        indices = get_stego_indices(len(flat), len(flat)//8)
        bits = [flat[i]&1 for i in indices]
        data = np.packbits(bits).tobytes()
        # RS decode
        decoded = rs.decode(data)[0]
        return decoded

# ──────────────────────────────
# Helpers
# ──────────────────────────────
def list_images():
    files=[f for f in os.listdir("/content") if f.lower().endswith(('.png','.jpg','.jpeg','.bmp','.webp'))]
    for i,f in enumerate(files): print(f"{i+1}. {f}")
    return files

def choose_image():
    files=list_images()
    if not files: return None
    try: idx=int(input("Select image number:"))-1
    except: print("Invalid"); return None
    return "/content/"+files[idx]

# ──────────────────────────────
# Compact encrypt/decrypt with zlib
# ──────────────────────────────
def compact_encrypt(crypto:GrokPermuteCrypto,text:str)->bytes:
    compressed = zlib.compress(text.encode())
    enc = crypto.encrypt_payload(compressed)
    return enc

def compact_decrypt(crypto:GrokPermuteCrypto,payload:bytes)->str:
    decrypted = crypto.decrypt_payload(payload)
    decompressed = zlib.decompress(decrypted)
    return decompressed.decode('utf-8')

# ──────────────────────────────
# Menu
# ──────────────────────────────
def stego_menu():
    current_key=None
    while True:
        print("\n"+"="*60)
        print(" PQ STEGO – Compact + JPEG→PNG + RS")
        print("="*60)
        print("1. Generate new key (/content/key.enc)")
        print("2. Load key (/content/key.enc)")
        print("3. Encrypt & hide text")
        print("4. Extract & decrypt text")
        print("5. Exit")
        print("="*60)

        choice=input("Select:").strip()
        if choice=='1':
            current_key=os.urandom(32)
            with open(KEY_PATH,"wb") as f: f.write(current_key)
            print("[+] Key saved to /content/key.enc")
        elif choice=='2':
            if os.path.isfile(KEY_PATH):
                with open(KEY_PATH,"rb") as f: current_key=f.read()
                print("[+] Key loaded from /content/key.enc")
            else: print("[-] key.enc not found")
        elif choice=='3':
            if current_key is None: print("Load or generate key first."); continue
            carrier=choose_image()
            if not carrier: continue
            text=input("Text to hide:").strip()
            crypto=GrokPermuteCrypto(current_key)
            enc=compact_encrypt(crypto,text)
            output_path="/content/stego_"+os.path.basename(carrier).split('.')[0]+".png"
            AntiForensicStego.embed(carrier,enc,output_path)
            print("[+] Saved to",output_path)
            display(IPythonImage(output_path))
        elif choice=='4':
            if current_key is None: print("Load or generate key first."); continue
            stego=choose_image()
            if not stego: continue
            try:
                raw=AntiForensicStego.extract(stego)
                crypto=GrokPermuteCrypto(current_key)
                plain=compact_decrypt(crypto,raw)
                print("\nDecrypted Message:\n",plain)
            except Exception as e:
                print("Extraction failed:",e)
        elif choice=='5': break
        else: print("Invalid option")

stego_menu()
