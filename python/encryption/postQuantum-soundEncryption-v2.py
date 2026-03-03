
# ───────────────────────────────────────────────────────────────
# Single-cell Post-Quantum Encryption via 520 Hz Audio (Colab)
# ───────────────────────────────────────────────────────────────

!pip install -q kyber-py cryptography ipywidgets numpy pillow

from kyber_py.ml_kem import ML_KEM_512, ML_KEM_768, ML_KEM_1024
import secrets
from hashlib import sha3_256
import base64
from cryptography.fernet import Fernet
import numpy as np
import wave
import os
import ipywidgets as widgets
from IPython.display import display, clear_output
from google.colab import files
from PIL import Image
import io

# Paths
KEY_PATH = '/content/exotic_key.bin'
AUDIO_PATH = '/content/520hz_tone_with_data.wav'
DECRYPTED_PATH = '/content/decrypted_file'

# Audio settings
SAMPLE_RATE = 44100
DURATION_SEC = 30
FREQUENCY = 520  # Hz
NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC
BITS_PER_SAMPLE = 1
MAX_DATA_BYTES = (NUM_SAMPLES * BITS_PER_SAMPLE) // 8

# ───────────────────────────────────────────────
# Key generation (triple ML-KEM + extra entropy)
# ───────────────────────────────────────────────

def get_shared_secret(ml_kem):
    print(f"  → {ml_kem.__class__.__name__} keygen + encaps...")
    ek, dk = ml_kem.keygen()
    ss, ct = ml_kem.encaps(ek)
    return ss

def generate_key():
    print("Creating exotic post-quantum key...")
    ss512  = get_shared_secret(ML_KEM_512)
    ss768  = get_shared_secret(ML_KEM_768)
    ss1024 = get_shared_secret(ML_KEM_1024)
    extra  = secrets.token_bytes(64)
    combined = ss512 + ss768 + ss1024 + extra
    key = sha3_256(combined).digest()
    with open(KEY_PATH, 'wb') as f:
        f.write(key)
    print(f"Key saved → {KEY_PATH}")

# ───────────────────────────────────────────────
# Audio generation / LSB embedding
# ───────────────────────────────────────────────

def create_520hz_tone_with_embedded_data(ciphertext_bytes):
    t = np.linspace(0, DURATION_SEC, NUM_SAMPLES, endpoint=False)
    sine = np.sin(2 * np.pi * FREQUENCY * t)
    samples = np.int16(sine * 32767)

    # Prepare bits
    bit_stream = np.unpackbits(np.frombuffer(ciphertext_bytes, dtype=np.uint8))
    bits_to_embed = bit_stream[:NUM_SAMPLES * BITS_PER_SAMPLE]

    if len(bits_to_embed) < NUM_SAMPLES * BITS_PER_SAMPLE:
        padding = np.zeros(NUM_SAMPLES * BITS_PER_SAMPLE - len(bits_to_embed), dtype=np.uint8)
        bits_to_embed = np.concatenate([bits_to_embed, padding])

    # Embed LSB
    for i in range(NUM_SAMPLES):
        bit = bits_to_embed[i]
        samples[i] = (samples[i] & ~1) | bit  # ✅ fixed syntax

    # Save WAV
    with wave.open(AUDIO_PATH, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(samples.tobytes())

    print(f"520 Hz tone (30s) with hidden data saved → {AUDIO_PATH}")
    print(f"Capacity used: {len(ciphertext_bytes)} / ~{MAX_DATA_BYTES} bytes")

def extract_hidden_bytes_from_audio():
    with wave.open(AUDIO_PATH, 'rb') as wav:
        raw = wav.readframes(NUM_SAMPLES)
    samples = np.frombuffer(raw, dtype=np.int16)
    bits = samples & 1
    byte_array = np.packbits(bits, axis=0, bitorder='big')
    return byte_array.tobytes()

# ───────────────────────────────────────────────
# File conversion helper (.jpeg → .png)
# ───────────────────────────────────────────────

def convert_jpeg_to_png(data, filename):
    img = Image.open(io.BytesIO(data))
    if img.format.lower() == 'jpeg':
        new_filename = os.path.splitext(filename)[0] + '.png'
        output = io.BytesIO()
        img.save(output, format='PNG')
        print(f"Converted {filename} → {new_filename}")
        return output.getvalue(), new_filename
    return data, filename

# ───────────────────────────────────────────────
# Encryption
# ───────────────────────────────────────────────

def encrypt():
    if not os.path.exists(KEY_PATH):
        print("→ Please generate key first!")
        return

    mode = input_mode.value
    data = b''
    filename = "file"

    if mode == 'Text':
        msg = text_area.value.strip()
        if not msg:
            print("→ Enter some text!")
            return
        data = msg.encode('utf-8')
    else:
        print("Upload file to encrypt...")
        uploaded = files.upload()
        if not uploaded:
            print("→ No file selected.")
            return
        filename = list(uploaded)[0]
        data = uploaded[filename]
        data, filename = convert_jpeg_to_png(data, filename)

    if len(data) > MAX_DATA_BYTES - 200:
        print(f"→ Data too big! Max ~{MAX_DATA_BYTES // 1024} KB")
        return

    with open(KEY_PATH, 'rb') as f:
        key = f.read()
    fernet_key = base64.urlsafe_b64encode(key)
    f = Fernet(fernet_key)
    ciphertext = f.encrypt(data)

    create_520hz_tone_with_embedded_data(ciphertext)

# ───────────────────────────────────────────────
# Decryption
# ───────────────────────────────────────────────

def decrypt():
    if not os.path.exists(KEY_PATH) or not os.path.exists(AUDIO_PATH):
        print("→ Need both key and audio file first!")
        return

    hidden_bytes = extract_hidden_bytes_from_audio()

    with open(KEY_PATH, 'rb') as f:
        key = f.read()
    fernet_key = base64.urlsafe_b64encode(key)
    f = Fernet(fernet_key)

    try:
        plaintext = f.decrypt(hidden_bytes)
        try:
            text = plaintext.decode('utf-8')
            print("\nDecrypted text:\n" + "="*50)
            print(text)
            print("="*50)
        except UnicodeDecodeError:
            with open(DECRYPTED_PATH, 'wb') as out:
                out.write(plaintext)
            print(f"\nDecrypted binary file saved → {DECRYPTED_PATH}")
            print("→ Download it from the Colab files panel")
    except Exception as e:
        print("Decryption failed! Likely wrong key / audio / truncated data.")
        print(f"Error: {str(e)}")

# ───────────────────────────────────────────────
# User Interface
# ───────────────────────────────────────────────

option_dropdown = widgets.Dropdown(
    options=['Generate Key', 'Encrypt (Text or File)', 'Decrypt Audio'],
    description='Action:',
)

input_mode = widgets.RadioButtons(
    options=['Text', 'File'],
    description='Encrypt:',
    layout={'margin': '10px 0'}
)

text_area = widgets.Textarea(
    value='',
    placeholder='Type or paste your message here (when Text selected)',
    description='Message:',
    layout={'width': '600px', 'height': '120px'}
)

run_button = widgets.Button(
    description='Execute',
    button_style='success'
)

output_area = widgets.Output()

def on_run(b):
    with output_area:
        clear_output()
        action = option_dropdown.value
        if action == 'Generate Key':
            generate_key()
        elif action == 'Encrypt (Text or File)':
            encrypt()
        elif action == 'Decrypt Audio':
            decrypt()

run_button.on_click(on_run)

print("Post-Quantum Steganography – 520 Hz Tone (30 seconds)")
print("Hides encrypted data in LSB of a clean sine wave • ML-KEM key derivation")
display(option_dropdown, input_mode, text_area, run_button, output_area)
