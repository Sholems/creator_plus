import * as nodemailer from 'nodemailer';

/**
 * Brevo (Sendinblue) is the default provider. SMTP relay settings:
 *   host: smtp-relay.brevo.com
 *   port: 587 (STARTTLS) or 465 (implicit TLS)
 *   user: the SMTP key login shown in Brevo → Settings → SMTP & API
 *   pass: the SMTP key
 *
 * The sender domain must be verified in Brevo (Settings → Senders) before
 * mail is delivered. Any provider can still be used by overriding the SMTP_*
 * env vars.
 */
const BREVO_HOST = 'smtp-relay.brevo.com';
const BREVO_PORT = 587;

export function smtpConfig() {
  const port = parseInt(process.env.SMTP_PORT || String(BREVO_PORT), 10);
  return {
    host: process.env.SMTP_HOST || BREVO_HOST,
    port,
    // Port 465 uses implicit TLS; everything else negotiates STARTTLS.
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  };
}

/** Create a nodemailer transport from the current SMTP_* env config. */
export function createEmailTransport(): nodemailer.Transporter {
  return nodemailer.createTransport(smtpConfig());
}
