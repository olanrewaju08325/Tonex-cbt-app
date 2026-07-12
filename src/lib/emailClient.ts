/**
 * Client-side email dispatch helper.
 * Routes to the /api/email/trigger serverless endpoint.
 * Used when nodemailer cannot run in the browser.
 */
export async function sendEmail({
  to,
  subject,
  body
}: { to: string; subject: string; body: string }) {
  const res = await fetch('/api/email/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'new_feature',
      payload: {
        featureName: subject,
        description: body
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to send email');
  }

  return res.json();
}
