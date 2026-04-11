const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');

// Determine connection type based on environment
const useMock = process.env.USE_MOCK_REDIS === 'true' || !process.env.REDIS_HOST;

// Create appropriate Redis instance
const createRedisClient = () => {
  if (useMock) {
    console.log('🔄 Using In-Memory Mock Redis (No installation required)');
    
    // Enhanced mock with BullMQ-compatible methods
    const mockRedis = new RedisMock();
    
    // Add BullMQ required methods that ioredis-mock might miss
    mockRedis.lrange = async (key, start, stop) => {
      const list = mockRedis.data.get(key) || [];
      return list.slice(start, typeof stop === 'number' && stop === -1 ? undefined : stop + 1);
    };
    
    mockRedis.lrem = async (key, count, value) => {
      const list = mockRedis.data.get(key) || [];
      const newList = list.filter(item => item !== value);
      mockRedis.data.set(key, newList);
      return Math.abs(list.length - newList.length);
    };
    
    return mockRedis;
  }
  
  console.log('🔌 Connecting to Real Redis Server');
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  });
};

module.exports = createRedisClient;
