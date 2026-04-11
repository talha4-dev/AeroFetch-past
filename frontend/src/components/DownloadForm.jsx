import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastNotification';
import SkeletonLoader from './SkeletonLoader';
import ProgressBar from './ProgressBar';

const PLATFORM_ICONS = {
    YouTube: '🎬', TikTok: '🎵', Facebook: '📘',
    Instagram: '📸', 'Twitter/X': '🐦', Vimeo: '🎥', Dailymotion: '📺',
};

const QUALITY_BADGES = {
    '2160': { label: '4K Ultra HD', badge: '4K', color: '#ff6b6b' },
    '1440': { label: '1440p QHD', badge: 'FHD+', color: '#6d5dfc' },
    '1080': { label: '1080p Full HD', badge: 'FHD', color: '#6c63ff' },
    '720': { label: '720p HD', badge: 'HD', color: '#9b8fff' },
    '480': { label: '480p SD', badge: '480p', color: '#00d4aa' },
    '360': { label: '360p Low', badge: '360p', color: '#8888aa' },
};

export default function DownloadForm({ compact = false }) {
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [selectedQuality, setSelectedQuality] = useState(null);
    const [videoInfo, setVideoInfo] = useState(null);
    const [fetchState, setFetchState] = useState('idle'); // idle | loading | ready | error
    const [downloadState, setDownloadState] = useState('idle'); // idle | loading | processing | success | error
    const [progress, setProgress] = useState(0);
    const [platform, setPlatform] = useState(null);
    const [urlError, setUrlError] = useState('');
    const cardRef = useRef(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (cardRef.current && videoInfo) {
            gsap.from(cardRef.current, { opacity: 0, y: 20, duration: 0.4, ease: 'power2.out' });
        }
    }, [videoInfo]);

    const detectPlatform = (inputUrl) => {
        if (!inputUrl) return null;
        if (inputUrl.includes('youtube') || inputUrl.includes('youtu.be')) return 'YouTube';
        if (inputUrl.includes('tiktok')) return 'TikTok';
        if (inputUrl.includes('facebook') || inputUrl.includes('fb.watch')) return 'Facebook';
        if (inputUrl.includes('instagram')) return 'Instagram';
        if (inputUrl.includes('twitter') || inputUrl.includes('x.com')) return 'Twitter/X';
        if (inputUrl.includes('vimeo')) return 'Vimeo';
        return null;
    };

    const handleUrlChange = (e) => {
        const val = e.target.value;
        setUrl(val);
        setUrlError('');
        setPlatform(detectPlatform(val));
        if (!val) { setVideoInfo(null); setFetchState('idle'); }
    };

    const handleFetchInfo = async () => {
        if (!url.trim()) { setUrlError('Please enter a URL'); return; }
        setFetchState('loading');
        setVideoInfo(null);
        setSelectedQuality(null);
        try {
            const res = await api.post('/api/download/info', { url: url.trim() });
            setVideoInfo(res.data.data);
            setFetchState('ready');
            setPlatform(res.data.data.platform || detectPlatform(url));
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to fetch video info. Check URL and try again.';
            setFetchState('error');
            setUrlError(msg);
            addToast({ type: 'error', title: 'Fetch Failed', message: msg });
        }
    };

    const handleDownload = async () => {
        if (!videoInfo) { addToast({ type: 'warning', title: 'Fetch first', message: 'Please fetch video info first' }); return; }
        if (!selectedQuality) { addToast({ type: 'warning', title: 'Select quality', message: 'Please choose a quality/format' }); return; }

        setDownloadState('loading');
        setProgress(0);

        // Simulate progress
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 85) { clearInterval(timer); return prev; }
                return prev + Math.random() * 12;
            });
        }, 400);
        setDownloadState('processing');

        try {
            const res = await api.post('/api/download', {
                url: url.trim(),
                format_id: selectedQuality.id,
                output_format: selectedQuality.type === 'audio' ? 'mp3' : 'mp4'
            });

            clearInterval(timer);
            setProgress(100);

            // Implement streaming proxy mechanism seamlessly
            const streamUrl = res.data.download_url;
            
            // Build absolute URL based on api/client definition context or relative pathing natively
            const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') 
              ? 'http://localhost:10000' 
              : '';
              
            const absoluteDownloadUrl = `${baseUrl}${streamUrl}`;

            // Use window.open to navigate directly to the backend stream endpoint
            // This works cross-origin because the backend sets Content-Disposition: attachment
            window.open(absoluteDownloadUrl, '_blank');

            setDownloadState('success');
            addToast({ type: 'success', title: 'Download Started!', message: `"${videoInfo.title}" is downloading.` });

            setTimeout(() => {
                setDownloadState('idle');
                setProgress(0);
            }, 3000);
        } catch (err) {
            clearInterval(timer);
            const msg = err.response?.data?.error || 'Download failed. Please try again.';
            setDownloadState('error');
            setProgress(0);
            addToast({ type: 'error', title: 'Download Failed', message: msg });
            setTimeout(() => setDownloadState('idle'), 2000);
        }
    };

    const btnLabel = {
        idle: '⬇️ Download',
        loading: '🔄 Fetching...',
        processing: '📥 Processing...',
        success: '✅ Done!',
        error: '❌ Try Again',
    }[downloadState];

    return (
        <div className="download-form-wrap">
            {/* URL Input Row */}
            <div className="url-row">
                <div className="url-input-wrap">
                    {platform && (
                        <span className="url-platform-badge">
                            {PLATFORM_ICONS[platform] || '🌐'} {platform}
                        </span>
                    )}
                    <input
                        type="url"
                        className={`input-field url-input${urlError ? ' error' : ''}`}
                        placeholder="Paste YouTube, TikTok, or Facebook URL here..."
                        value={url}
                        onChange={handleUrlChange}
                        onKeyDown={e => e.key === 'Enter' && handleFetchInfo()}
                        aria-label="Video URL"
                    />
                    {urlError && <p className="input-error">{urlError}</p>}
                </div>
                <button
                    className="btn-secondary fetch-btn"
                    onClick={handleFetchInfo}
                    disabled={fetchState === 'loading'}
                >
                    {fetchState === 'loading' ? (
                        <span className="spinner" />
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            Analyze
                        </>
                    )}
                </button>
            </div>

            {/* Skeleton while loading */}
            {fetchState === 'loading' && (
                <div style={{ marginTop: '20px' }}>
                    <SkeletonLoader type="metadata" count={1} />
                </div>
            )}

            {/* Video Info Card */}
            {fetchState === 'ready' && videoInfo && (
                <div ref={cardRef} className="video-info-card glass-card">
                    <div className="video-info-header">
                        {videoInfo.thumbnail && (
                            <img src={videoInfo.thumbnail} alt="thumbnail" className="video-thumbnail" />
                        )}
                        <div className="video-meta">
                            <h3 className="video-title">{videoInfo.title}</h3>
                            <p className="video-sub">
                                <span>👤 {videoInfo.uploader}</span>
                                <span>⏱ {videoInfo.duration}</span>
                                {videoInfo.view_count > 0 && <span>👁 {videoInfo.view_count?.toLocaleString()} views</span>}
                            </p>
                            {platform && <span className="badge badge-brand">{PLATFORM_ICONS[platform]} {platform}</span>}
                        </div>
                    </div>

                    {/* Quality Picker */}
                    <div className="quality-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 className="quality-title">Choose Format & Quality</h4>
                            {!user && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                    ✨ All Qualities Available
                                </span>
                            )}
                        </div>
                        <div className="quality-groups">
                            <div className="quality-group">
                                <span className="quality-group-label">🎬 Video</span>
                                <div className="quality-pills">
                                    {videoInfo.formats?.filter(f => f.type === 'video').map(f => {
                                        const resKey = f.label.replace('p', '');
                                        const badge = QUALITY_BADGES[resKey] || { badge: f.label, color: '#8888aa' };
                                        
                                        return (
                                            <button
                                                key={f.id}
                                                className={`quality-pill${selectedQuality?.id === f.id ? ' active' : ''}`}
                                                onClick={() => setSelectedQuality(f)}
                                                style={{ '--pill-color': badge.color }}
                                            >
                                                {badge.badge}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="quality-group">
                                <span className="quality-group-label">🎵 Audio Only</span>
                                <div className="quality-pills">
                                    {videoInfo.formats?.filter(f => f.type === 'audio').map(f => {
                                        return (
                                            <button
                                                key={f.id}
                                                className={`quality-pill audio${selectedQuality?.id === f.id ? ' active' : ''}`}
                                                onClick={() => setSelectedQuality(f)}
                                                style={{ '--pill-color': '#ff9f1c' }}
                                            >
                                                {f.format.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {selectedQuality && (
                            <p className="quality-selected-info">
                                Selected: <strong>{selectedQuality.label}</strong> {selectedQuality.filesize && <span>({selectedQuality.filesize})</span>}
                            </p>
                        )}
                        {!user && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', background: 'rgba(108,99,255,0.05)', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                                💡 <strong>Pro Tip:</strong> <a href="/auth" style={{ color: 'var(--brand-primary)', fontWeight: '700' }}>Login</a> to save your download history to your account forever.
                            </p>
                        )}
                    </div>

                    {/* Progress bar */}
                    {(downloadState === 'processing' || downloadState === 'loading') && (
                        <div style={{ marginTop: '16px' }}>
                            <ProgressBar value={progress} label="Downloading..." />
                        </div>
                    )}

                    {/* Download Button */}
                    <button
                        className={`btn-primary download-btn state-${downloadState}`}
                        onClick={handleDownload}
                        disabled={downloadState === 'loading' || downloadState === 'processing'}
                    >
                        {(downloadState === 'loading' || downloadState === 'processing') && (
                            <span className="spinner white" />
                        )}
                        {btnLabel}
                    </button>
                </div>
            )}

            <style>{`
        .download-form-wrap { display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .url-row { display: flex; gap: 12px; align-items: flex-start; }
        .url-input-wrap { flex: 1; position: relative; }
        .url-platform-badge {
          position: absolute; top: -10px; left: 12px;
          font-size: 11px; font-weight: 700; padding: 3px 10px;
          background: var(--gradient-brand); color: white;
          border-radius: var(--radius-pill); z-index: 1;
        }
        .url-input { padding-top: \${platform ? '18px' : '14px'}; padding-right: 16px; }
        .input-error { font-size: 12px; color: var(--brand-accent); margin-top: 6px; padding-left: 2px; }
        .fetch-btn { flex-shrink: 0; height: 50px; padding: 0 20px; border-radius: var(--radius-md); }
        .video-info-card { padding: 24px; display: flex; flex-direction: column; gap: 20px; margin-top: 4px; }
        .video-info-header { display: flex; gap: 16px; align-items: flex-start; }
        .video-thumbnail {
          width: 140px; height: 90px; object-fit: cover;
          border-radius: var(--radius-md); flex-shrink: 0;
          border: 1px solid var(--border-color);
        }
        .video-meta { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .video-title { font-size: 15px; font-weight: 700; line-height: 1.4; color: var(--text-primary); }
        .video-sub { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--text-secondary); }
        .quality-section { display: flex; flex-direction: column; gap: 12px; }
        .quality-title { font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }
        .quality-groups { display: flex; flex-direction: column; gap: 12px; }
        .quality-group { display: flex; flex-direction: column; gap: 8px; }
        .quality-group-label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
        .quality-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .quality-pill {
          padding: 7px 16px; border-radius: var(--radius-pill);
          border: 1.5px solid var(--border-color); background: var(--bg-input);
          color: var(--text-secondary); font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all var(--transition); letter-spacing: 0.03em;
        }
        .quality-pill:hover { border-color: var(--pill-color, var(--brand-primary)); color: var(--pill-color, var(--brand-primary)); }
        .quality-pill.active {
          background: var(--pill-color, var(--brand-primary));
          border-color: var(--pill-color, var(--brand-primary));
          color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transform: translateY(-1px);
        }
        .quality-pill.locked {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(1);
          background: var(--bg-hover);
          border-style: dashed;
        }
        .quality-pill.locked:hover {
          transform: none;
          border-color: var(--border-color);
          color: var(--text-muted);
        }
        .quality-selected-info { font-size: 13px; color: var(--text-muted); }
        .download-btn { width: 100%; padding: 16px; font-size: 16px; border-radius: var(--radius-md); }
        .download-btn.state-success { background: linear-gradient(135deg, #00c882, #00d4aa); }
        .download-btn.state-error { background: linear-gradient(135deg, #ff4444, #ff6b6b); }
        .spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(108,99,255,0.3); border-top-color: var(--brand-primary);
          animation: spin 0.8s linear infinite; display: inline-block;
        }
        .spinner.white { border-color: rgba(255,255,255,0.3); border-top-color: white; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .url-row { flex-direction: column; }
          .fetch-btn { width: 100%; justify-content: center; }
          .video-info-header { flex-direction: column; }
          .video-thumbnail { width: 100%; height: 160px; }
        }
      `}</style>
        </div>
    );
}
