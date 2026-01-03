#!pip install pyapkdownloader
from PyAPKDownloader.aptoide import Aptoide
import os

# Create downloads directory
os.makedirs("apks", exist_ok=True)

# Initialize downloader
downloader = Aptoide()

# Download APK (adjust package_name as needed)
downloader.download_by_package_name(
    package_name="com.zerotier.one",
    file_name="ZeroTier One",
    version="latest",
    in_background=False,
    limit=30  # Search depth; higher = slower but more thorough
)
print("Download completed! Check the 'apks' folder.")
