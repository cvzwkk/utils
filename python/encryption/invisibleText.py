
# ================================================
# INVISIBLE TEXT TOOL - BLANK VERSION (user types everything)
# Start empty every time you run the notebook
# ================================================

from IPython.display import display, clear_output, HTML
import ipywidgets as widgets
import math

print("🔧 Loading your clean menu... (boxes are empty)")

# ================== CORE FUNCTIONS ==================
def hide_message(cover, secret):
    if not secret:
        return cover
    secret_bytes = (secret + '\x00').encode('utf-8')
    binary = ''.join(format(b, '08b') for b in secret_bytes)
    
    result = []
    i = 0
    for char in cover:
        result.append(char)
        if i < len(binary):
            result.append('\u200b' if binary[i] == '1' else '\u200c')
            i += 1
    while i < len(binary):
        result.append('\u200b' if binary[i] == '1' else '\u200c')
        i += 1
    return ''.join(result)

def reveal_message(text):
    binary = ''
    for char in text:
        if char == '\u200b': binary += '1'
        elif char == '\u200c': binary += '0'
    
    bytes_list = []
    i = 0
    while i + 8 <= len(binary):
        byte = int(binary[i:i+8], 2)
        if byte == 0:
            break
        bytes_list.append(byte)
        i += 8
    try:
        return bytes(bytes_list).decode('utf-8')
    except:
        return "❌ Error decoding"

# ================== EMPTY BOXES (user fills every time) ==================
cover_text = widgets.Textarea(
    value="",                                    # ← starts empty
    placeholder="Digite aqui o texto visível (normal)...\nExemplo: O dia está lindo.",
    description="📝 Visible Text (normal):",
    layout=widgets.Layout(width="100%", height="160px")
)

secret_text = widgets.Textarea(
    value="",                                    # ← starts empty
    placeholder="Digite aqui o texto secreto...\nPode ter muitas palavras, números, senha, etc.",
    description="🔒 Secret Text (long + numbers):",
    layout=widgets.Layout(width="100%", height="140px")
)

counter_label = widgets.Label(value="Secret: 0 characters")
warning_label = widgets.Label(value="")

def update_counter(change):
    secret_len = len(secret_text.value)
    bits_needed = secret_len * 8 + 8
    min_cover = math.ceil(bits_needed)
    counter_label.value = f"🔢 Secret: {secret_len} characters | Minimum visible text needed: \~{min_cover}"
    
    if len(cover_text.value) < min_cover and secret_len > 0:
        warning_label.value = "⚠️ Visible text is too short! Secret may not hide completely."
        warning_label.style.text_color = "red"
    else:
        warning_label.value = "✅ Good! Your visible text can hold the secret."
        warning_label.style.text_color = "green"

secret_text.observe(update_counter, names='value')
cover_text.observe(update_counter, names='value')

# Hide button
btn_hide = widgets.Button(description="🔒 Hide Secret Message", button_style="success", layout=widgets.Layout(width="100%", height="50px"))
output_hide = widgets.Output()

def on_hide(b):
    with output_hide:
        clear_output()
        result = hide_message(cover_text.value, secret_text.value)
        print("✅ Secret hidden!\nCopy the text below (looks 100% normal):")
        print("="*80)
        print(result)
        print("="*80)
        display(HTML(f"""
        <button onclick="navigator.clipboard.writeText(`{result.replace('`','\\`')}`)" 
                style="padding:14px 28px; font-size:16px; background:#28a745; color:white; border:none; border-radius:8px;">
            📋 Copy Hidden Text
        </button>
        """))

btn_hide.on_click(on_hide)
hide_box = widgets.VBox([cover_text, secret_text, counter_label, warning_label, btn_hide, output_hide])

# Reveal button
reveal_text = widgets.Textarea(
    value="",
    placeholder="Cole aqui o texto escondido...",
    description="Paste hidden text here:",
    layout=widgets.Layout(width="100%", height="200px")
)

btn_reveal = widgets.Button(description="🔓 Reveal Secret Message", button_style="info", layout=widgets.Layout(width="100%", height="50px"))
output_reveal = widgets.Output()

def on_reveal(b):
    with output_reveal:
        clear_output()
        secret = reveal_message(reveal_text.value)
        if secret.strip():
            print("🔓 SECRET FOUND:")
            print("="*60)
            print(secret)
            print("="*60)
        else:
            print("❌ No secret message found.")

btn_reveal.on_click(on_reveal)
reveal_box = widgets.VBox([reveal_text, btn_reveal, output_reveal])

# ================== TABS ==================
tab = widgets.Tab()
tab.children = [hide_box, reveal_box]
tab.set_title(0, "🔒 Hide")
tab.set_title(1, "🔓 Reveal")

title = HTML("<h2>🕵️‍♂️ Invisible Text Tool - Blank Version</h2><p>Boxes start empty every time. Type your own texts!</p>")
display(title)
display(tab)

# Initial update
update_counter(None)
