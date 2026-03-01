
# ────────────────────────────────────────────────────────────────
#   Post-Quantum Hybrid Encryption Tool (ML-KEM-768 + AES-256-GCM)
#         Temporary VM storage only – no Google Drive
#         Files live only during this Colab runtime
# ────────────────────────────────────────────────────────────────

!pip install -q --upgrade kyber-py pycryptodome

from kyber_py.ml_kem import ML_KEM_768
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import os
import glob
from google.colab import files

# ─── Constants (ML-KEM-768 fixed values) ───────────────────────────
CT_SIZE     = 1088          # kem ciphertext bytes
PK_SIZE     = 1184          # public key (ek) bytes
IV_SIZE     = 12
TAG_SIZE    = 16

KEM = ML_KEM_768

# Globals (in-memory during session)
public_key  = None
private_key = None

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def show_header():
    print("\n" + "═"*70)
    print("  POST-QUANTUM ENCRYPTOR / DECRYPTOR   (ML-KEM-768 + AES-GCM)")
    print("═"*70)
    print("  Storage: Temporary Colab VM (/content/) – files disappear when runtime ends")
    print(f"Public key : {'loaded' if public_key else 'NOT loaded'}")
    print(f"Private key: {'loaded' if private_key else 'NOT loaded'}")
    print("═"*70)

def list_files(pattern="*.*"):
    files_list = sorted(f for f in glob.glob(pattern) if os.path.isfile(f))
    if not files_list:
        print("No matching files in /content/")
        return []
    print("\nFiles in current temporary folder (/content/):")
    for i, fullpath in enumerate(files_list, 1):
        fname = os.path.basename(fullpath)
        size = os.path.getsize(fullpath)
        print(f"  {i:2d})  {fname}   ({size:,} bytes)")
    return files_list

while True:
    clear_screen()
    show_header()

    print("\nMENU:")
    print("  1) Generate new keypair → save ek.bin + dk.bin temporarily")
    print("  2) Load public key (upload or use existing ek.bin)")
    print("  3) Load private key (upload or use existing dk.bin)")
    print(" ───────────────────────────────────────")
    print("  4) Encrypt text message → save .enc file temporarily")
    print("  5) Encrypt uploaded/local file → save .enc")
    print("  6) Decrypt .enc file → show result (optionally save decrypted)")
    print(" ───────────────────────────────────────")
    print("  0) Exit")
    print()

    choice = input("→ ").strip()

    # 1: Generate keys
    if choice == "1":
        print("\nGenerating ML-KEM-768 keypair...")
        public_key, private_key = KEM.keygen()

        with open("ek.bin", "wb") as f: f.write(public_key)
        with open("dk.bin", "wb") as f: f.write(private_key)

        print("\nKeys saved temporarily:")
        print("  ek.bin  (public – safe to share)")
        print("  dk.bin  (private – keep secret!)")
        print("\n→ Right-click files in the left sidebar 'Files' panel to download")

    # 2: Load public key
    elif choice == "2":
        print("\nLooking for existing ek.bin...")
        list_files("ek.bin")

        if os.path.exists("ek.bin"):
            use_local = input("Load existing ek.bin from VM? [y/N]: ").lower().startswith('y')
            if use_local:
                with open("ek.bin", "rb") as f:
                    public_key = f.read()
                print(f"Public key loaded ({len(public_key):,} bytes)")
                continue

        print("\nUpload ek.bin instead:")
        uploaded = files.upload()
        if uploaded:
            public_key = list(uploaded.values())[0]
            print(f"Public key loaded from upload ({len(public_key):,} bytes)")

    # 3: Load private key
    elif choice == "3":
        print("\nLooking for existing dk.bin...")
        list_files("dk.bin")

        if os.path.exists("dk.bin"):
            use_local = input("Load existing dk.bin from VM? [y/N]: ").lower().startswith('y')
            if use_local:
                with open("dk.bin", "rb") as f:
                    private_key = f.read()
                print(f"Private key loaded ({len(private_key):,} bytes)")
                continue

        print("\nUpload dk.bin:")
        uploaded = files.upload()
        if uploaded:
            private_key = list(uploaded.values())[0]
            print(f"Private key loaded from upload ({len(private_key):,} bytes)")

    # 4: Encrypt text
    elif choice == "4":
        if public_key is None:
            print("\nERROR: Load or generate public key first!")
            input("\nPress Enter...")
            continue

        text = input("\nEnter message to encrypt: ").strip()
        if not text: continue
        plaintext = text.encode("utf-8")

        ss, kem_ct = KEM.encaps(public_key)
        iv = get_random_bytes(IV_SIZE)
        cipher = AES.new(ss, AES.MODE_GCM, nonce=iv)
        enc_data, tag = cipher.encrypt_and_digest(plaintext)

        packet = kem_ct + iv + tag + enc_data

        out_name = "encrypted_message.enc"
        with open(out_name, "wb") as f:
            f.write(packet)

        print(f"\nEncrypted file created: {out_name} ({len(packet):,} bytes)")
        print("→ Find it in the left sidebar 'Files' panel – right-click to download")

    # 5: Encrypt file
    elif choice == "5":
        if public_key is None:
            print("\nERROR: Load or generate public key first!")
            input("\nPress Enter...")
            continue

        print("\nUpload file(s) to encrypt (or use already uploaded ones)")
        print("Then select from list below.")
        _ = files.upload()  # optional – user can skip

        print("\nAvailable files to encrypt:")
        avail = list_files("*")
        if not avail:
            print("No files found. Upload something first.")
            continue

        try:
            idx = int(input("\nEnter number of file to encrypt: "))
            src = avail[idx-1]
            with open(src, "rb") as f:
                plaintext = f.read()
            base = os.path.splitext(os.path.basename(src))[0]
            out_name = f"{base}.enc"
        except:
            print("Invalid selection.")
            continue

        ss, kem_ct = KEM.encaps(public_key)
        iv = get_random_bytes(IV_SIZE)
        cipher = AES.new(ss, AES.MODE_GCM, nonce=iv)
        enc_data, tag = cipher.encrypt_and_digest(plaintext)

        packet = kem_ct + iv + tag + enc_data

        with open(out_name, "wb") as f:
            f.write(packet)

        print(f"\nEncrypted: {out_name} ({len(packet):,} bytes)")
        print("→ Right-click in Files panel to download")

    # 6: Decrypt
    elif choice == "6":
        if private_key is None:
            print("\nERROR: Load private key first!")
            input("\nPress Enter...")
            continue

        print("\nSelect encrypted file:")
        enc_files = list_files("*.enc")
        if not enc_files:
            print("No .enc files found.")
            continue

        try:
            idx = int(input("Number → "))
            src = enc_files[idx-1]
            with open(src, "rb") as f:
                data = f.read()
        except:
            print("Invalid choice.")
            continue

        if len(data) < CT_SIZE + IV_SIZE + TAG_SIZE:
            print("File too small – not a valid encrypted file?")
            continue

        kem_ct = data[:CT_SIZE]
        iv     = data[CT_SIZE:CT_SIZE+IV_SIZE]
        tag    = data[CT_SIZE+IV_SIZE:CT_SIZE+IV_SIZE+TAG_SIZE]
        enc    = data[CT_SIZE+IV_SIZE+TAG_SIZE:]

        try:
            ss = KEM.decaps(private_key, kem_ct)
        except Exception as e:
            print(f"Decapsulation failed (wrong key?): {e}")
            continue

        cipher = AES.new(ss, AES.MODE_GCM, nonce=iv)
        try:
            plain = cipher.decrypt_and_verify(enc, tag)
            print("\n" + "─"*60)
            print("DECRYPTION SUCCESSFUL")
            print("─"*60)

            try:
                text = plain.decode("utf-8")
                print("\nDecrypted text:\n")
                print(text)
            except UnicodeDecodeError:
                print("\n(Binary content – not printable as text)")

            save = input("\nSave decrypted version? [y/N]: ").lower().startswith('y')
            if save:
                if 'text' in locals() and text:
                    dec_name = "decrypted.txt"
                    with open(dec_name, "w", encoding="utf-8") as f:
                        f.write(text)
                else:
                    dec_name = "decrypted.bin"
                    with open(dec_name, "wb") as f:
                        f.write(plain)
                print(f"Saved as {dec_name}")
                print("→ Right-click in Files panel to download")

        except ValueError:
            print("Authentication failed – wrong key or corrupted file.")

    # Exit
    elif choice in ("0", "q", "exit", ""):
        print("\nSession ended. All files in /content/ will be deleted soon.\n")
        break

    else:
        print("\nInvalid choice.")

    input("\nPress Enter to continue...")
