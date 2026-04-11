const youtubeService = require('./youtube.service');
// const facebookService = require('./facebook.service');
// const instagramService = require('./instagram.service');

class PlatformDetector {
  /**
   * Determine platform relying on robust regex URL parsing
   */
  detectPlatform(url) {
    if (!url) return null;
    
    if (/(youtube\.com|youtu\.be)/i.test(url)) {
      return 'youtube';
    }
    
    if (/(facebook\.com|fb\.watch)/i.test(url)) {
      return 'facebook';
    }
    
    if (/(instagram\.com)/i.test(url)) {
      return 'instagram';
    }
    
    return 'unknown';
  }

  getServiceForPlatform(platform) {
    switch (platform) {
      case 'youtube':
        return youtubeService;
      case 'facebook':
        // return facebookService;
        throw new Error('Facebook integration is scheduled for Phase 2');
      case 'instagram':
        // return instagramService;
        throw new Error('Instagram integration is scheduled for Phase 3');
      default:
        throw new Error('Unsupported platform');
    }
  }

  async getMetadata(url) {
    const platform = this.detectPlatform(url);
    if (platform === 'unknown') {
      throw new Error('Could not automatically determine platform from URL');
    }

    const service = this.getServiceForPlatform(platform);
    return await service.getMetadata(url);
  }
}

module.exports = new PlatformDetector();
