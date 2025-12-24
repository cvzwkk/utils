# pip install moviepy pillow

from moviepy.editor import VideoFileClip
from PIL import Image, ImageEnhance
import numpy as np

# configure your paths here
INPUT_VIDEO = "1.mp4"   # can be .mp4, .flv, .avi, etc.
OUTPUT_VIDEO = "output_red_neon.mp4"

# effect parameters
RED_BOOST = 1.8
CONTRAST_BOOST = 1.6
BRIGHTNESS = 0.7

def red_neon_frame(frame):
    # frame is a NumPy array (H, W, 3) uint8 in RGB[web:37]
    img = Image.fromarray(frame).convert("RGB")

    # darken
    img = ImageEnhance.Brightness(img).enhance(BRIGHTNESS)

    # increase contrast
    img = ImageEnhance.Contrast(img).enhance(CONTRAST_BOOST)

    # push colors toward red
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * RED_BOOST)))
    g = g.point(lambda v: int(v * 0.4))
    b = b.point(lambda v: int(v * 0.2))

    img_red = Image.merge("RGB", (r, g, b))
    return np.array(img_red)

def main():
    clip = VideoFileClip(INPUT_VIDEO)
    processed = clip.fl_image(red_neon_frame)   # applies function to every frame[web:37]
    processed.write_videofile(
        OUTPUT_VIDEO,
        codec="libx264",      # widely supported mp4 codec[web:32]
        audio_codec="aac"     # keep audio
    )

if __name__ == "__main__":
    main()
