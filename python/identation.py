import subprocess
import sys
from pathlib import Path

def indent_python_file(path: str):
    file_path = Path(path)
    if not file_path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    # -i modifies the file in place, --aggressive can be added for stronger changes
    cmd = ["autopep8", "-i", str(file_path)]
    subprocess.run(cmd, check=True)
    print(f"Reformatted: {file_path}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python indent_script.py target.py")
        sys.exit(1)

    indent_python_file(sys.argv[1])
