import nodemailer from 'nodemailer';

/**
 * Outbound mail via Google Workspace SMTP.
 *
 * The domain already sends authenticated mail (SPF and DKIM are live), so no
 * third-party sending service is needed — one less account for the school to
 * inherit and pay for.
 *
 * Every send fails soft. A submission must never be lost because the mail
 * server had a bad minute; the record is already stored by the time we get
 * here, so a failure costs a notification, not data.
 */

const FROM_NAME = 'Pear Tree Community School';

/** Where staff notifications go. */
export const NOTIFY_TO = 'cianan.gaitan@peartreecs.com';

/** Families reply to this, and it reaches Michele and the office. */
export const REPLY_TO = 'admin@peartreecs.com';

type Mail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

function transport() {
  const user = process.env['GOOGLE_SMTP_USER'];
  const pass = process.env['GOOGLE_SMTP_PASSWORD'];
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function sendMail(mail: Mail, log?: (m: string) => void): Promise<boolean> {
  const t = transport();
  if (!t) {
    log?.(`[mail] skipped "${mail.subject}" — GOOGLE_SMTP_USER/PASSWORD not set`);
    return false;
  }
  try {
    await t.sendMail({
      from: `"${FROM_NAME}" <${process.env['GOOGLE_SMTP_USER']}>`,
      to: mail.to,
      replyTo: mail.replyTo ?? REPLY_TO,
      subject: mail.subject,
      text: mail.text,
    });
    log?.(`[mail] sent "${mail.subject}" to ${mail.to}`);
    return true;
  } catch (err) {
    log?.(`[mail] FAILED "${mail.subject}" to ${mail.to}: ${String(err)}`);
    return false;
  }
}

/** Plain-text body builder — no HTML, so nothing renders badly anywhere. */
export function lines(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((p): p is string => typeof p === 'string').join('\n');
}
