from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from pyngrok import ngrok, conf
import uvicorn
import os
import shutil
import urllib.parse

# =========================
# CONFIG
# =========================
NGROK_AUTH_TOKEN = "YOUR NGROK TOKEN"
PORT = 8008
BASE_DIR = "/home/server/"

conf.get_default().auth_token = NGROK_AUTH_TOKEN
os.makedirs(BASE_DIR, exist_ok=True)
app = FastAPI()

@app.get("/", response_class=HTMLResponse)
@app.get("/browse/{subpath:path}", response_class=HTMLResponse)
def index(subpath: str = ""):
    # Safely join paths to prevent directory traversal attacks
    target_dir = os.path.join(BASE_DIR, subpath)
    
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail="Directory not found")

    files = os.listdir(target_dir)
    
    # Generate Links
    links = []
    
    # Add a "Go Back" link if not in root
    if subpath:
        parent = os.path.dirname(subpath)
        links.append(f'<li><b><a href="/browse/{parent}">[ .. ] Parent Directory</a></b></li>')

    for f in sorted(files):
        relative_path = os.path.join(subpath, f)
        full_path = os.path.join(BASE_DIR, relative_path)
        
        if os.path.isdir(full_path):
            # If it's a folder, link to the browse route
            links.append(f'<li>📁 <a href="/browse/{relative_path}">{f}/</a></li>')
        else:
            # If it's a file, link to the download route
            links.append(f'<li>📄 <a href="/download/{relative_path}">{f}</a></li>')

    links_html = "".join(links)
    
    return f"""
    <html>
        <body style="font-family: sans-serif; padding: 20px;">
            <h2>Current Location: / {subpath}</h2>
            <hr>
            <h3>Upload to this Folder</h3>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="hidden" name="subpath" value="{subpath}">
                <input type="file" name="file">
                <input type="submit">
            </form>
            <hr>
            <h3>Contents</h3>
            <ul>{links_html}</ul>
        </body>
    </html>
    """

@app.post("/upload")
def upload(file: UploadFile = File(...), subpath: str = ""):
    # Ensure the subpath exists
    target_dir = os.path.join(BASE_DIR, subpath)
    os.makedirs(target_dir, exist_ok=True)
    
    path = os.path.join(target_dir, file.filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"uploaded_to": subpath, "filename": file.filename}

@app.get("/download/{filepath:path}")
def download(filepath: str):
    path = os.path.join(BASE_DIR, filepath)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=os.path.basename(path))

if __name__ == "__main__":
    # Note: Check if ngrok is already running to avoid errors
    try:
        public_url = ngrok.connect(PORT)
        print("Public URL:", public_url)
    except Exception as e:
        print("Ngrok connection failed (might already be connected):", e)
        
    uvicorn.run(app, host="0.0.0.0", port=PORT)
