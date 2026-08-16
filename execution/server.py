#!/usr/bin/env python3
"""
HAEVN Clean Media Processor Server
FastAPI microservice for extracting, downloading, cleaning (SponsorBlock),
and serving ad-free, algorithm-free videos for kids on HAEVN.
"""

import os
import sys
import json
import re
import asyncio
import subprocess
import hashlib
from typing import Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from pydantic import BaseModel, HttpUrl
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Also support public media folder in frontend if needed
PUBLIC_MEDIA_DIR = BASE_DIR.parent / "public" / "media"
PUBLIC_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="HAEVN Media Server",
    description="Clean, ad-free video extraction and stream server for HAEVN",
    version="1.0.0"
)

# Enable CORS for local dev, Capacitor webview, and PWA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    family_id: Optional[str] = None
    upload_to_firebase: Optional[bool] = False

class UrlParseRequest(BaseModel):
    text: str

def sanitize_url(raw_input: str) -> str:
    """Extract clean URL from raw text (e.g. Android share intent with caption)"""
    match = re.search(r'(https?://[^\s]+)', raw_input.strip())
    if match:
        url = match.group(1)
        # Strip trailing punctuation sometimes captured by regex
        url = url.rstrip(').,;!?')
        return url
    return raw_input.strip()

def get_safe_id(url: str) -> str:
    """Derive a deterministic ID for a URL"""
    # Try extracting YouTube ID
    yt_match = re.search(r'(?:v=|youtu\.be/|shorts/)([a-zA-Z0-9_-]{11})', url)
    if yt_match:
        return yt_match.group(1)
    
    # Try Instagram ID
    ig_match = re.search(r'instagram\.com/(?:p|reel|reels|tv)/([a-zA-Z0-9_-]+)', url)
    if ig_match:
        return f"ig_{ig_match.group(1)}"
    
    # Try TikTok ID
    tt_match = re.search(r'video/(\d+)', url)
    if tt_match:
        return f"tt_{tt_match.group(1)}"
    
    # Fallback to sha256 hash
    return hashlib.sha256(url.encode('utf-8')).hexdigest()[:16]

async def run_cmd(cmd_list: list) -> tuple[int, str, str]:
    """Execute command asynchronously with output capture"""
    proc = await asyncio.create_subprocess_exec(
        *cmd_list,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode, stdout.decode('utf-8', errors='replace'), stderr.decode('utf-8', errors='replace')

@app.get("/api/haevn/health")
async def health_check():
    """Health check for HAEVN app to detect if backend service is live"""
    code, stdout, _ = await run_cmd(["yt-dlp", "--version"])
    ytdlp_ver = stdout.strip() if code == 0 else "unavailable"
    return {
        "status": "ok",
        "service": "haevn-media-server",
        "ytdlp_version": ytdlp_ver,
        "media_dir": str(MEDIA_DIR)
    }

@app.post("/api/haevn/extract-url")
async def extract_url_from_text(req: UrlParseRequest):
    """Clean and extract video URL from Android share sheet text"""
    clean_url = sanitize_url(req.text)
    return {
        "raw": req.text,
        "clean_url": clean_url,
        "safe_id": get_safe_id(clean_url)
    }

@app.post("/api/haevn/extract")
async def extract_metadata(req: ExtractRequest):
    """
    Extract video metadata, thumbnail, clean stream info, and title using yt-dlp.
    Fast and does not download full media file.
    """
    clean_url = sanitize_url(req.url)
    if not clean_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL provided")

    cmd = [
        "yt-dlp",
        "-j",
        "--no-playlist",
        "--no-warnings",
        clean_url
    ]
    code, stdout, stderr = await run_cmd(cmd)

    if code != 0 or not stdout.strip():
        raise HTTPException(status_code=500, detail=f"yt-dlp failed to extract metadata: {stderr[:300]}")

    try:
        data = json.loads(stdout.strip())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse yt-dlp output")

    title = data.get("title") or data.get("fulltitle") or "Shared Video"
    description = data.get("description") or ""
    thumbnail = data.get("thumbnail") or None
    duration = data.get("duration") or 0
    uploader = data.get("uploader") or data.get("channel") or "Unknown Creator"
    video_id = data.get("id") or get_safe_id(clean_url)

    formats = data.get("formats", [])
    direct_stream_url = None
    for f in reversed(formats):
        if f.get("ext") == "mp4" and f.get("vcodec") != "none" and f.get("acodec") != "none":
            direct_stream_url = f.get("url")
            break

    return {
        "success": True,
        "videoId": video_id,
        "title": title,
        "description": description[:1000],
        "thumbnailUrl": thumbnail,
        "duration": duration,
        "uploader": uploader,
        "directStreamUrl": direct_stream_url,
        "originalUrl": clean_url
    }

@app.post("/api/haevn/download")
async def download_clean_video(req: DownloadRequest, request: Request):
    """
    Download video via yt-dlp:
    1. Removes ads and sponsored segments using SponsorBlock
    2. Encodes to universal H.264 MP4 with AAC audio
    3. Saves into media directory for direct streaming
    4. Returns local streaming URL
    """
    clean_url = sanitize_url(req.url)
    if not clean_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL provided")

    safe_id = get_safe_id(clean_url)
    output_filename = f"{safe_id}.mp4"
    output_path = MEDIA_DIR / output_filename
    public_copy_path = PUBLIC_MEDIA_DIR / output_filename

    # If file already exists and is > 10KB, return existing
    if output_path.exists() and output_path.stat().st_size > 10240:
        base_url = str(request.base_url).rstrip('/')
        stream_url = f"{base_url}/media/{output_filename}"
        
        return {
            "success": True,
            "videoId": safe_id,
            "filename": output_filename,
            "localVideoUrl": stream_url,
            "cached": True
        }

    # Execute yt-dlp download with SponsorBlock and MP4 conversion
    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--no-warnings",
        "-f", "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--sponsorblock-remove", "all",
        "-o", str(output_path),
        clean_url
    ]

    code, stdout, stderr = await run_cmd(cmd)

    if code != 0 or not output_path.exists():
        # Fallback without sponsorblock (e.g., for Instagram/TikTok/Facebook)
        cmd_fallback = [
            "yt-dlp",
            "--no-playlist",
            "--no-warnings",
            "-f", "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", str(output_path),
            clean_url
        ]
        code2, stdout2, stderr2 = await run_cmd(cmd_fallback)
        if code2 != 0 or not output_path.exists():
            raise HTTPException(
                status_code=500,
                detail=f"Failed to download clean video: {stderr2[:300] or stderr[:300]}"
            )

    # Sync a copy to public/media
    try:
        if output_path.exists():
            import shutil
            shutil.copy2(str(output_path), str(public_copy_path))
    except Exception as e:
        print(f"Warning: Could not copy to public folder: {e}")

    base_url = str(request.base_url).rstrip('/')
    stream_url = f"{base_url}/media/{output_filename}"

    return {
        "success": True,
        "videoId": safe_id,
        "filename": output_filename,
        "localVideoUrl": stream_url,
        "fileSize": output_path.stat().st_size if output_path.exists() else 0,
        "cached": False
    }

@app.get("/media/{filename}")
async def serve_media(filename: str, request: Request):
    """
    Stream video file with support for HTTP Range requests (206 Partial Content).
    Enables seeking and low-latency playback in HTML5 <video>.
    """
    file_path = MEDIA_DIR / filename
    if not file_path.exists():
        file_path = PUBLIC_MEDIA_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Media file not found")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
            start = max(0, start)
            end = min(file_size - 1, end)
            content_length = end - start + 1

            def iter_file():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    bytes_remaining = content_length
                    while bytes_remaining > 0:
                        chunk_size = min(bytes_remaining, 1024 * 1024)
                        data = f.read(chunk_size)
                        if not data:
                            break
                        bytes_remaining -= len(data)
                        yield data

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": "video/mp4",
            }
            return StreamingResponse(iter_file(), status_code=206, headers=headers)

    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9123)
