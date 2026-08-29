import { createEmailTransport, fromAddress } from '@creatorplus/email';
import { createWorker } from '../queues';

/**
 * Email delivery worker. The API renders the full HTML and enqueues a
 * ready-to-send message, so this worker only performs SMTP delivery — no
 * template logic lives here. BullMQ handles retries/backoff (see the producer
 * in apps/api/src/common/queue.ts). Transport is Brevo SMTP by default.
 */
interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

const transporter = createEmailTransport();

export const emailWorker = createWorker('email', async (job) => {
  const { to, subject, html } = job.data as EmailJobData;

  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
  });

  return { success: true, to, subject };
});
