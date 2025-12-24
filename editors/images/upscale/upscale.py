# python3 installl pillow
from PIL import Image
import os

# input and output
INPUT_IMAGE = "input.jpg"          # put your file here
OUTPUT_DIR = "upscaled"           # folder for results

# target sizes (square for simplicity; change to (w, h) if you want)
TARGET_SIZES = {
    "800":   (800, 800),
    "1024":  (1024, 1024),
    "2048":  (2048, 2048),
    "3000":  (3000, 3000),
    "4k":    (3840, 2160),        # typical 4K UHD resolution
}

def upscale_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    img = Image.open(INPUT_IMAGE).convert("RGB")   # load source image[web:43][web:45]

    for label, size in TARGET_SIZES.items():
        up = img.resize(size, Image.Resampling.LANCZOS)  # high‑quality upscaling[web:44][web:30]
        base, ext = os.path.splitext(os.path.basename(INPUT_IMAGE))
        out_name = f"{base}_{label}{ext}"
        out_path = os.path.join(OUTPUT_DIR, out_name)
        up.save(out_path, quality=95)                   # high JPEG quality[web:46]
        print(f"Saved: {out_path} ({size[0]}x{size[1]})")

if __name__ == "__main__":
    upscale_all()
