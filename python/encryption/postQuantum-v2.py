
# ────────────────────────────────────────────────────────────────
#   Hardened Post-Quantum Hybrid Encryption Tool – Entropy/Negentropy Boost
#   - 10× ML-KEM Mix (512/768/1024) + AES-GCM
#   - Exotic: 3-round GrokChaosPermute (entropy ↑ in enc, negentropy in dec)
#   - Fixed: HKDF called with keyword arguments only
#   - Temporary VM storage (/content/) – download via sidebar
# ────────────────────────────────────────────────────────────────

!pip install -q --upgrade kyber-py pycryptodome

from kyber_py.ml_kem import ML_KEM_512, ML_KEM_768, ML_KEM_1024
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import HKDF
from Crypto.Hash import SHA512
import os
import glob
from google.colab import files

# ─── Constants ─────────────────────────────────────────────────────
IV_SIZE     = 12
TAG_SIZE    = 16
MASTER_SALT = b'hardened_pq_mix_enhanced_v3'

KEM_MIX = [
    ML_KEM_512, ML_KEM_768, ML_KEM_1024,
    ML_KEM_512, ML_KEM_768, ML_KEM_1024,
    ML_KEM_512, ML_KEM_768, ML_KEM_1024,
    ML_KEM_512
]

CT_SIZES = [768, 1088, 1568] * 3 + [768]

CHAOS_ROUNDS   = 3
CHAOS_R_VALUES = [3.82, 3.96, 3.999]

public_keys  = None
private_keys = None

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def show_header():
    print("\n" + "═"*80)
    print("  HARDENED PQ ENCRYPTOR / DECRYPTOR – Entropy Boost Edition")
    print("  - 10× ML-KEM Mix + AES-GCM + 3-Round GrokChaosPermute")
    print("  Storage: Temporary Colab VM (/content/) – download manually")
    print(f"Public keys : {'loaded' if public_keys else 'NOT loaded'}")
    print(f"Private keys: {'loaded' if private_keys else 'NOT loaded'}")
    print("═"*80)

def list_files(pattern="*.*"):
    files_list = sorted(f for f in glob.glob(pattern) if os.path.isfile(f))
    if not files_list:
        print("No files found in /content/")
        return []
    print("\nFiles in temporary folder:")
    for i, f in enumerate(files_list, 1):
        print(f"  {i:2d})  {os.path.basename(f)}  ({os.path.getsize(f):,} bytes)")
    return files_list

def grok_chaos_permute(data: bytes, seeds: list[bytes], inverse: bool = False) -> bytes:
    current = data
    for round_idx in range(CHAOS_ROUNDS):
        seed = seeds[round_idx % len(seeds)]
        r    = CHAOS_R_VALUES[round_idx]

        chaos_key = HKDF(
            master=seed,
            key_len=8,
            salt=b'chaos_entropy_salt',
            num_keys=1,
            hashmod=SHA512,
            context=b'grok_layer_v3'
        )
        x = sum(chaos_key) / (255.0 * len(chaos_key))

        n = len(current)
        if n == 0: return b''

        seq = []
        for _ in range(n * 12):
            x = r * x * (1 - x)
        for _ in range(n):
            x = r * x * (1 - x)
            seq.append(x)

        indices = list(range(n))
        sorted_idx = sorted(indices, key=lambda i: seq[i])

        if inverse:
            inv_perm = [0] * n
            for pos, orig in enumerate(sorted_idx):
                inv_perm[orig] = pos
            new_data = bytearray(n)
            for i in range(n):
                new_data[inv_perm[i]] = current[i]
        else:
            new_data = bytearray(n)
            for i in range(n):
                new_data[i] = current[sorted_idx[i]]

        current = bytes(new_data)

    return current

while True:
    clear_screen()
    show_header()

    print("\nMENU:")
    print("  1) Generate 10× keypairs → ek_1..10.bin + dk_1..10.bin")
    print("  2) Load public keys (from files or upload)")
    print("  3) Load private keys (from files or upload)")
    print(" ───────────────────────────────────────")
    print("  4) Encrypt text → .henc")
    print("  5) Encrypt file → .henc")
    print("  6) Decrypt .henc → show/save")
    print(" ───────────────────────────────────────")
    print("  0) Exit")
    print()

    choice = input("→ ").strip()

    if choice == "1":
        print("\nGenerating 10× ML-KEM keypairs...")
        public_keys = []
        private_keys = []
        for i, kem in enumerate(KEM_MIX, 1):
            ek, dk = kem.keygen()
            public_keys.append(ek)
            private_keys.append(dk)
            with open(f"ek_{i}.bin", "wb") as f: f.write(ek)
            with open(f"dk_{i}.bin", "wb") as f: f.write(dk)
        print("Saved ek_*.bin & dk_*.bin (temporary – download via sidebar)")

    elif choice == "2":
        public_keys = []
        for i in range(1, 11):
            path = f"ek_{i}.bin"
            if os.path.exists(path):
                with open(path, "rb") as f: public_keys.append(f.read())
        if len(public_keys) == 10:
            print("Loaded all 10 public keys from VM files.")
            continue

        print("\nUpload the 10 ek_*.bin files")
        uploaded = files.upload()
        public_keys = [uploaded.get(f"ek_{i}.bin") for i in range(1, 11)]
        if None not in public_keys:
            print("All 10 public keys loaded.")
        else:
            public_keys = None
            print("Some files missing – please upload all 10.")

    elif choice == "3":
        private_keys = []
        for i in range(1, 11):
            path = f"dk_{i}.bin"
            if os.path.exists(path):
                with open(path, "rb") as f: private_keys.append(f.read())
        if len(private_keys) == 10:
            print("Loaded all 10 private keys from VM files.")
            continue

        print("\nUpload the 10 dk_*.bin files")
        uploaded = files.upload()
        private_keys = [uploaded.get(f"dk_{i}.bin") for i in range(1, 11)]
        if None not in private_keys:
            print("All 10 private keys loaded.")
        else:
            private_keys = None
            print("Some files missing – please upload all 10.")

    elif choice in ("4", "5"):
        if public_keys is None or len(public_keys) != 10:
            print("\nNeed all 10 public keys first!")
            input("\nPress Enter...")
            continue

        if choice == "4":
            msg = input("\nText to encrypt: ").strip()
            if not msg: continue
            plaintext = msg.encode('utf-8')
            out_name = "hardened_message.henc"
        else:
            print("\nUpload or select file to encrypt")
            _ = files.upload()
            avail = list_files("*")
            if not avail: continue
            try:
                idx = int(input("File number: "))
                src = avail[idx-1]
                with open(src, "rb") as f: plaintext = f.read()
                base = os.path.splitext(os.path.basename(src))[0]
                out_name = f"{base}.henc"
            except:
                print("Invalid selection.")
                continue

        shared_secrets = []
        all_kem_ct = b''
        for kem, ek in zip(KEM_MIX, public_keys):
            ss, ct = kem.encaps(ek)
            shared_secrets.append(ss)
            all_kem_ct += ct

        # FIXED HKDF call – all keyword arguments
        master_key = HKDF(
            master=b''.join(shared_secrets),
            key_len=32,
            salt=MASTER_SALT,
            num_keys=1,
            hashmod=SHA512
        )

        iv = get_random_bytes(IV_SIZE)
        cipher = AES.new(master_key, AES.MODE_GCM, nonce=iv)
        enc, tag = cipher.encrypt_and_digest(plaintext)

        chaos_seeds = shared_secrets[:CHAOS_ROUNDS]
        perm_enc = grok_chaos_permute(enc, chaos_seeds, inverse=False)

        packet = all_kem_ct + iv + tag + perm_enc

        with open(out_name, "wb") as f: f.write(packet)
        print(f"\nEncrypted → {out_name} ({len(packet):,} bytes)")
        print("→ Find & download in Files panel (left sidebar)")

    elif choice == "6":
        if private_keys is None or len(private_keys) != 10:
            print("\nNeed all 10 private keys first!")
            input("\nPress Enter...")
            continue

        henc_files = list_files("*.henc")
        if not henc_files: continue
        try:
            idx = int(input("File number: "))
            src = henc_files[idx-1]
            with open(src, "rb") as f: data = f.read()
        except:
            print("Invalid.")
            continue

        total_ct = sum(CT_SIZES)
        min_len = total_ct + IV_SIZE + TAG_SIZE
        if len(data) < min_len:
            print("File too short – invalid?")
            continue

        offset = 0
        kem_cts = []
        for sz in CT_SIZES:
            kem_cts.append(data[offset:offset+sz])
            offset += sz

        iv  = data[offset:offset+IV_SIZE]
        tag = data[offset+IV_SIZE:offset+IV_SIZE+TAG_SIZE]
        perm_enc = data[offset+IV_SIZE+TAG_SIZE:]

        shared_secrets = []
        for kem, dk, ct in zip(KEM_MIX, private_keys, kem_cts):
            ss = kem.decaps(dk, ct)
            shared_secrets.append(ss)

        master_key = HKDF(
            master=b''.join(shared_secrets),
            key_len=32,
            salt=MASTER_SALT,
            num_keys=1,
            hashmod=SHA512
        )

        chaos_seeds = shared_secrets[:CHAOS_ROUNDS]
        restored_enc = grok_chaos_permute(perm_enc, chaos_seeds, inverse=True)

        cipher = AES.new(master_key, AES.MODE_GCM, nonce=iv)
        try:
            plain = cipher.decrypt_and_verify(restored_enc, tag)
            print("\n" + "─"*70)
            print("DECRYPTION SUCCESS – negentropy restored!")
            print("─"*70)
            try:
                txt = plain.decode('utf-8')
                print(txt)
                dec_name = "decrypted.txt"
                with open(dec_name, "w", encoding="utf-8") as f: f.write(txt)
            except UnicodeDecodeError:
                print("(binary content)")
                dec_name = "decrypted.bin"
                with open(dec_name, "wb") as f: f.write(plain)
            print(f"Saved: {dec_name} – download from sidebar")
        except ValueError:
            print("Decryption failed (wrong key / corrupted file?)")

    elif choice in ("0", "q", "exit"):
        print("\nGoodbye! Files will be deleted when runtime ends.\n")
        break

    else:
        print("\nInvalid choice.")

    input("\nPress Enter to continue...")
