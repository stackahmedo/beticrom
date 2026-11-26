import { getDb } from "../db/client.js";
import { getEnv } from "../config/env.js";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<{ id: string; provider: string }> {
  const env = getEnv();
  const db = await getDb();

  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      const body = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) {
        throw new Error(body.message || `Resend failed (${res.status})`);
      }

      const row = await db.query<{ id: string }>(
        `INSERT INTO email_outbox (to_email, subject, html_body, text_body, provider, status, provider_message_id, sent_at)
         VALUES ($1, $2, $3, $4, 'resend', 'sent', $5, NOW()) RETURNING id`,
        [input.to, input.subject, input.html, input.text || null, body.id || null]
      );
      return { id: row.rows[0].id, provider: "resend" };
    } catch (err) {
      await db.query(
        `INSERT INTO email_outbox (to_email, subject, html_body, text_body, provider, status, error_message)
         VALUES ($1, $2, $3, $4, 'resend', 'failed', $5)`,
        [input.to, input.subject, input.html, input.text || null, err instanceof Error ? err.message : "Unknown error"]
      );
      throw err;
    }
  }

  // Local / Outbox fallback (never exposes secrets, persisted for inspection & tests)
  const row = await db.query<{ id: string }>(
    `INSERT INTO email_outbox (to_email, subject, html_body, text_body, provider, status, sent_at)
     VALUES ($1, $2, $3, $4, 'outbox', 'sent', NOW()) RETURNING id`,
    [input.to, input.subject, input.html, input.text || null]
  );
  return { id: row.rows[0].id, provider: "outbox" };
}
