
import requests
import tempfile
import runpy
import os
import sys
import subprocess

# GitHub repo info
OWNER = "cvzwkk"
REPO = "utils"
BRANCH = "main"
FOLDER_PATH = "python/encryption"

API_URL = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{FOLDER_PATH}?ref={BRANCH}"
RAW_BASE = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/{FOLDER_PATH}"


def get_file_list():
    """Fetch all .py files from GitHub folder"""
    try:
        r = requests.get(API_URL)
        r.raise_for_status()
        data = r.json()
        return [item["name"] for item in data if item["type"] == "file" and item["name"].endswith(".py")]
    except Exception as e:
        print("❌ Failed to fetch file list:", e)
        return []


def fetch_code(filename):
    """Fetch raw code of a file"""
    url = f"{RAW_BASE}/{filename}"
    print(f"\n🔗 Fetching: {url}")
    try:
        r = requests.get(url)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print("❌ Failed to fetch script:", e)
        return None


def sanitize_code(code):
    """Remove Colab/Jupyter magic commands"""
    lines = code.splitlines()
    filtered = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("!pip install"):
            # Auto-install dependencies
            install_packages(stripped)
        if not stripped.startswith(("!", "%")):
            filtered.append(line)
    return "\n".join(filtered)


def install_packages(pip_line):
    """Install dependencies from !pip install command"""
    pkg = pip_line[len("!pip install"):].strip().split()
    if pkg:
        print(f"📦 Installing dependencies: {' '.join(pkg)}")
        subprocess.run([sys.executable, "-m", "pip", "install"] + pkg)


def load_and_replace_primary(code):
    """Replace primary script with remote code and run"""
    code = sanitize_code(code)

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
        f.write(code)
        temp_file = f.name

    # Set sys.argv[0] to mimic running the new script directly
    sys.argv[0] = temp_file
    print(f"\n🚀 Running script as primary process: {temp_file}\n")
    runpy.run_path(temp_file, run_name="__main__")

    # Clean up temporary file
    try:
        os.remove(temp_file)
    except Exception:
        pass


def menu():
    while True:
        files = get_file_list()
        if not files:
            print("⚠️ No Python files found in the folder.")
            return

        print("\n📜 Available Scripts:")
        for i, file in enumerate(files, 1):
            print(f"{i}. {file}")
        print("0. Exit")

        choice = input("\nSelect script number: ").strip()
        if choice == "0":
            print("👋 Goodbye!")
            break

        if not choice.isdigit() or not (1 <= int(choice) <= len(files)):
            print("⚠️ Invalid selection.")
            continue

        selected_file = files[int(choice) - 1]
        code = fetch_code(selected_file)
        if code:
            # Replace primary script with selected script
            load_and_replace_primary(code)
            break  # exit menu after loading new script


if __name__ == "__main__":
    menu()
