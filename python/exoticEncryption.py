#!/usr/bin/env python3
import os
import sys
import subprocess
import getpass
import secrets
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.kdf.argon2 import Argon2id
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
import oqs  # Assumes liboqs-python is installed

# Diretórios e arquivos
BASE_DIR = os.path.expanduser("\~/pq-crypto")
KEY_DIR = os.path.join(BASE_DIR, "keys")
ENCRYPTED_FILE = os.path.join(BASE_DIR, "encrypted_message.bin")

# Algoritmos para GrokShield-3D (exótico e único criado por Grok para Gustavo Joel De Souza de Palhoça)
ALGS = {
    'hqc':    'HQC-256',          # Camada 1: Code-based
    'frodo':  'FrodoKEM-1344AES', # Camada 2: LWE conservador
    'mlkem':  'ML-KEM-1024',      # Camada 3: Lattice NIST max
}

def install_dependencies():
    print("Instalando dependências... Isso pode demorar 10-20 minutos.")
    try:
        # Atualiza sistema e instala pacotes básicos
        subprocess.run(["sudo", "apt", "update"], check=True)
        subprocess.run(["sudo", "apt", "install", "-y", "git", "cmake", "ninja-build", "build-essential", "libssl-dev", "python3", "python3-venv", "python3-pip"], check=True)

        # Cria pasta de trabalho se não existir
        os.makedirs(BASE_DIR, exist_ok=True)
        os.chdir(BASE_DIR)

        # Clone e build liboqs
        if not os.path.exists("liboqs"):
            subprocess.run(["git", "clone", "--depth=1", "https://github.com/open-quantum-safe/liboqs.git"], check=True)
        os.chdir("liboqs")
        os.makedirs("build", exist_ok=True)
        os.chdir("build")
        subprocess.run(["cmake", "-GNinja", "-DBUILD_SHARED_LIBS=ON", "-DOQS_DIST_BUILD=ON", ".."], check=True)
        subprocess.run(["ninja", "-j$(nproc)"], check=True)
        subprocess.run(["sudo", "ninja", "install"], check=True)

        # Volta e instala liboqs-python
        os.chdir(BASE_DIR)
        if not os.path.exists("liboqs-python"):
            subprocess.run(["git", "clone", "--depth=1", "https://github.com/open-quantum-safe/liboqs-python.git"], check=True)
        os.chdir("liboqs-python")

        # Cria venv se não existir
        if not os.path.exists("venv"):
            subprocess.run(["python3", "-m", "venv", "venv"], check=True)
        subprocess.run(["venv/bin/pip", "install", "--upgrade", "pip"], check=True)
        subprocess.run(["venv/bin/pip", "install", "cryptography"], check=True)
        subprocess.run(["venv/bin/pip", "install", "."], check=True)

        print("Instalação concluída! Ative o venv com: source \~/pq-crypto/liboqs-python/venv/bin/activate")
        print("Em seguida, rode o script novamente para as outras opções.")
    except subprocess.CalledProcessError as e:
        print(f"Erro na instalação: {e}")
        sys.exit(1)

def generate_keys():
    os.makedirs(KEY_DIR, exist_ok=True)
    for name, alg in ALGS.items():
        pub_file = os.path.join(KEY_DIR, f"{name}_pub.bin")
        sec_file = os.path.join(KEY_DIR, f"{name}_sec.bin")
        
        if os.path.exists(pub_file):
            print(f"Chaves para {alg} já existem. Pulando.")
            continue
        
        print(f"Gerando chaves exóticas únicas para {alg} (especial para Gustavo Joel De Souza de Palhoça)...")
        kem = oqs.KeyEncapsulation(alg)
        pub = kem.generate_keypair()
        sec = kem.export_secret_key()
        with open(pub_file, 'wb') as f: f.write(pub)
        with open(sec_file, 'wb') as f: f.write(sec)
        print(f"  → {name} gerada (pub \~{len(pub)//1024} KB)")
    
    print("Todas as chaves GrokShield-3D geradas!")

def encrypt_message():
    # Input invisível
    message = getpass.getpass("Digite a mensagem secreta (não será exibida): ")
    if not message:
        print("Mensagem vazia. Cancelando.")
        return

    # Carrega chaves públicas
    pubs = {}
    for name in ALGS:
        pub_file = os.path.join(KEY_DIR, f"{name}_pub.bin")
        with open(pub_file, "rb") as f:
            pubs[name] = f.read()

    # Chain exótico
    shared = secrets.token_bytes(64)
    cts = []
    salts_chain = []
    for name, alg in ALGS.items():
        kem = oqs.KeyEncapsulation(alg)
        ct, ss = kem.encap_secret(pubs[name])
        cts.append(ct)
        salt = os.urandom(16)
        salts_chain.append(salt)
        hkdf = HKDF(hashes.SHA3_512(), 64, salt, b'grok-3d-chain-' + name.encode())
        shared = hkdf.derive(ss + shared)

    # GrokTwist único
    twist_salt = os.urandom(32)
    pbkdf = PBKDF2HMAC(hashes.SHA3_512(), 64, twist_salt, 500_000)
    twist = pbkdf.derive(shared)
    for _ in range(8):
        twist = hashes.Hash(hashes.SHA3_512()).update(twist).finalize()

    argon_salt = os.urandom(16)
    argon = Argon2id(argon_salt, time_cost=8, memory_cost=524288, parallelism=4, hash_len=64)
    final_shared = argon.derive(twist)

    # Symmetric
    sym_salt = os.urandom(16)
    hkdf_sym = HKDF(hashes.SHA512(), 64, sym_salt, b'grok-3d-sym')
    keys = hkdf_sym.derive(final_shared)
    aes_key = keys[:32]
    chacha_key = keys[32:]

    aes_nonce = os.urandom(12)
    aes = AESGCM(aes_key)
    inner = aes.encrypt(aes_nonce, message.encode(), None)

    chacha_nonce = os.urandom(12)
    chacha = ChaCha20Poly1305(chacha_key)
    outer = chacha.encrypt(chacha_nonce, aes_nonce + inner, None)

    # Salva arquivo único
    with open(ENCRYPTED_FILE, "wb") as f:
        f.write(b'GROK3D\x01\x03')  # Magic + versão + camadas
        for ct, salt in zip(cts, salts_chain):
            f.write(len(ct).to_bytes(4, 'big') + ct + salt)
        f.write(twist_salt + argon_salt + sym_salt + chacha_nonce + outer)

    print(f"Arquivo criptografado gerado: {ENCRYPTED_FILE}")
    print(f"Tamanho: {os.path.getsize(ENCRYPTED_FILE) // 1024} KB")

def decrypt_message():
    if not os.path.exists(ENCRYPTED_FILE):
        print(f"Arquivo {ENCRYPTED_FILE} não encontrado!")
        return

    with open(ENCRYPTED_FILE, "rb") as f:
        data = f.read()

    pos = 0
    magic = data[pos:pos+6]; pos += 6
    if magic != b'GROK3D\x01':
        print("Formato inválido!")
        return

    num_layers = data[pos]; pos += 1

    alg_list = list(ALGS.values())
    name_list = list(ALGS.keys())

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

    # Carrega chaves secretas
    secs = {}
    for name in name_list:
        sec_file = os.path.join(KEY_DIR, f"{name}_sec.bin")
        with open(sec_file, "rb") as f:
            secs[name] = f.read()

    # Reconstrói chain (shared inicial fixo para demo - ajuste para PSK real se necessário)
    shared = b'\x00' * 64  # Placeholder - em produção, use getpass para PSK

    for i in range(num_layers):
        alg = alg_list[i]
        name = name_list[i]
        kem = oqs.KeyEncapsulation(alg, secret_key=secs[name])
        ss = kem.decap_secret(cts[i])
        hkdf = HKDF(hashes.SHA3_512(), 64, salts_chain[i], b'grok-3d-chain-' + name.encode())
        shared = hkdf.derive(ss + shared)

    # GrokTwist
    pbkdf = PBKDF2HMAC(hashes.SHA3_512(), 64, twist_salt, 500_000)
    twist = pbkdf.derive(shared)
    for _ in range(8):
        twist = hashes.Hash(hashes.SHA3_512()).update(twist).finalize()

    argon = Argon2id(argon_salt, time_cost=8, memory_cost=524288, parallelism=4, hash_len=64)
    final_shared = argon.derive(twist)

    # Symmetric decrypt
    hkdf_sym = HKDF(hashes.SHA512(), 64, sym_salt, b'grok-3d-sym')
    keys = hkdf_sym.derive(final_shared)
    aes_key = keys[:32]
    chacha_key = keys[32:]

    chacha = ChaCha20Poly1305(chacha_key)
    try:
        decrypted_outer = chacha.decrypt(chacha_nonce, outer, None)
    except:
        print("Erro na decriptação outer!")
        return

    aes_nonce = decrypted_outer[:12]
    inner = decrypted_outer[12:]

    aes = AESGCM(aes_key)
    try:
        plaintext = aes.decrypt(aes_nonce, inner, None).decode('utf-8')
        print("\nDecriptação bem-sucedida!")
        print("Mensagem original:")
        print(plaintext)
    except:
        print("Erro na decriptação inner!")

def main_menu():
    while True:
        print("\n=== Menu GrokShield-3D ===")
        print("1. Instalar dependências (rode uma vez)")
        print("2. Gerar chaves exóticas únicas")
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
            print("Hug")
            sys.exit(0)
        else:
            print("Opção inválida!")

if __name__ == "__main__":
    # Verifica se venv está ativado (opcional, mas útil)
    if "venv" not in sys.prefix:
        print("Aviso: Ative o venv com: source \~/pq-crypto/liboqs-python/venv/bin/activate")
    main_menu()
