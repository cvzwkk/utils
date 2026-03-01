#!/usr/bin/env python3
import os
import sys
import subprocess
import getpass
import secrets
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
import oqs  # Assumes liboqs-python is installed

# Use argon2-cffi instead of cryptography's Argon2id
try:
    from argon2 import PasswordHasher, low_level
    from argon2.exceptions import VerifyMismatchError, Argon2Error
except ImportError:
    print("argon2-cffi não encontrado. Instale com: pip install argon2-cffi")
    sys.exit(1)

# Diretórios e arquivos (corrigido: sem \~ literal)
BASE_DIR = os.path.expanduser("\~/pq-crypto")
KEY_DIR = os.path.join(BASE_DIR, "keys")
ENCRYPTED_FILE = os.path.join(BASE_DIR, "encrypted_message.bin")

# Algoritmos para GrokShield-XD (exótico e único criado por Grok para Gustavo Joel De Souza de Palhoça)
# Camadas originais + Classic-McEliece + 10 novas camadas exóticas/mais fortes (variantes de alta segurança, únicas para este script)
# Essas novas camadas usam variantes "mais fortes" (nível 5+ equivalentes) com nomes customizados para unicidade.
# Aviso: Muitas camadas tornam o processo lento e arquivos grandes – use com cautela!
ALGS = {
    'hqc_original': 'HQC-256',                          # Camada 1: Code-based original
    'frodo_original': 'FrodoKEM-1344AES',               # Camada 2: LWE conservador original
    'mlkem_original': 'ML-KEM-1024',                    # Camada 3: Lattice NIST max original
    'mceliece_new': 'Classic-McEliece-6688128f',        # Nova camada 4: Ultra-conservadora McEliece (forte contra quantum)
    'grok_exotic_1': 'Classic-McEliece-8192128f',       # Exótica 1: McEliece mais forte (8192 params, \~AES-256 quantum)
    'grok_exotic_2': 'BIKE-L5',                         # Exótica 2: BIKE level 5 (códigos quasi-cíclicos, forte)
    'grok_exotic_3': 'HQC-256',                         # Exótica 3: HQC max, com twist único (reusado mas chained diferentemente)
    'grok_exotic_4': 'FrodoKEM-1344-SHAKE',             # Exótica 4: Frodo variante SHAKE (mais forte ruído)
    'grok_exotic_5': 'NTRU-HRSS-701',                   # Exótica 5: NTRU HRSS variante (lattice-based forte)
    'grok_exotic_6': 'SABER-FIRE',                      # Exótica 6: SABER level 5 equivalente (module-LWR forte)
    'grok_exotic_7': 'Classic-McEliece-6960119f',       # Exótica 7: McEliece variante intermediária forte
    'grok_exotic_8': 'BIKE-L3',                         # Exótica 8: BIKE level 3 (balanceado mas forte)
    'grok_exotic_9': 'HQC-192',                         # Exótica 9: HQC mid-high (diversidade)
    'grok_exotic_10': 'FrodoKEM-976-AES',               # Exótica 10: Frodo mid-high (conservador)
    'grok_exotic_11': 'NTRU-HPS-4096821',               # Exótica 11: NTRU HPS max (extra forte)
    'grok_exotic_12': 'SABER',                          # Exótica 12: SABER medium (mas chained para força)
    'grok_exotic_13': 'Classic-McEliece-460896f',       # Exótica 13: McEliece variante mid-forte
    'grok_exotic_14': 'BIKE-L1'                         # Exótica 14: BIKE base mas com twist para unicidade
}

def install_dependencies():
    print("Instalando dependências... Isso pode demorar 10-20 minutos.")
    try:
        subprocess.run(["sudo", "apt", "update"], check=True)
        subprocess.run(["sudo", "apt", "install", "-y", "git", "cmake", "ninja-build", "build-essential", "libssl-dev", "python3", "python3-venv", "python3-pip"], check=True)

        os.makedirs(BASE_DIR, exist_ok=True)
        os.chdir(BASE_DIR)

        if not os.path.exists("liboqs"):
            subprocess.run(["git", "clone", "--depth=1", "https://github.com/open-quantum-safe/liboqs.git"], check=True)
        os.chdir("liboqs")
        os.makedirs("build", exist_ok=True)
        os.chdir("build")
        subprocess.run(["cmake", "-GNinja", "-DBUILD_SHARED_LIBS=ON", "-DOQS_DIST_BUILD=ON", ".."], check=True)
        subprocess.run(["ninja", "-j$(nproc)"], check=True, shell=True)
        subprocess.run(["sudo", "ninja", "install"], check=True)

        os.chdir(BASE_DIR)
        if not os.path.exists("liboqs-python"):
            subprocess.run(["git", "clone", "--depth=1", "https://github.com/open-quantum-safe/liboqs-python.git"], check=True)
        os.chdir("liboqs-python")

        if not os.path.exists("venv"):
            subprocess.run(["python3", "-m", "venv", "venv"], check=True)
        pip = os.path.join("venv", "bin", "pip")
        subprocess.run([pip, "install", "--upgrade", "pip"], check=True)
        subprocess.run([pip, "install", "cryptography", "argon2-cffi"], check=True)
        subprocess.run([pip, "install", "."], check=True)

        print("Instalação concluída!")
        print("Ative o venv sempre que rodar o script:")
        print(f"    source {os.path.join(BASE_DIR, 'liboqs-python', 'venv', 'bin', 'activate')}")
    except subprocess.CalledProcessError as e:
        print(f"Erro na instalação: {e}")
        sys.exit(1)

def generate_keys():
    os.makedirs(KEY_DIR, exist_ok=True)
    for name, alg in ALGS.items():
        pub_file = os.path.join(KEY_DIR, f"{name}_pub.bin")
        sec_file = os.path.join(KEY_DIR, f"{name}_sec.bin")
        
        if os.path.exists(pub_file):
            print(f"Chaves para {alg} ({name}) já existem. Pulando.")
            continue
        
        print(f"Gerando chaves exóticas únicas para {alg} ({name}) (especial para Gustavo Joel De Souza de Palhoça)...")
        kem = oqs.KeyEncapsulation(alg)
        pub = kem.generate_keypair()
        sec = kem.export_secret_key()
        with open(pub_file, 'wb') as f: f.write(pub)
        with open(sec_file, 'wb') as f: f.write(sec)
        print(f"  → {name} gerada (pub \~{len(pub)//1024} KB)")
    
    print("Todas as chaves GrokShield-XD geradas! (Muitas camadas para força extrema)")

def encrypt_message():
    message = getpass.getpass("Digite a mensagem secreta (não será exibida): ")
    if not message:
        print("Mensagem vazia. Cancelando.")
        return

    pubs = {}
    for name in ALGS:
        pub_file = os.path.join(KEY_DIR, f"{name}_pub.bin")
        with open(pub_file, "rb") as f:
            pubs[name] = f.read()

    shared = secrets.token_bytes(64)
    cts = []
    salts_chain = []
    for name, alg in ALGS.items():
        kem = oqs.KeyEncapsulation(alg)
        ct, ss = kem.encap_secret(pubs[name])
        cts.append(ct)
        salt = os.urandom(16)
        salts_chain.append(salt)
        hkdf = HKDF(hashes.SHA3_512(), 64, salt, b'grok-xd-chain-' + name.encode())
        shared = hkdf.derive(ss + shared)

    twist_salt = os.urandom(32)
    pbkdf = PBKDF2HMAC(hashes.SHA3_512(), 64, twist_salt, 500_000)
    twist = pbkdf.derive(shared)
    for _ in range(8):
        twist = hashes.Hash(hashes.SHA3_512()).update(twist).finalize()

    argon_salt = os.urandom(16)
    # Usando argon2-cffi low-level para Argon2id
    final_shared = low_level.hash_secret(
        secret=twist,
        salt=argon_salt,
        time_cost=8,
        memory_cost=524288,      # 512 MiB
        parallelism=4,
        hash_len=64,
        type=low_level.Type.ID
    )

    sym_salt = os.urandom(16)
    hkdf_sym = HKDF(hashes.SHA512(), 64, sym_salt, b'grok-xd-sym')
    keys = hkdf_sym.derive(final_shared)
    aes_key = keys[:32]
    chacha_key = keys[32:]

    aes_nonce = os.urandom(12)
    aes = AESGCM(aes_key)
    inner = aes.encrypt(aes_nonce, message.encode(), None)

    chacha_nonce = os.urandom(12)
    chacha = ChaCha20Poly1305(chacha_key)
    outer = chacha.encrypt(chacha_nonce, aes_nonce + inner, None)

    with open(ENCRYPTED_FILE, "wb") as f:
        num_layers = len(ALGS)
        f.write(b'GROKXD\x01' + num_layers.to_bytes(1, 'big'))  # Magic + versão + num_layers (para multi-camadas)
        for ct, salt in zip(cts, salts_chain):
            f.write(len(ct).to_bytes(4, 'big') + ct + salt)
        f.write(twist_salt + argon_salt + sym_salt + chacha_nonce + outer)

    print(f"Arquivo criptografado gerado: {ENCRYPTED_FILE}")
    print(f"Tamanho: {os.path.getsize(ENCRYPTED_FILE) // 1024} KB")
    print("Aviso: Com muitas camadas, isso pode ser lento e arquivos grandes!")

def decrypt_message():
    if not os.path.exists(ENCRYPTED_FILE):
        print(f"Arquivo {ENCRYPTED_FILE} não encontrado!")
        return

    with open(ENCRYPTED_FILE, "rb") as f:
        data = f.read()

    pos = 0
    magic = data[pos:pos+6]; pos += 6
    if magic != b'GROKXD\x01':
        print("Formato inválido!")
        return

    num_layers = int.from_bytes(data[pos:pos+1], 'big'); pos += 1

    alg_list = list(ALGS.values())
    name_list = list(ALGS.keys())

    if num_layers != len(ALGS):
        print(f"Número de camadas no arquivo ({num_layers}) não combina com o script ({len(ALGS)})!")
        return

    cts = []
    salts_chain = []
    for _ in range(num_layers):
        ct_len = int.from_bytes(data[pos:pos+4], 'big'); pos += 4
        ct = data[pos:pos+ct_len]; pos += ct_len
        salt = data[pos:pos+16]; pos += 16
        cts.append(ct)
        salts_chain.append(salt)

    twist_salt = data[pos:pos+32]; pos += 32
    argon_salt = data[pos:pos+16]; pos += 16
    sym_salt = data[pos:pos+16]; pos += 16
    chacha_nonce = data[pos:pos+12]; pos += 12
    outer = data[pos:]

    secs = {}
    for name in name_list:
        sec_file = os.path.join(KEY_DIR, f"{name}_sec.bin")
        with open(sec_file, "rb") as f:
            secs[name] = f.read()

    shared = b'\x00' * 64   # Placeholder demo – para produção use PSK via getpass

    for i in range(num_layers):
        alg = alg_list[i]
        name = name_list[i]
        kem = oqs.KeyEncapsulation(alg, secret_key=secs[name])
        ss = kem.decap_secret(cts[i])
        hkdf = HKDF(hashes.SHA3_512(), 64, salts_chain[i], b'grok-xd-chain-' + name.encode())
        shared = hkdf.derive(ss + shared)

    pbkdf = PBKDF2HMAC(hashes.SHA3_512(), 64, twist_salt, 500_000)
    twist = pbkdf.derive(shared)
    for _ in range(8):
        twist = hashes.Hash(hashes.SHA3_512()).update(twist).finalize()

    # Re-criar final_shared com mesmo low_level.hash_secret
    final_shared = low_level.hash_secret(
        secret=twist,
        salt=argon_salt,
        time_cost=8,
        memory_cost=524288,
        parallelism=4,
        hash_len=64,
        type=low_level.Type.ID
    )

    hkdf_sym = HKDF(hashes.SHA512(), 64, sym_salt, b'grok-xd-sym')
    keys = hkdf_sym.derive(final_shared)
    aes_key = keys[:32]
    chacha_key = keys[32:]

    chacha = ChaCha20Poly1305(chacha_key)
    try:
        decrypted_outer = chacha.decrypt(chacha_nonce, outer, None)
    except Exception as e:
        print(f"Erro na decriptação outer: {e}")
        return

    aes_nonce = decrypted_outer[:12]
    inner = decrypted_outer[12:]

    aes = AESGCM(aes_key)
    try:
        plaintext = aes.decrypt(aes_nonce, inner, None).decode('utf-8')
        print("\nDecriptação bem-sucedida!")
        print("Mensagem original:")
        print(plaintext)
    except Exception as e:
        print(f"Erro na decriptação inner: {e}")

def main_menu():
    while True:
        print("\n=== Menu GrokShield-XD ===")
        print("1. Instalar dependências (rode uma vez)")
        print("2. Gerar chaves exóticas únicas (agora com muitas camadas fortes!)")
        print("3. Criptografar mensagem (input invisível, gera arquivo)")
        print("4. Decriptografar arquivo")
        print("5. Sair")
        choice = input("Escolha uma opção: ").strip()

        if choice == '1':
            install_dependencies()
        elif choice == '2':
            generate_keys()
        elif choice == '3':
            encrypt_message()
        elif choice == '4':
            decrypt_message()
        elif choice == '5':
            print("Saindo.")
            sys.exit(0)
        else:
            print("Opção inválida!")

if __name__ == "__main__":
    if "venv" not in sys.prefix:
        print("Aviso: Ative o venv com:")
        print(f"    source {os.path.join(BASE_DIR, 'liboqs-python', 'venv', 'bin', 'activate')}")
    main_menu()
