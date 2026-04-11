const simulatedQueues = require('./simulatedQueue');

// Determine if we're in mock mode
const useMock = process.env.USE_MOCK_REDIS === 'true' || !process.env.REDIS_HOST;

let downloadQueue, metadataQueue;

if (useMock) {
  console.log('🔄 Using Simulated Queues (No Redis required)');
  
  // Use our simulated queues
  downloadQueue = simulatedQueues.downloads;
  metadataQueue = simulatedQueues.metadata;
  
  // Add compatible methods for Job ID resolution
  downloadQueue.client = {}; // Stub for API logic
} else {
  // Real BullMQ implementation
  const { Queue } = require('bullmq');
  const createRedisClient = require('./queue.service');
  const redisClient = createRedisClient();

  console.log('🔌 Using Real BullMQ with Redis');
  
  downloadQueue = new Queue('downloads', {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      timeout: 300000
    }
  });

  metadataQueue = new Queue('metadata', {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 2,
      timeout: 30000
    }
  });
}

// Mock-compatible worker creation function
const createWorker = (queueName, processor, concurrency = 3) => {
  if (useMock) {
    const queue = simulatedQueues[queueName];
    if (queue) {
      return queue.process(processor);
    }
  } else {
    const { Worker } = require('bullmq');
    const createRedisClient = require('./queue.service');
    return new Worker(queueName, processor, {
      connection: createRedisClient(),
      concurrency
    });
  }
};

module.exports = { downloadQueue, metadataQueue, createWorker };
