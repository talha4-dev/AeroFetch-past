const { Worker } = require('bullmq');
const { connection } = require('../services/queue.service');
const youtubeService = require('../services/youtube.service');

const worker = new Worker('downloads', async job => {
  console.log(`[Queue Worker] Processing job ${job.id} for platform: ${job.data.platform}`);
  
  switch (job.data.platform) {
    case 'youtube':
      return await youtubeService.processDownload(job);
    case 'facebook':
      throw new Error('Facebook integration is Phase 2');
    case 'instagram':
      throw new Error('Instagram integration is Phase 3');
    default:
      throw new Error(`Unsupported platform queue parameter: ${job.data.platform}`);
  }
}, { 
  concurrency: 5, 
  connection 
});

worker.on('completed', (job, returnvalue) => {
  console.log(`[Queue Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[Queue Worker] Job ${job.id} failed with error: ${err.message}`);
});

module.exports = worker;
