# Install Python PQClean bindings and PyCryptodome
!pip install pypqc pycryptodome ipywidgets -q

from pqc.kem import kyber512
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64
import ipywidgets as widgets
from IPython.display import display, HTML

# -------------------------
# Storage
# -------------------------
public_key = None
private_key = None
encrypted_aes_key = None
output = widgets.Output()

# -------------------------
# Generate PQC Keys
# -------------------------
btn_gen = widgets.Button(description="Generate Kyber512 Keypair")
def on_gen(b):
    global public_key, private_key
    public_key, private_key = kyber512.keypair()
    with output:
        output.clear_output()
        print("📌 Kyber512 keys generated!")
        display(HTML(f"<a download='pqc_pub.key' href='data:application/octet-stream;base64,{base64.b64encode(public_key).decode()}' target='_blank'>⬇️ Download Public Key</a><br>"))
        display(HTML(f"<a download='pqc_priv.key' href='data:application/octet-stream;base64,{base64.b64encode(private_key).decode()}' target='_blank'>⬇️ Download Private Key</a><br>"))
btn_gen.on_click(on_gen)

# -------------------------
# Encrypt File
# -------------------------
file_upload_enc = widgets.FileUpload(description="Upload File to Encrypt", accept='', multiple=False)
btn_encrypt = widgets.Button(description="Encrypt & Download File")

def on_encrypt(b):
    global encrypted_aes_key
    if public_key is None:
        with output:
            output.clear_output()
            print("❌ Generate keys first!")
        return
    if not file_upload_enc.value:
        with output:
            output.clear_output()
            print("❌ Upload a file first!")
        return
    
    # get uploaded bytes
    info = list(file_upload_enc.value.values())[0]
    data = info['content']
    filename = info['metadata']['name']
    
    # AES key + AES-GCM file encryption
    aes_key = get_random_bytes(32)
    cipher = AES.new(aes_key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(data)
    
    # PQC encrypt AES key
    shared_secret, enc_kem = kyber512.encap(public_key)
    encrypted_aes_key = enc_kem  # store 
    final_blob = enc_kem + cipher.nonce + tag + ciphertext
    blob_b64 = base64.b64encode(final_blob).decode()
    
    with output:
        output.clear_output()
        print(f"🔐 File '{filename}' encrypted!")
        display(HTML(f"<a download='encrypted_{filename}.bin' href='data:application/octet-stream;base64,{blob_b64}' target='_blank'>⬇️ Download Encrypted File</a><br>"))
btn_encrypt.on_click(on_encrypt)

# -------------------------
# Decrypt File
# -------------------------
file_upload_dec = widgets.FileUpload(description="Upload Encrypted File", accept=".bin", multiple=False)
aes_key_upload = widgets.FileUpload(description="Upload Encrypted AES Key (optional)", accept=".bin", multiple=False) 
btn_decrypt = widgets.Button(description="Decrypt File")

def on_decrypt(b):
    if private_key is None:
        with output:
            output.clear_output()
            print("❌ Generate or upload private key!")
        return
    if not file_upload_dec.value:
        with output:
            output.clear_output()
            print("❌ Upload encrypted file!")
        return
    
    # load encrypted blob
    info = list(file_upload_dec.value.values())[0]
    blob = base64.b64decode(info['content'])
    
    # split encrypted AES key + AES-GCM pieces
    kem_len = len(kyber512.encap(public_key)[1])  # ciphertext length
    enc_kem = blob[:kem_len]
    aes_blob = blob[kem_len:]
    
    # recover AES key
    aes_key = kyber512.decap(enc_kem, private_key)
    
    # split AES GCM
    nonce = aes_blob[:16]
    tag = aes_blob[16:32]
    ciphertext = aes_blob[32:]
    cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    
    # provide download
    dec_b64 = base64.b64encode(plaintext).decode()
    with output:
        output.clear_output()
        print("✅ Decryption successful!")
        display(HTML(f"<a download='decrypted_{info['metadata']['name']}' href='data:application/octet-stream;base64,{dec_b64}' target='_blank'>⬇️ Download Decrypted File</a><br>"))

btn_decrypt.on_click(on_decrypt)

# -------------------------
# Layout
# -------------------------
display(widgets.VBox([
    btn_gen,
    file_upload_enc,
    btn_encrypt,
    file_upload_dec,
    btn_decrypt,
    output
]))
