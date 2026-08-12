import * as nodemailer from 'nodemailer';
import { createWorker } from '../queues';

/**
 * Email delivery worker. The API renders the full HTML and enqueues a
 * ready-to-send message, so this worker only performs SMTP delivery — no
 * template logic lives here. BullMQ handles retries/backoff (see the producer
 * in apps/api/src/common/queue.ts).
 */
interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const emailWorker = createWorker('email', async (job) => {
  const { to, subject, html } = job.data as EmailJobData;

  await transporter.sendMail({
    from: `"CreatorPlus" <${process.env.SMTP_FROM || 'noreply@mycreatorplus.com'}>`,
    to,
    subject,
    html,
  });

  return { success: true, to, subject };
});
