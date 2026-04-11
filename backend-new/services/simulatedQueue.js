class SimulatedQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    this.workers = [];
    this.jobIdCounter = 1;
    console.log(`🔄 Created Simulated Queue: ${name}`);
  }

  async add(jobName, data, options = {}) {
    const job = {
      id: this.jobIdCounter++,
      name: jobName,
      data: data,
      timestamp: Date.now(),
      attemptsMade: 0,
      processed: false
    };

    this.jobs.push(job);
    console.log(`📨 [SimulatedQueue] Added job to ${this.name}: ID=${job.id} | ${jobName}`);

    // Process the job after a short delay (simulating async processing)
    setTimeout(() => this.processJob(job), 100);
    
    return { id: job.id, waitUntilFinished: () => Promise.resolve({ success: true }) };
  }

  async processJob(job) {
    if (job.processed) return;

    job.attemptsMade++;
    console.log(`⚙️ [SimulatedQueue] Processing job ${job.id} in ${this.name}`);

    // Find a worker for this queue
    const worker = this.workers.find(w => w.queueName === this.name);
    
    if (worker) {
      console.log(`👷 [SimulatedQueue] Found worker for ${this.name}, executing handler...`);
      try {
        const result = await worker.handler(job);
        job.processed = true;
        job.returnvalue = result; // Store result for mock fetching
        console.log(`✅ [SimulatedQueue] Job ${job.id} completed successfully`);
        
        // Call the completed callback if provided
        if (worker.onCompleted) {
          worker.onCompleted(job, result);
        }
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error.message);
        job.processed = true; // Mark as processed even on failure so listeners don't hang
        
        // Call the failed callback if provided
        if (worker.onFailed) {
          worker.onFailed(job, error);
        }
      }
    }
  }

  // Mock BullMQ-like worker registration
  process(handler) {
    const workerContext = {
      queueName: this.name,
      handler: handler,
      onCompleted: null,
      onFailed: null
    };
    
    this.workers.push(workerContext);
    console.log(`👷 Worker registered for ${this.name}`);
    
    // Return mock worker with event handlers
    return {
      on: (event, handler) => {
        if (event === 'completed') {
          workerContext.onCompleted = handler;
        }
        if (event === 'failed') {
          workerContext.onFailed = handler;
        }
      }
    };
  }

  // Mock job retrieval for streaming
  async getJob(jobId) {
    return this.jobs.find(j => j.id == jobId);
  }

  // Mock obliterate function
  async obliterate() {
    this.jobs = [];
    console.log(`🧹 Obliterated all jobs in ${this.name}`);
  }
}

// Create singleton instances
const queues = {
  downloads: new SimulatedQueue('downloads'),
  metadata: new SimulatedQueue('metadata')
};

module.exports = queues;
