
!pip install -q wordfreq ipywidgets

from IPython.display import display, HTML, clear_output
import ipywidgets as widgets
import secrets
import random
from wordfreq import top_n_list

# ---------------- RANDOMIZED WORD POOL ----------------
# Pulling a larger set for more variety in the "History"
WORD_POOL = top_n_list('en', 1000, wordlist='large')

def generate_random_lore(min_length):
    """Generates a pseudo-historical text using random words."""
    words = []
    current_length = 0
    while current_length < min_length:
        # Create a 'sentence' of 5-12 random words
        sentence_len = random.randint(5, 12)
        sentence_words = [random.choice(WORD_POOL) for _ in range(sentence_len)]
        sentence = " ".join(sentence_words).capitalize() + ". "
        words.append(sentence)
        current_length += len(sentence)
    
    return "".join(words).strip()

# ---------------- CRYPTO & STEGO LOGIC ----------------
ENGLISH_WORDS_KEY = top_n_list('en', 200, wordlist='large')

def generate_poem_key():
    return " ".join(secrets.choice(ENGLISH_WORDS_KEY) for _ in range(12)).capitalize() + "."

def xor_bytes(data: bytes, key_bytes: bytes) -> bytes:
    return bytes([b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data)])

def hide_data(cover_text: str, secret_bytes: bytes) -> str:
    binary = ''.join(format(b,'08b') for b in secret_bytes)
    result = []
    cover_chars = list(cover_text)
    
    for i in range(len(binary)):
        stego_char = '\u200b' if binary[i] == '1' else '\u200c'
        if i < len(cover_chars):
            result.append(cover_chars[i] + stego_char)
        else:
            result.append(stego_char)
            
    if len(cover_chars) > len(binary):
        result.extend(cover_chars[len(binary):])
        
    return ''.join(result)

def reveal_data(text: str) -> bytes:
    binary = ''.join('1' if c == '\u200b' else '0' for c in text if c in ['\u200b', '\u200c'])
    clean_binary = binary[:(len(binary) // 8) * 8]
    if not clean_binary: return b''
    return bytes(int(clean_binary[i:i+8], 2) for i in range(0, len(clean_binary), 8))

# ---------------- UI COMPONENTS ----------------
secret_input = widgets.Textarea(placeholder="Type secret message...", layout=widgets.Layout(width="100%", height="120px"))
cover_input = widgets.Textarea(placeholder="Optional: Manual cover text...", layout=widgets.Layout(width="100%", height="80px"))
reveal_area = widgets.Textarea(placeholder="Paste hidden text here...", layout=widgets.Layout(width="100%", height="120px"))
key_input = widgets.Textarea(placeholder="Paste Poem Key...", layout=widgets.Layout(width="100%", height="60px"))

output_hide = widgets.Output()
output_reveal = widgets.Output()

# ---------------- VIRTUAL KEYBOARD ----------------
def insert_text(char):
    secret_input.value += char

def on_key_click(b):
    if b.description == "Space": insert_text(" ")
    elif b.description == "Enter": insert_text("\n")
    elif b.description == "Backspace": secret_input.value = secret_input.value[:-1]
    else: insert_text(b.description)

keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.!? "
buttons = [widgets.Button(description=k, layout=widgets.Layout(width='35px', height='35px')) for k in keys]
for btn in buttons: btn.on_click(on_key_click)

ent_btn = widgets.Button(description="Enter", button_style='info', layout=widgets.Layout(width='72px'))
ent_btn.on_click(on_key_click)
back_btn = widgets.Button(description="Backspace", button_style='danger', layout=widgets.Layout(width='72px'))
back_btn.on_click(on_key_click)

kb_layout = widgets.VBox([
    widgets.GridBox(buttons, layout=widgets.Layout(grid_template_columns="repeat(14, 38px)")),
    widgets.HBox([ent_btn, back_btn])
])

# ---------------- ACTIONS ----------------
def on_hide(b):
    with output_hide:
        clear_output()
        if not secret_input.value.strip():
            print("❌ Input is empty.")
            return
        
        poem_key = generate_poem_key()
        key_bytes = poem_key.encode('utf-8')
        secret_bytes = secret_input.value.encode('utf-8') + b'\x00'
        encrypted = xor_bytes(secret_bytes, key_bytes)
        
        final_cover = cover_input.value.strip()
        if len(final_cover) < len(encrypted):
            final_cover = generate_random_lore(len(encrypted))
        
        stego_text = hide_data(final_cover, encrypted)
        
        print("✅ Data Hidden in Random Text.")
        print(f"\n🔑 POEM KEY:\n{poem_key}")
        
        display(HTML(f"""
            <div style="margin-top:10px;">
                <button onclick="navigator.clipboard.writeText(`{stego_text}`)" style="padding:12px; background:#28a745; color:white; border:none; border-radius:5px; cursor:pointer;">Copy Text</button>
                <button onclick="navigator.clipboard.writeText(`{poem_key}`)" style="padding:12px; background:#007bff; color:white; border:none; border-radius:5px; cursor:pointer;">Copy Key</button>
            </div>
        """))

def on_reveal(b):
    with output_reveal:
        clear_output()
        try:
            raw_data = reveal_data(reveal_area.value)
            k_bytes = key_input.value.strip().encode('utf-8')
            decrypted = xor_bytes(raw_data, k_bytes)
            
            if b'\x00' in decrypted:
                final_msg = decrypted[:decrypted.index(b'\x00')].decode('utf-8')
                print("🔓 REVEALED:\n")
                print(final_msg)
            else:
                print("❌ Decryption failed. Check key/text.")
        except Exception:
            print("❌ Error processing hidden text.")

btn_do_hide = widgets.Button(description="🔒 Hide in Random Words", button_style="success", layout=widgets.Layout(width="100%", height="45px"))
btn_do_reveal = widgets.Button(description="🔓 Reveal", button_style="primary", layout=widgets.Layout(width="100%", height="45px"))

btn_do_hide.on_click(on_hide)
btn_do_reveal.on_click(on_reveal)

# ---------------- DISPLAY ----------------
tabs = widgets.Tab(children=[
    widgets.VBox([widgets.Label("Secret Message (Supports multi-line):"), secret_input, kb_layout, btn_do_hide, output_hide]),
    widgets.VBox([widgets.Label("Paste Hidden Text:"), reveal_area, widgets.Label("Paste Key:"), key_input, btn_do_reveal, output_reveal])
])
tabs.set_title(0, "Hide")
tabs.set_title(1, "Reveal")

display(HTML("<h2>📜 Random Word Steganography</h2>"))
display(tabs)
