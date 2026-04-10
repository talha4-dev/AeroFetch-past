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
    """Nuclear cookie validation for YouTube"""
    try:
        if not cookie_path or not os.path.exists(cookie_path):
            return False
        with open(cookie_path, 'r') as f:
            content = f.read()
        
        # Check for ABSOLUTELY essential cookies
        essential = ['CONSENT', 'PREF', 'LOGIN_INFO', 'SID', 'HSID', 'SSID']
        missing = [cookie for cookie in essential if cookie not in content]
        
        if missing:
            logger.warning(f"Missing essential cookies: {missing}")
            return False
        
        # Check if cookies are fresh (within 7 days)
        import re
        import time
        expiry_match = re.search(r'PREF.*\t(\d+)', content)
        if expiry_match:
            expiry = int(expiry_match.group(1))
            if expiry < time.time():
                logger.warning("Cookies have expired")
                return False
        
        logger.info("✅ Cookies validation passed - fresh and complete")
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
    NUCLEAR format fetcher with advanced bot detection bypass.
    """
    import time
    ydl_opts = {
        'quiet': False,  # Set to False for debugging
        'no_warnings': False,
        'extract_flat': False,
        'skip_download': True,
        'check_formats': False,
        'nocheckcertificate': True,
        'ignoreerrors': False,
        'cachedir': False,
        'nooverwrites': True,
        'continuedl': True,
        'noprogress': False,
        'ratelimit': 1048576,  # Limit download speed to appear human
        'throttledratelimit': 524288,
        'buffer_size': 65536,
        'http_chunk_size': 10485760,
        
        # CRITICAL: YouTube extractor args
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'android_embedded', 'mweb', 'tv_html5'],
                'player_skip': ['configs', 'webpage'],
                'skip': ['dash', 'hls', 'thumbnails'],
                'format_sort': ['res:720', 'fps', 'vcodec:avc', 'acodec'],
                'throttled_rate': '512K',
            }
        },
        
        # Pakistan-specific geo settings
        'geo_bypass': True,
        'geo_bypass_country': 'PK',
        'geo_bypass_ip_block': '203.82.0.0/16',  # Pakistan Telecom IP range
        
        # Advanced HTTP headers for Pakistan
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-PK,en;q=0.9,ur;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'X-YouTube-Client-Name': '2',
            'X-YouTube-Client-Version': '2.20240410.06.00',
            'X-YouTube-Device': 'cbr=Chrome&cbrver=112.0.0.0&ceng=WebKit&cengver=537.36&cos=Android&cosver=13',
            'X-Origin': 'https://www.youtube.com',
        },
        
        # Behavioral settings to avoid detection
        'sleep_interval': 3,
        'max_sleep_interval': 10,
        'retries': 20,
        'fragment_retries': 20,
        'skip_unavailable_fragments': True,
        'keep_fragments': True,
        'no_part': True,
        'nopost_overwrites': True,
        
        # File handling
        'outtmpl': os.path.join(Config.DOWNLOAD_FOLDER, '%(title).100s.%(ext)s'),
        'restrictfilenames': True,
        'windowsfilenames': True,
        
        'ffmpeg_location': FFMPEG_PATH,
        'logger': YDLLogger(),
        'verbose': True,
    }

    # Force cookie usage with validation
    cookie_path = get_cookies_path()
    cookies_found = False
    if cookie_path and validate_cookies(cookie_path):
        ydl_opts['cookiefile'] = cookie_path
        # Force browser cookie behavior
        ydl_opts['cookiesfrombrowser'] = ('chrome',) if platform.system() == "Windows" else None
        logger.info("✅ Using validated cookies with browser emulation")
        cookies_found = True
    else:
        logger.warning("⚠️ No valid cookies found, attempting without")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Add pre-download delay to mimic human behavior
            import random
            time.sleep(random.uniform(2, 5))
            
            info = ydl.extract_info(url, download=False)
            
            # Filter formats for Pakistan availability
            if 'formats' in info:
                info['formats'] = [f for f in info['formats'] 
                                  if not f.get('is_dash') and not f.get('protocol') == 'm3u8_native']
            
            # Convert quality labels for the frontend
            formats_available = []
            seen = set()
            for f in info.get('formats', []):
                h = f.get('height')
                if h:
                    label = f'{h}p'
                    if label not in seen:
                        seen.add(label)
                        formats_available.append({
                            'id': f['format_id'],
                            'label': label,
                            'quality': label,
                            'format': f.get('ext', 'mp4'),
                            'type': 'video',
                            'filesize': format_filesize(f.get('filesize')),
                        })

            # Base audio
            formats_available.append({'id': 'bestaudio', 'label': 'MP3 Quality', 'quality': '320kbps', 'format': 'mp3', 'type': 'audio', 'filesize': 'Varies'})

            return {
                'success': True,
                'title': info.get('title', 'Unknown Title'),
                'thumbnail': info.get('thumbnail', ''),
                'duration': format_duration(info.get('duration')),
                'uploader': info.get('uploader', 'Unknown'),
                'view_count': info.get('view_count', 0),
                'formats': formats_available,
                'webpage_url': info.get('webpage_url', url),
            }
            
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        if 'bot' in error_msg.lower() or 'sign in' in error_msg.lower():
            return {'success': False, 'error': f'YouTube bot detection triggered. Cookies may need refresh. (Cookies: {"Yes" if cookies_found else "No"})'}
        return {'success': False, 'error': f'Download error: {error_msg}'}
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
