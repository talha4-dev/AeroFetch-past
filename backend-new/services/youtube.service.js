const { createWorker } = require('./queueManager');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

class YouTubeService {
  constructor() {
    this.useSimulation = process.env.USE_SIMULATION === 'true';
    this.setupWorker();
    
    if (this.useSimulation) {
      console.log('🎭 YouTube Service in Simulation Mode');
    } else {
      console.log('🔥 YouTube Service in LIVE Mode (yt-dlp engine engaged)');
      // Log yt-dlp version to see if it's outdated
      youtubedl('--version').then(v => console.log(`🚀 yt-dlp version on server: ${v}`)).catch(e => console.warn('⚠️ Could not check yt-dlp version'));
    }
  }

  formatFilesize(bytes_size) {
    if (!bytes_size) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let idx = 0;
    while (bytes_size >= 1024 && idx < units.length - 1) {
      bytes_size /= 1024;
      idx++;
    }
    return `${bytes_size.toFixed(1)} ${units[idx]}`;
  }

  formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  setupWorker() {
    const worker = createWorker('downloads', async (job) => {
      console.log(`🎬 Processing ${this.useSimulation ? 'SIMULATED ' : ''}download: ${job.data.url}`);
      
      if (this.useSimulation) {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          success: true,
          tempPath: null, // Streaming mock directly instead
          fileName: 'mock.mp4',
          download_url: `/api/download/mock/${job.id}`
        };
      }

      // Real Implementation Logic
      const outDir = process.platform === 'win32' 
        ? path.join(__dirname, '..', 'aerofetch_downloads')
        : path.join('/tmp', 'aerofetch_downloads');
      if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
      }

      const tempFileName = `aerofetch_${job.id}_${Date.now()}`;
      const tempPath = path.join(outDir, `${tempFileName}.%(ext)s`);
      
      const possibleCookiePaths = [
          path.join(__dirname, '..', 'cookies.txt'),
          path.join(process.cwd(), 'cookies.txt'),
          path.join(process.cwd(), 'backend-new', 'cookies.txt')
      ];
      
      let cookiesPath = possibleCookiePaths.find(p => fs.existsSync(p));
      
      if (cookiesPath) {
          const stats = fs.statSync(cookiesPath);
          console.log(`✅ Cookie file size: ${stats.size} bytes`);
          if (stats.size < 100) console.warn('⚠️ Cookie file seems suspiciously small. Did you paste the content correctly?');
      }

      const opts = {
          cookies: cookiesPath,
          // Use a more resilient format selector
          format: job.data.format_id && job.data.format_id !== 'bestvideo+bestaudio'
            ? `${job.data.format_id}+bestaudio/best`
            : 'bestvideo+bestaudio/bestvideo/bestaudio/best',
          output: tempPath,
          noWarnings: true,
          noCheckCertificates: true,
          ffmpegLocation: process.platform === 'win32' 
            ? path.join(__dirname, '..', '..', 'bin', 'ffmpeg.exe') 
            : 'ffmpeg',
          mergeOutputFormat: 'mp4',
          userAgent: 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)',
          extractorArgs: 'youtube:player_client=ios'
      };

      if (job.data.output_format && ['mp3', 'm4a'].includes(job.data.output_format)) {
          opts.extractAudio = true;
          opts.audioFormat = job.data.output_format;
          opts.audioQuality = 0;
      } else {
          opts.mergeOutputFormat = 'mp4';
      }

      try {
        console.log(`🚀 Executing yt-dlp download for job ${job.id}`);
        // If it's a specific numeric ID (like 313), we should try merging it with best audio
        const formatStr = job.data.format_id && /^\d+$/.test(job.data.format_id)
            ? `${job.data.format_id}+bestaudio/best`
            : (job.data.format_id || 'bestvideo+bestaudio/bestvideo/bestaudio/best');

        try {
            await youtubedl(job.data.url, { ...opts, format: formatStr });
        } catch (firstErr) {
            console.warn(`⚠️ First download attempt failed for job ${job.id}, trying fallback to 'best'...`);
            // Fallback to a single-file "best" which is often more likely to bypass cloud-IP blocks
            await youtubedl(job.data.url, { ...opts, format: 'best' });
        }
      } catch (err) {
        console.error('yt-dlp download error block:', err);
        throw new Error('yt-dlp process failed to download media. Cookies or format issue.');
      }

      const files = fs.readdirSync(outDir);
      const generatedFile = files.find(f => f.startsWith(tempFileName));

      if (!generatedFile) {
          throw new Error('Downloaded file not found after yt-dlp completed.');
      }

      const finalPath = path.join(outDir, generatedFile);

      return {
          success: true,
          tempPath: finalPath,
          fileName: generatedFile
      };
    });

    if (worker && worker.on) {
      worker.on('completed', (job, result) => {
        console.log(`✅ Download completed for job ${job.id}`);
      });

      worker.on('failed', (job, error) => {
        console.error(`❌ Download failed for job ${job.id}:`, error.message);
      });
    }
  }

  async getVideoInfo(url) {
    if (this.useSimulation) {
      let platform = 'unknown';
      if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
      else if (url.includes('facebook.com') || url.includes('fb.watch')) platform = 'facebook';
      else if (url.includes('instagram.com')) platform = 'instagram';
      
      return {
        success: true,
        data: {
          title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video (Simulation Mode)`,
          thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
          duration: "2:30",
          uploader: "Example Channel",
          view_count: 1000000,
          formats: [
            { id: '18', label: "360p", quality: "360p", type: "video", filesize: "15MB" },
            { id: '22', label: "720p HD", quality: "720p", type: "video", filesize: "45MB" },
            { id: '137', label: "1080p Full HD", quality: "1080p", type: "video", filesize: "85MB" }
          ]
        }
      };
    }

    // Real implementation
    try {
        console.log(`🔍 Extracting metadata via live yt-dlp for: ${url}`);
        
        // Try multiple locations for cookies.txt (local repo vs Render secret)
        const possibleCookiePaths = [
            path.join(__dirname, '..', 'cookies.txt'),
            path.join(process.cwd(), 'cookies.txt'),
            path.join(process.cwd(), 'backend-new', 'cookies.txt')
        ];
        
        let cookiesPath = possibleCookiePaths.find(p => fs.existsSync(p));
        
        if (!cookiesPath) {
            console.warn('⚠️ No cookies.txt found in any expected location. Metadata extraction might fail.');
        } else {
            console.log(`✅ Using cookies from: ${cookiesPath}`);
        }
        
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            cookies: cookiesPath,
            format: 'all',
            userAgent: 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)',
            extractorArgs: 'youtube:player_client=ios'
        });

        const formats_available = [];
        const seenResolutions = new Set();

        if (info.formats) {
            console.log(`📊 yt-dlp found ${info.formats.length} Raw Formats. Filtering...`);
            
            const sortedFormats = info.formats
                .filter(f => f.height) 
                .sort((a, b) => (b.height || 0) - (a.height || 0));

            sortedFormats.forEach(f => {
                const res = `${f.height}p`;
                if (!seenResolutions.has(res) && f.height >= 144) {
                    seenResolutions.add(res);
                    formats_available.push({
                        id: f.format_id,
                        label: res,
                        quality: res,
                        format: f.ext || 'mp4',
                        type: 'video',
                        filesize: this.formatFilesize(f.filesize || f.filesize_approx)
                    });
                }
            });
        }

        // If NO video formats were found (YouTube is being restrictive), add a "Best Available" fallback
        if (formats_available.filter(f => f.type === 'video').length === 0) {
            console.warn('⚠️ No specific video resolutions detected. Adding "Best Quality" fallback.');
            formats_available.push({
                id: 'bestvideo+bestaudio/best',
                label: 'Best Quality',
                quality: 'Auto',
                format: 'mp4',
                type: 'video',
                filesize: 'Unknown'
            });
        }

        // Add standard audio option
        formats_available.push({ id: 'bestaudio', label: 'Audio Only', quality: 'High', format: 'mp3', type: 'audio', filesize: 'Unknown' });

        let platformDisplay = info.extractor || 'Unknown';
        if (platformDisplay.toLowerCase().includes('youtube')) platformDisplay = 'YouTube';

        return {
            success: true,
            data: {
                title: info.title || 'Unknown Title',
                thumbnail: info.thumbnail || '',
                duration: this.formatDuration(info.duration),
                uploader: info.uploader || 'Unknown',
                view_count: info.view_count || 0,
                formats: formats_available,
                platform: platformDisplay
            }
        };
    } catch (err) {
        console.error('yt-dlp info extraction error:', err.message);
        throw new Error('Failed to retrieve video metadata. Cookies may need refresh or link is invalid.');
    }
  }
}

module.exports = new YouTubeService();
