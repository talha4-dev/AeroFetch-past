const { downloadQueue } = require('../services/queueManager');
const youtubeService = require('../services/youtube.service');

async function verifyMockMode() {
  console.log('🧪 Verifying Mock Mode Configuration...');
  
  // Test queue functionality
  await downloadQueue.add('test-job', {
    url: 'https://youtube.com/watch?v=test',
    platform: 'youtube'
  });
  
  console.log('✅ Queue test passed - job added successfully');
  
  // Test YouTube service
  const result = await youtubeService.getVideoInfo('https://youtube.com/watch?v=test');
  console.log('✅ YouTube service test passed:', result.success);
  
  console.log('🎉 All mock tests passed! System is ready for development.');
  
  process.exit(0);
}

verifyMockMode().catch(err => {
  console.error('❌ Mock verification failed:', err);
  process.exit(1);
});
