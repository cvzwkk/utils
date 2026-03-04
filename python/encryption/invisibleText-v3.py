
!pip install -q wordfreq ipywidgets

from IPython.display import display, HTML, clear_output
import ipywidgets as widgets
import secrets
from wordfreq import top_n_list

# ---------------- WORD POOL ----------------
ENGLISH_WORDS = top_n_list('en', 200, wordlist='large')

# ---------------- KEY GENERATION ----------------
def generate_poem_key():
    return " ".join(secrets.choice(ENGLISH_WORDS) for _ in range(12)).capitalize() + "."

def xor_bytes(data: bytes, key_bytes: bytes) -> bytes:
    return bytes([b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data)])

# ---------------- VISIBLE POEM GENERATOR ----------------
def generate_visible_poem(required_length):
    lines = []
    while sum(len(l) for l in lines) < required_length:
        line = f"{secrets.choice(ENGLISH_WORDS).capitalize()} {secrets.choice(ENGLISH_WORDS)} {secrets.choice(ENGLISH_WORDS)}."
        lines.append(line)
    poem = "\n".join(lines)
    return poem[:required_length]

# ---------------- ZERO-WIDTH STEGO ----------------
def hide_data(cover_text: str, secret_bytes: bytes) -> str:
    binary = ''.join(format(b,'08b') for b in secret_bytes)
    result = list(cover_text)
    i = 0
    for j, c in enumerate(cover_text):
        if i >= len(binary):
            break
        result[j] = c + ('\u200b' if binary[i]=='1' else '\u200c')
        i += 1
    result.extend('\u200b' if b=='1' else '\u200c' for b in binary[i:])
    return ''.join(result)

def reveal_data(text: str) -> bytes:
    binary = ''.join('1' if c=='\u200b' else '0' for c in text if c in ['\u200b','\u200c'])
    return bytes(int(binary[i:i+8],2) for i in range(0,len(binary),8))

# ---------------- GUI ----------------
cover_text = widgets.Textarea(
    value="",
    placeholder="Enter visible text (optional, auto-generated if too short)...",
    layout=widgets.Layout(width="100%", height="140px")
)

secret_text = widgets.Password(
    value="",
    placeholder="Enter secret text...",
    layout=widgets.Layout(width="100%", height="40px")
)

reveal_text = widgets.Textarea(
    value="",
    placeholder="Paste hidden text...",
    layout=widgets.Layout(width="100%", height="160px")
)

key_input = widgets.Textarea(
    value="",
    placeholder="Paste poem key...",
    layout=widgets.Layout(width="100%", height="90px")
)

output_hide = widgets.Output()
output_reveal = widgets.Output()

btn_generate_cover = widgets.Button(
    description="🎨 Generate Auto-Sized Poem Cover",
    button_style="warning",
    layout=widgets.Layout(width="100%", height="40px")
)

btn_hide = widgets.Button(
    description="🔒 Hide Secret",
    button_style="success",
    layout=widgets.Layout(width="100%", height="50px")
)

btn_reveal = widgets.Button(
    description="🔓 Reveal Secret",
    button_style="info",
    layout=widgets.Layout(width="100%", height="50px")
)

# ---------------- HIDE FUNCTION ----------------
def on_hide(b):
    with output_hide:
        clear_output()
        if not secret_text.value.strip():
            print("❌ Secret text required.")
            return
        poem_key = generate_poem_key()
        key_bytes = poem_key.encode('utf-8')
        secret_bytes = secret_text.value.encode('utf-8') + b'\x00'
        encrypted = xor_bytes(secret_bytes, key_bytes)
        if len(cover_text.value) < len(encrypted):
            cover_text.value = generate_visible_poem(len(encrypted))
        hidden_text = hide_data(cover_text.value, encrypted)
        print("✅ Secret hidden successfully!")
        print("\n📋 Hidden text (looks normal):")
        print(hidden_text[:1000]+"..." if len(hidden_text)>1000 else hidden_text)
        print("\n🔑 Poem key (save separately):")
        print(poem_key)
        display(HTML(f"""
        <button onclick="navigator.clipboard.writeText(`{hidden_text.replace('`','\\`')}`)" 
            style="padding:14px 28px;background:#28a745;color:white;border:none;border-radius:8px;">Copy Hidden Text</button>
        <button onclick="navigator.clipboard.writeText(`{poem_key.replace('`','\\`')}`)" 
            style="padding:14px 28px;background:#007bff;color:white;border:none;border-radius:8px;">Copy Poem Key</button>
        """))

btn_hide.on_click(on_hide)

# ---------------- GENERATE COVER ----------------
def on_generate_cover(b):
    secret_bytes = secret_text.value.encode('utf-8') + b'\x00' if secret_text.value else b'x'*16
    cover_text.value = generate_visible_poem(len(secret_bytes))

btn_generate_cover.on_click(on_generate_cover)

# ---------------- REVEAL FUNCTION ----------------
def on_reveal(b):
    with output_reveal:
        clear_output()
        if not reveal_text.value.strip() or not key_input.value.strip():
            print("❌ Hidden text and poem key required.")
            return
        try:
            extracted = reveal_data(reveal_text.value)
            key_bytes = key_input.value.encode('utf-8')
            decrypted = xor_bytes(extracted, key_bytes)
            null_pos = decrypted.index(b'\x00')
            secret = decrypted[:null_pos].decode('utf-8')
            print("🔓 Secret decrypted successfully:")
            print(secret)
        except Exception:
            print("❌ Wrong key or corrupted hidden text.")

btn_reveal.on_click(on_reveal)

# ---------------- VIRTUAL KEYBOARD ----------------
keyboard_buttons = []

# Add normal keys
keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.!? "
for k in keys:
    btn = widgets.Button(description=k, layout=widgets.Layout(width='40px', height='40px'))
    def on_click(c):
        def inner(b):
            secret_text.value += c
        return inner
    btn.on_click(on_click(k))
    keyboard_buttons.append(btn)

# Add Spacebar
space_btn = widgets.Button(description="Space", layout=widgets.Layout(width='320px', height='40px'))
def add_space(b):
    secret_text.value += " "
space_btn.on_click(add_space)
keyboard_buttons.append(space_btn)

# Add Backspace
backspace_btn = widgets.Button(description="Backspace", layout=widgets.Layout(width='120px', height='40px'))
def backspace(b):
    secret_text.value = secret_text.value[:-1]
backspace_btn.on_click(backspace)
keyboard_buttons.append(backspace_btn)

# Arrange keyboard in grid
keyboard_grid = widgets.GridBox(keyboard_buttons, layout=widgets.Layout(grid_template_columns="repeat(12, 40px)", grid_gap="2px"))

# ---------------- DISPLAY ----------------
tab = widgets.Tab()
tab.children = [
    widgets.VBox([cover_text, secret_text, keyboard_grid, btn_generate_cover, btn_hide, output_hide]),
    widgets.VBox([reveal_text, key_input, btn_reveal, output_reveal])
]
tab.set_title(0,"🔒 Hide")
tab.set_title(1,"🔓 Reveal")

display(HTML("<h2>🕵️ Invisible Text Tool - Full Virtual Keyboard + Masked Secret</h2>"))
display(tab)
