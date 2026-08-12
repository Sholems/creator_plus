import { createWorker } from '../queues';

interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export const notificationWorker = createWorker('notification', async (job) => {
  const { userId, type, title, message, data } = job.data as NotificationJobData;

  console.log(`Processing notification job: ${job.id}`);
  console.log(`Sending ${type} notification to user: ${userId}`);

  // TODO: Implement in-app and push notifications
  // For now, just log the notification
  console.log(`Notification sent: ${title} to user ${userId}`);

  return { success: true, userId, type };
});
