# pip install pillow
from PIL import Image, ImageEnhance

# set your image path here
IMAGE_PATH = "your_image.jpg"      # put your file name or full path
OUTPUT_PATH = "red_neon.jpg"

def red_neon_effect(input_path, output_path,
                    red_boost=1.8, contrast_boost=1.6, brightness=0.7):
    img = Image.open(input_path).convert("RGB")  # opens path from variable [web:22][web:26]

    # darken image
    img = ImageEnhance.Brightness(img).enhance(brightness)

    # increase contrast
    img = ImageEnhance.Contrast(img).enhance(contrast_boost)

    # push colors toward red
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * red_boost)))
    g = g.point(lambda v: int(v * 0.4))
    b = b.point(lambda v: int(v * 0.2))

    img_red = Image.merge("RGB", (r, g, b))
    img_red.save(output_path)
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    red_neon_effect(IMAGE_PATH, OUTPUT_PATH)
