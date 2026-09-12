import { emailWorker } from './jobs/email';
import { searchIndexWorker } from './jobs/search-index';
import { notificationWorker } from './jobs/notification';
import { recoveryWorker, scheduleRecovery } from './jobs/recovery';
import { eventsWorker, scheduleEventsSweep } from './jobs/events';
import { membershipWorker, scheduleMembershipSweep } from './jobs/membership';
import { communityDigestWorker, scheduleCommunityDigest } from './jobs/community-digest';

console.log('Starting workers...');

// Register the repeatable abandoned-cart recovery sweep.
void scheduleRecovery().catch((err) => {
  console.error('Failed to schedule recovery sweep:', err.message);
});

// Register the repeatable events sweep (hold release + reminders).
void scheduleEventsSweep().catch((err) => {
  console.error('Failed to schedule events sweep:', err.message);
});

// Register the daily membership hygiene sweep (expire lapsed subscriptions).
void scheduleMembershipSweep().catch((err) => {
  console.error('Failed to schedule membership sweep:', err.message);
});

// Register the daily community digest email.
void scheduleCommunityDigest().catch((err) => {
  console.error('Failed to schedule community digest:', err.message);
});

// Handle worker events
const workers = [emailWorker, searchIndexWorker, notificationWorker, recoveryWorker, eventsWorker, membershipWorker, communityDigestWorker];

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
