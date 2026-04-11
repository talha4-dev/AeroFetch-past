const express = require('express');
const router = express.Router();
const fs = require('fs');
const platformDetector = require('../services/platform-detector');
const { downloadQueue } = require('../services/queueManager');

// Mock download endpoint
router.get('/download/mock/:id', (req, res) => {
  console.log('📥 Mock download requested:', req.params.id);
  
  // Create a more realistic mock MP4 file header
  const mockVideoBuffer = Buffer.from(
    '00000018667479706d703432000000006d7034316d703432000002dCmoov0000006C6d76686400000000C6d6d696E66' +
    '0000001464696E6600000000D696E6664000000000000012C7374626C0000000873747373000000000000012C73747363' +
    '000000047374636F00000000727472616B0000005C65646474000000000000012C6D646961000000206D64686400000000' +
    '000000000000000000000003E800000000000012C68646C72000000000000000076696465000000000000000000000000' +
    '566964654D656469612048616E646C657200000002D6D696E660000000C766D6864000000010000002464696E66000000' +
    '1C6472656600000000000000010000000C75726C2000000001000002C7374626C000000B6737473640000000000000001' +
    '000000A6737473330000000000000001000000000000000000000000000000000000000000000000000000000000000000' +
    '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' +
    '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' +
    '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' +
    '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' +
    '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    'hex'
  );
  
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="mock-download-${req.params.id}.mp4"`);
  res.setHeader('Content-Length', mockVideoBuffer.length);
  res.setHeader('X-Simulated-Content', 'true');
  
  res.send(mockVideoBuffer);
});

// Implementation: Secure streaming for real results (preserved layer)
router.get('/:jobId/stream', async (req, res) => {
  try {
    const job = await downloadQueue.getJob(req.params.jobId);
    if (!job || !job.processed || !job.returnvalue) {
      return res.status(404).json({ success: false, error: 'Job not found or in-progress' });
    }

    // If result was a mock simulation link, redirect to the mock endpoint
    if (job.returnvalue.download_url && job.returnvalue.download_url.includes('/mock/')) {
        return res.redirect(job.returnvalue.download_url);
    }

        // Ensure we have a proper extension
        let ext = require('path').extname(tempPath) || require('path').extname(fileName) || '.mp4';
        if (ext === '.mhtml' || !ext) ext = '.mp4'; // Sanity check for bad guesses
        
        const title = job.data.quality 
          ? `aerofetch_${job.data.quality.replace(/\s+/g, '_')}${ext}`
          : fileName.includes('.') ? fileName : `${fileName}${ext}`;

        res.setHeader('Content-Type', ext === '.mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${title}"`);
        res.download(tempPath, title);
    } else {
        res.status(404).json({ success: false, error: 'File expired' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Streaming error' });
  }
});

// Standard API contract support for info/file
router.post('/info', async (req, res) => {
  try {
    const youtubeService = require('../services/youtube.service');
    const metadata = await youtubeService.getVideoInfo(req.body.url);
    res.json(metadata);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const job = await downloadQueue.add('download', req.body);
    
    // Block the HTTP request until the background job effectively finishes downloading
    let processedJob = await downloadQueue.getJob(job.id);
    while (!processedJob.processed) {
        await new Promise(resolve => setTimeout(resolve, 500));
        processedJob = await downloadQueue.getJob(job.id);
    }

    if (!processedJob.returnvalue || !processedJob.returnvalue.success) {
        return res.status(500).json({ success: false, error: 'Background download task failed.' });
    }

    // Now it's safe to tell the frontend to trigger the stream
    res.json({
        success: true,
        download_url: `/api/download/${job.id}/stream`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
