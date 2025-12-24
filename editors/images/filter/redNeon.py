# pip install pillow
# usage: python3 redNeon.py img.jpeg
from PIL import Image, ImageEnhance
import sys

def red_neon_effect(input_path, output_path="red_neon.jpg",
                    red_boost=1.8, contrast_boost=1.6, brightness=0.7):
    # open image
    img = Image.open(input_path).convert("RGB")

    # darken image
    enhancer_b = ImageEnhance.Brightness(img)
    img = enhancer_b.enhance(brightness)

    # increase contrast
    enhancer_c = ImageEnhance.Contrast(img)
    img = enhancer_c.enhance(contrast_boost)

    # push colors toward red
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * red_boost)))
    g = g.point(lambda v: int(v * 0.4))
    b = b.point(lambda v: int(v * 0.2))

    img_red = Image.merge("RGB", (r, g, b))
    img_red.save(output_path)
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python red_neon.py <input_image>")
        sys.exit(1)
    red_neon_effect(sys.argv[1])
