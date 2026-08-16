# Directive: Clean Video Processing & Isolated Playback

## Goal
Process shared video links (YouTube, Instagram, TikTok, Twitter/X, Facebook) to extract metadata, download/transcode clean ad-free MP4s without platform tracking or social algorithms, and stream them securely to kid profiles in HAEVN.

## Inputs
- `url`: The raw video URL or share intent string (e.g. from Android share sheet).
- `family_id`: The ID of the family receiving the shared video.
- `recipients`: List of child user IDs assigned by the parent.

## Tools
- `execution/server.py`: FastAPI server running on port 9123.
  - Endpoint `POST /api/haevn/extract`: Returns clean title, description, duration, and thumbnail.
  - Endpoint `POST /api/haevn/download`: Invokes `yt-dlp` + `ffmpeg` with SponsorBlock and MP4 conversion.
  - Endpoint `GET /media/{filename}`: HTTP 206 partial content streaming for fast video scrubbing.

## Outputs
- Clean, ad-free H.264 MP4 stored in `execution/media/` or cloud storage.
- Instant, isolated video playback in HAEVN with zero external links, recommendations, or comments.

## Edge Cases
- **Messy Android Share Text**: If Instagram or YouTube shares text like *"Check out this video: https://youtu.be/xyz?si=123"*, the `sanitize_url` helper isolates the exact video URL and strips tracking parameters.
- **Short Links / Redirects**: `yt-dlp` automatically follows HTTP 301/302 redirects and resolves the underlying canonical ID.
- **Offline / Local Dev**: If backend server is unreachable, HAEVN gracefully falls back to a pointer-shielded, sandboxed embed with looped replay overlays.
