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
          forceIpv4: true,
          referer: 'https://www.youtube.com/',
          geoBypass: true,
          ignoreConfig: true,
          formatSort: 'res,vcodec:h264,vcodec:avc,vcodec:h265,ext:mp4:m4a,quality',
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.164 Mobile Safari/537.36',
          extractorArgs: 'youtube:player_client=android,web_embedded,mweb'
      };

      if (job.data.output_format && ['mp3', 'm4a'].includes(job.data.output_format)) {
          opts.extractAudio = true;
          opts.audioFormat = job.data.output_format;
          opts.audioQuality = 0;
      } else {
          opts.mergeOutputFormat = 'mp4';
      }

      // --- MULTI-STAGE DOWNLOAD LOGIC ---
      let downloadSuccess = false;
      let errorLog = '';

      const formatStr = job.data.format_id && /^\d+$/.test(job.data.format_id)
          ? `${job.data.format_id}+bestaudio/best`
          : (job.data.format_id && job.data.format_id !== 'best' 
              ? job.data.format_id 
              : 'bestvideo+bestaudio/best');

      // Stage 1: Attempt Authenticated Download (With Cookies)
      try {
        console.log(`🚀 Attempting AUTHENTICATED download for job ${job.id}`);
        await youtubedl(job.data.url, { ...opts, format: formatStr });
        downloadSuccess = true;
      } catch (err) {
        console.warn(`⚠️ Authenticated download failed for job ${job.id}, trying PUBLIC fallback...`);
        errorLog = err.stderr || err.message;

        // Stage 2: Attempt Public Download (No Cookies)
        try {
          const publicOpts = { ...opts };
          delete publicOpts.cookies; // Remove restricted cookies session
          
          // Use a super-resilient format string for fallback
          const fallbackFormat = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
          
          console.log(`🚀 Attempting PUBLIC fallback download for job ${job.id}`);
          await youtubedl(job.data.url, { ...publicOpts, format: fallbackFormat });
          downloadSuccess = true;
          console.log(`✅ PUBLIC fallback succeeded for job ${job.id}!`);
        } catch (fallbackErr) {
          console.error(`❌ Both download stages failed for job ${job.id}`);
          errorLog += ` | Fallback Error: ${fallbackErr.stderr || fallbackErr.message}`;
        }
      }

      if (!downloadSuccess) {
        throw new Error(`All download stages failed. Details: ${errorLog}`);
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
        // Try multiple locations for cookies.txt (local repo vs Render secret)
        const possibleCookiePaths = [
            path.join(__dirname, '..', 'cookies.txt'),
            path.join(process.cwd(), 'cookies.txt'),
            path.join(process.cwd(), 'backend-new', 'cookies.txt')
        ];
        let cookiesPath = possibleCookiePaths.find(p => fs.existsSync(p));
        if (cookiesPath) console.log(`✅ Using cookies from: ${cookiesPath}`);

    const clientIdentities = [
        { id: 'TV Breakthrough', args: 'youtube:player_client=tv_embedded,tv,web', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' },
        { id: 'Android Hybrid', args: 'youtube:player_client=android,web_embedded,mweb', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.164 Mobile Safari/537.36' },
        { id: 'Web Embedded', args: 'youtube:player_client=web_embedded,mweb', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' },
        { id: 'Legacy iOS', args: 'youtube:player_client=ios', ua: 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)' }
    ];

    let lastError = null;
    const randomIp = `157.245.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    for (const client of clientIdentities) {
        try {
            console.log(`🔍 Attempting breakthrough [${client.id}] for: ${url}`);
            
            const commonArgs = {
                dumpSingleJson: true, noWarnings: true, noCheckCertificates: true, format: 'all',
                forceIpv4: true, referer: 'https://www.youtube.com/', geoBypass: true, ignoreConfig: true,
                addHeader: [
                    `X-Forwarded-For: ${randomIp}`,
                    'Accept-Language: en-US,en;q=0.9'
                ],
                formatSort: 'res,vcodec:h264,vcodec:avc,vcodec:h265,ext:mp4:m4a,quality',
                userAgent: client.ua, extractorArgs: client.args
            };

            let info;
            try {
                info = await youtubedl(url, cookiesPath ? { ...commonArgs, cookies: cookiesPath } : commonArgs);
            } catch (authErr) {
                console.warn(`⚠️ Breakthrough [${client.id}] failed with cookies, trying public fallback...`);
                info = await youtubedl(url, commonArgs);
            }

            if (!info || !info.formats) {
                console.warn(`⚠️ [${client.id}] yielded no data.`);
                continue;
            }

            console.log(`📊 [${client.id}] identified ${info.formats.length} streams.`);
            
            const candidateFormats = [];
            const foundHeights = new Set();
            
            const sorted = info.formats
                .filter(f => f.height || f.acodec !== 'none') 
                .sort((a, b) => (b.height || 0) - (a.height || 0));

            sorted.forEach(f => {
                if (f.height) {
                    const res = `${f.height}p`;
                    if (!foundHeights.has(res) && f.height >= 144) {
                        foundHeights.add(res);
                        candidateFormats.push({
                            id: f.format_id,
                            label: res,
                            quality: res,
                            format: f.ext || 'mp4',
                            type: 'video',
                            filesize: this.formatFilesize(f.filesize || f.filesize_approx)
                        });
                    }
                }
            });

            // If we have at least one valid video resolution, we've broken through
            if (candidateFormats.length === 0) {
                console.warn(`⚠️ [${client.id}] was starved by YouTube. Retrying...`);
                continue;
            }

            // Add audio
            candidateFormats.push({ id: 'bestaudio', label: 'Audio Only', quality: 'High', format: 'mp3', type: 'audio', filesize: 'Unknown' });

            let extractor = info.extractor_key || info.extractor || 'YouTube';
            if (extractor.toLowerCase().includes('youtube')) extractor = 'YouTube';

            console.log(`✅ Success! Breakthrough confirmed with [${client.id}]`);

            return {
                success: true,
                data: {
                    title: info.title || 'Unknown Title',
                    thumbnail: info.thumbnail || '',
                    duration: this.formatDuration(info.duration),
                    uploader: info.uploader || 'Unknown',
                    view_count: info.view_count || 0,
                    formats: candidateFormats,
                    platform: extractor,
                    webpage_url: info.webpage_url
                }
            };
        } catch (err) {
            lastError = err;
            console.warn(`❌ [${client.id}] blocked: ${err.message}`);
            continue;
        }
    }

    throw lastError || new Error('YouTube is currently blocking all access from this server location. Fresh cookies or a residential proxy may be required.');
} catch (err) {
    console.error('yt-dlp breakthrough error:', err.message);
    throw new Error('Failed to retrieve video metadata. YouTube is blocking the server identity.');
}
}
}

module.exports = new YouTubeService();
