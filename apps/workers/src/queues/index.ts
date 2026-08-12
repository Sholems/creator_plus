import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email',
  SEARCH_INDEX: 'search-index',
  FILE_PROCESSING: 'file-processing',
  NOTIFICATION: 'notification',
  ANALYTICS: 'analytics',
} as const;

// Create queues
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, { connection });
export const searchIndexQueue = new Queue(QUEUE_NAMES.SEARCH_INDEX, { connection });
export const fileProcessingQueue = new Queue(QUEUE_NAMES.FILE_PROCESSING, { connection });
export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, { connection });
export const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, { connection });

// Create workers
export function createWorker(name: string, processor: (job: any) => Promise<any>) {
  return new Worker(name, processor, {
    connection,
    concurrency: 5,
  });
}

export { connection };
