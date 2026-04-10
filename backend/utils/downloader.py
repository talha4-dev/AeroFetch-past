import yt_dlp
import os
import re
import logging
import platform
import shutil
import random
from config import Config

# Rotate between multiple realistic user agents to bypass bot detection
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
]

# Determine FFmpeg location based on Platform
if platform.system() == "Windows":
    # Local path for Windows persistence
    FFMPEG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'bin', 'ffmpeg.exe')
else:
    # Linux (Render) uses system-installed ffmpeg
    FFMPEG_PATH = "ffmpeg"

# Configure logging safely
try:
    os.makedirs(Config.LOG_FOLDER, exist_ok=True)
    log_file = os.path.join(Config.LOG_FOLDER, 'downloader.log')
    logging.basicConfig(
        filename=log_file,
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
except Exception as e:
    # On some read-only systems, we'll just log to console
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    print(f"Warning: Falling back to console logging: {e}")
logger = logging.getLogger('downloader')

class YDLLogger:
    def debug(self, msg):
        if msg.startswith('[debug] '):
            pass
        else:
            self.info(msg)
    def info(self, msg):
        logger.info(msg)
    def warning(self, msg):
        logger.warning(msg)
    def error(self, msg):
        logger.error(msg)

def format_duration(seconds):
    if not seconds:
        return 'Unknown'
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f'{hours}:{minutes:02d}:{secs:02d}'
    return f'{minutes}:{secs:02d}'

def format_filesize(bytes_size):
    if not bytes_size:
        return 'Unknown'
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024:
            return f'{bytes_size:.1f} {unit}'
        bytes_size /= 1024
    return f'{bytes_size:.1f} TB'

def validate_cookies(cookie_path):
    """Validate cookies have required YouTube authentication"""
    try:
        if not cookie_path or not os.path.exists(cookie_path):
            return False
        with open(cookie_path, 'r') as f:
            content = f.read()
            
        # Check for ESSENTIAL cookies
        required_cookies = ['CONSENT', 'LOGIN_INFO', 'PREF']
        missing = [cookie for cookie in required_cookies if cookie not in content]
        
        if missing:
            logger.warning(f"Missing required cookies: {missing}")
            return False
            
        logger.info("Cookies validation passed - all essential cookies present")
        return True
        
    except Exception as e:
        logger.error(f"Cookie validation failed: {e}")
        return False

def get_cookies_path():
    """Get cookies path with validation and automatic fixes"""
    try:
        # On Render, secret files are read-only. We check the secret path first.
        cookie_path = Config.COOKIES_FILE
        
        if not cookie_path or not os.path.exists(cookie_path):
            logger.warning("No cookies file found at specified path")
            return None
            
        # Validate cookies
        if not validate_cookies(cookie_path):
            logger.warning("Cookies validation failed - some essential cookies missing")
            return None

        # On Render, we copy to /tmp to ensure yt-dlp can handle it without permission issues
        if os.environ.get('RENDER') == 'true' and not cookie_path.startswith('/tmp'):
            temp_path = os.path.join('/tmp', 'aerofetch_cookies.txt')
            import shutil
            shutil.copy(original_path if 'original_path' in locals() else cookie_path, temp_path)
            return temp_path
            
        return cookie_path
        
    except Exception as e:
        logger.error(f"Cookie path error: {e}")
        return None

def get_video_info(url: str) -> dict:
    """
    Fetch video metadata and available formats using yt-dlp.
    Returns title, thumbnail, duration, formats list.
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'skip_download': True,
        'check_formats': False,
        'nocheckcertificate': True,
        'cache_dir': False,
        'referer': 'https://www.youtube.com/',
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],  # Use mobile and web clients
                'skip': ['dash', 'hls'],  # Skip problematic formats
                'include_dash_manifest': False,
                'include_hls_manifest': False,
            }
        },
        'geo_bypass': True,
        'geo_bypass_country': 'US',  # Match your cookies region
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        },
        'ffmpeg_location': FFMPEG_PATH,
        'logger': YDLLogger(),
    }

    # Use cookies file if available
    cookie_path = get_cookies_path()
    cookies_found = cookie_path is not None
    if cookies_found:
        ydl_opts['cookiefile'] = cookie_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        formats_available = []
        seen = set()

        # Video formats
        video_qualities = [
            ('4K (2160p)', '2160', 'mp4', 'video'),
            ('1440p', '1440', 'mp4', 'video'),
            ('1080p Full HD', '1080', 'mp4', 'video'),
            ('720p HD', '720', 'mp4', 'video'),
            ('480p', '480', 'mp4', 'video'),
            ('360p', '360', 'mp4', 'video'),
        ]

        raw_formats = info.get('formats', [])
        available_heights = set()
        for f in raw_formats:
            if f.get('height'):
                available_heights.add(f['height'])

        for label, height_str, fmt, ftype in video_qualities:
            height = int(height_str)
            # Find closest height
            closest = min(available_heights, key=lambda h: abs(h - height), default=None) if available_heights else None
            if closest and abs(closest - height) <= 200:
                key = f'{closest}-{fmt}'
                if key not in seen:
                    seen.add(key)
                    # Find format with best bitrate at this height
                    best = None
                    for f in raw_formats:
                        if f.get('height') == closest and f.get('vcodec') != 'none':
                            if best is None or (f.get('filesize') or 0) > (best.get('filesize') or 0):
                                best = f
                    formats_available.append({
                        'id': best['format_id'] if best else f'bestvideo[height<={closest}]+bestaudio',
                        'label': label,
                        'quality': f'{closest}p',
                        'format': fmt,
                        'type': ftype,
                        'filesize': format_filesize(best.get('filesize') if best else None),
                    })

        # Audio formats
        audio_formats = [
            {'id': 'bestaudio/best', 'label': 'MP3 Best Quality', 'quality': '320kbps', 'format': 'mp3', 'type': 'audio', 'filesize': 'Varies'},
            {'id': 'worstaudio/worst', 'label': 'MP3 Standard', 'quality': '128kbps', 'format': 'mp3', 'type': 'audio', 'filesize': 'Varies'},
            {'id': 'bestaudio/best', 'label': 'M4A Best Quality', 'quality': 'Best', 'format': 'm4a', 'type': 'audio', 'filesize': 'Varies'},
        ]
        formats_available.extend(audio_formats)

        return {
            'success': True,
            'title': info.get('title', 'Unknown Title'),
            'thumbnail': info.get('thumbnail', ''),
            'duration': format_duration(info.get('duration')),
            'uploader': info.get('uploader', 'Unknown'),
            'view_count': info.get('view_count', 0),
            'description': (info.get('description', '') or '')[:200],
            'formats': formats_available,
            'webpage_url': info.get('webpage_url', url),
        }
    except yt_dlp.utils.DownloadError as e:
        err_str = str(e)
        if 'Private video' in err_str:
            msg = 'This video is private and cannot be downloaded.'
        elif 'not available' in err_str.lower():
            msg = 'This video is not available in your region or has been removed.'
        elif 'sign in' in err_str.lower():
            msg = 'This content requires sign-in. It cannot be downloaded.'
        else:
            msg = 'Could not fetch video info.'
        
        # Append full raw error for debugging
        debug_msg = f"{msg} (Raw: {err_str} | Cookies: {'Yes' if cookies_found else 'No'})"
        return {'success': False, 'error': debug_msg}
    except Exception as e:
        logger.exception("Unexpected error in get_video_info")
        return {'success': False, 'error': f'Unexpected error: {str(e)}'}


def download_video(url: str, format_id: str, output_format: str, quality: str) -> dict:
    """
    Download a video/audio file and return the file path.
    """
    cookies_found = False
    os.makedirs(Config.DOWNLOAD_FOLDER, exist_ok=True)

    # Sanitize filename
    safe_name = re.sub(r'[^\w\-_.]', '_', f'aerofetch_{quality}')
    output_template = os.path.join(Config.DOWNLOAD_FOLDER, f'{safe_name}_%(id)s.%(ext)s')

    if output_format in ('mp3', 'm4a', 'opus', 'wav'):
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': output_format if output_format != 'mp3' else 'mp3',
                'preferredquality': '320' if 'best' in format_id.lower() else '128',
            }],
            'cache_dir': False,
        }
    else:
        if '+' in format_id or format_id.startswith('best'):
            fmt = format_id
        else:
            fmt = f'{format_id}+bestaudio/best'

        ydl_opts = {
            'format': fmt,
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'merge_output_format': 'mp4',
            'nocheckcertificate': True,
            'referer': 'https://www.facebook.com/' if 'facebook.com' in url else 'https://www.youtube.com/',
            'http_headers': {
                'User-Agent': random.choice(USER_AGENTS),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.facebook.com/' if 'facebook.com' in url else 'https://www.youtube.com/',
            },
            'ffmpeg_location': FFMPEG_PATH,
            'logger': YDLLogger(),
            'cache_dir': False, # Disable cache to avoid write errors
        }

    # Use cookies file if available
    cookie_path = get_cookies_path()
    cookies_found = cookie_path is not None
    if cookies_found:
        ydl_opts['cookiefile'] = cookie_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)

            # Handle post-processed audio format extension change
            if output_format in ('mp3', 'm4a'):
                base = os.path.splitext(filename)[0]
                for ext in [output_format, 'mp3', 'm4a']:
                    candidate = f'{base}.{ext}'
                    if os.path.exists(candidate):
                        filename = candidate
                        break

            if not os.path.exists(filename):
                # Try to find file with same base
                base = os.path.splitext(filename)[0]
                for f in os.listdir(Config.DOWNLOAD_FOLDER):
                    if f.startswith(os.path.basename(base)):
                        filename = os.path.join(Config.DOWNLOAD_FOLDER, f)
                        break

            file_size = os.path.getsize(filename) if os.path.exists(filename) else 0

            return {
                'success': True,
                'file_path': filename,
                'file_name': os.path.basename(filename),
                'file_size': format_filesize(file_size),
                'title': info.get('title', 'download'),
                'duration': format_duration(info.get('duration')),
                'thumbnail': info.get('thumbnail', ''),
                'platform': info.get('extractor', 'Unknown'),
            }
    except Exception as e:
        logger.exception("Download failed")
        return {'success': False, 'error': str(e)}
