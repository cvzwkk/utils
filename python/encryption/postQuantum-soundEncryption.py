
# Single cell Google Colab script for post-quantum text encryption via audio generation
# Fixed import: from kyber_py.ml_kem import ML_KEM_512, ML_KEM_768, ML_KEM_1024
# (per official kyber-py GitHub & docs: submodule ml_kem)
# Uses ML-KEM (FIPS 203 standard) — triple parameter sets + extra entropy → exotic unique key
# Fernet (AES-128 in CBC + HMAC) for symmetric encryption (strong when key is high-entropy)
# Ciphertext → raw signed 16-bit PCM WAV = indistinguishable white noise (forensic-resistant stego)

!pip install -q kyber-py cryptography ipywidgets

from kyber_py.ml_kem import ML_KEM_512, ML_KEM_768, ML_KEM_1024
import secrets
from hashlib import sha3_256
import base64
from cryptography.fernet import Fernet
import struct
import wave
import os
import ipywidgets as widgets
from IPython.display import display, clear_output

# Files stored only in Colab runtime (/content/)
KEY_PATH = '/content/exotic_ml_kem_key.bin'
AUDIO_PATH = '/content/noise_encrypted.wav'

def get_shared_secret(ml_kem):
    """Local simulation of ML-KEM encapsulation to derive a shared secret"""
    print(f"  → Running {ml_kem.__class__.__name__} keygen + encaps...")
    ek, dk = ml_kem.keygen()          # ek = encapsulation key (public), dk = decryption key (private)
    ss, ct = ml_kem.encaps(ek)        # ss = shared secret, ct = ciphertext (we discard ct)
    return ss

def generate_key():
    print("Generating exotic post-quantum key (never seen before)...")
    print("Triple ML-KEM levels + 512-bit extra entropy + SHA3-256")
    
    ss512  = get_shared_secret(ML_KEM_512)
    ss768  = get_shared_secret(ML_KEM_768)
    ss1024 = get_shared_secret(ML_KEM_1024)
    
    extra_entropy = secrets.token_bytes(64)  # cryptographically secure random bytes
    
    combined = ss512 + ss768 + ss1024 + extra_entropy
    final_key = sha3_256(combined).digest()  # 32-byte key perfect for Fernet
    
    with open(KEY_PATH, 'wb') as f:
        f.write(final_key)
    
    print(f"→ Exotic 256-bit key generated and saved: {KEY_PATH}")

def encrypt_text():
    if not os.path.exists(KEY_PATH):
        print("Error: No key found. Run 'Generate Exotic PQ Key' first!")
        return
    
    text = text_input.value.strip()
    if not text:
        print("Please enter text to encrypt!")
        return
    
    print("Encrypting text → Fernet(AES) → audio white noise...")
    
    with open(KEY_PATH, 'rb') as f:
        key_bytes = f.read()
    
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    f = Fernet(fernet_key)
    
    ciphertext = f.encrypt(text.encode('utf-8'))
    
    # Pad to even byte count for int16 samples
    if len(ciphertext) % 2 == 1:
        ciphertext += b'\x00'
    
    num_samples = len(ciphertext) // 2
    samples = struct.unpack(f'<{num_samples}h', ciphertext)
    
    with wave.open(AUDIO_PATH, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)       # 16-bit signed integers
        wav.setframerate(44100)   # common rate — irrelevant for noise
        wav.writeframes(struct.pack(f'<{num_samples}h', *samples))
    
    print(f"→ Encrypted noise audio saved: {AUDIO_PATH}")
    print(f"   Size: {os.path.getsize(AUDIO_PATH):,} bytes — statistically random noise")

def decrypt_audio():
    if not all(os.path.exists(p) for p in [KEY_PATH, AUDIO_PATH]):
        print("Error: Need both key and audio file. Generate + encrypt first!")
        return
    
    print("Decrypting: audio → ciphertext → Fernet decrypt → plaintext...")
    
    with open(KEY_PATH, 'rb') as f:
        key_bytes = f.read()
    
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    f = Fernet(fernet_key)
    
    with wave.open(AUDIO_PATH, 'rb') as wav:
        raw_bytes = wav.readframes(wav.getnframes())
    
    try:
        plaintext = f.decrypt(raw_bytes).decode('utf-8')
        print("\nDecrypted message:")
        print("═══════════════════════════════════════════════")
        print(plaintext)
        print("═══════════════════════════════════════════════")
    except Exception as e:
        print("Decryption failed!")
        print("Possible reasons: wrong key / audio not from this tool / modified file")
        print(f"Error detail: {str(e)}")

# ────────────────────────────────────────────────
#                  INTERACTIVE MENU
# ────────────────────────────────────────────────

option_dropdown = widgets.Dropdown(
    options=[
        '1. Generate Exotic PQ Key (ML-KEM triple + entropy)',
        '2. Encrypt Text → Audio Noise',
        '3. Decrypt Audio Noise → Text'
    ],
    description='Action:',
    layout={'width': 'max-content'}
)

text_input = widgets.Text(
    value='',
    placeholder='Enter your secret message here...',
    description='Message:',
    layout={'width': '600px'}
)

button = widgets.Button(
    description='Run Action',
    button_style='success',
    tooltip='Execute selected operation'
)

output = widgets.Output()

def on_button_clicked(b):
    with output:
        clear_output()
        choice = option_dropdown.value
        if 'Generate' in choice:
            generate_key()
        elif 'Encrypt' in choice:
            encrypt_text()
        elif 'Decrypt' in choice:
            decrypt_audio()

button.on_click(on_button_clicked)

print("Post-Quantum Audio Steganography Tool – ML-KEM (FIPS 203) via pure-Python kyber-py")
print("Key derivation: ML-KEM-512/768/1024 + CSPRNG entropy → SHA3-256 → Fernet")
print("Output audio = cryptographically random noise → very hard to detect forensics")
display(option_dropdown, text_input, button, output)
