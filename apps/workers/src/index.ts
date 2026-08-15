import { emailWorker } from './jobs/email';
import { searchIndexWorker } from './jobs/search-index';
import { notificationWorker } from './jobs/notification';
import { recoveryWorker, scheduleRecovery } from './jobs/recovery';

console.log('Starting workers...');

// Register the repeatable abandoned-cart recovery sweep.
void scheduleRecovery().catch((err) => {
  console.error('Failed to schedule recovery sweep:', err.message);
});

// Handle worker events
const workers = [emailWorker, searchIndexWorker, notificationWorker, recoveryWorker];

workers.forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });
});

console.log('Workers started successfully');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});
