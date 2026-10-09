import nodemailer from "nodemailer";

// The company mail server refuses Supabase's mailer but accepts Vercel (ADR-0011), so the app sends
// password mail itself. SMTP_PORT 465 is implicit TLS; 587 upgrades with STARTTLS.
export function mailerConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

function transport() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

export function passwordEmail(email: string, link: string): { subject: string; html: string; text: string } {
  const subject = "Set your KMPlus People password";
  const text = [
    `Use this link to choose a password for ${email}. It works once, for 1 hour.`,
    "",
    link,
    "",
    "If you didn't expect this email, you can ignore it.",
  ].join("\n");
  const html = `<h2>${subject}</h2>
<p>Use the button below to choose a password for ${escapeHtml(email)}. The link works once, for 1 hour.</p>
<p><a href="${escapeHtml(link)}">Set password</a></p>
<p>If you didn't expect this email, you can ignore it.</p>`;
  return { subject, html, text };
}

export async function sendPasswordEmail(email: string, link: string): Promise<void> {
  const { subject, html, text } = passwordEmail(email, link);
  await transport().sendMail({ from: process.env.SMTP_FROM, to: email, subject, html, text });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
