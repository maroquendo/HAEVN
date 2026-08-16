#!/usr/bin/env python3
"""
Test script for HAEVN clean video processor
"""

import sys
import os
import asyncio
from pathlib import Path

# Add execution directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from server import sanitize_url, get_safe_id, run_cmd

async def main():
    print("Testing URL sanitization...")
    sample_text_yt = "Hey check out this video: https://youtu.be/dQw4w9WgXcQ?si=abcdefg from YouTube!"
    clean_yt = sanitize_url(sample_text_yt)
    print(f"  Raw:   {sample_text_yt}")
    print(f"  Clean: {clean_yt}")
    assert clean_yt == "https://youtu.be/dQw4w9WgXcQ?si=abcdefg"
    safe_id_yt = get_safe_id(clean_yt)
    print(f"  Safe ID: {safe_id_yt}")
    assert safe_id_yt == "dQw4w9WgXcQ"

    sample_text_ig = "Check this reel https://www.instagram.com/reel/C8XYZ123/?igsh=token."
    clean_ig = sanitize_url(sample_text_ig)
    print(f"  Clean IG: {clean_ig}")
    safe_id_ig = get_safe_id(clean_ig)
    print(f"  Safe ID IG: {safe_id_ig}")
    assert safe_id_ig == "ig_C8XYZ123"

    print("\nTesting yt-dlp metadata extraction...")
    code, stdout, stderr = await run_cmd([
        "yt-dlp", "-j", "--no-playlist", "--no-warnings", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    ])
    assert code == 0, f"yt-dlp failed: {stderr}"
    print("yt-dlp successfully extracted JSON metadata!")
    print("\nAll unit tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
