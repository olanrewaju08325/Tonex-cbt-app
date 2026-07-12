import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase';
import { sendEmail, EmailTemplates } from '../_lib/mailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, payload } = req.body;
  if (!type || !payload) {
    return res.status(400).json({ error: 'Missing type or payload' });
  }

  try {
    let template;
    let toEmail = payload.email;

    switch (type) {
      case 'welcome':
        // payload: { email, name, day }
        template = EmailTemplates.welcomeDrip(payload.day, payload.name);
        break;
      
      case 'achievement':
        // payload: { email, name, achievement }
        template = EmailTemplates.achievementUnlocked(payload.name, payload.achievement);
        break;

      case 'manual_payment':
        // payload: { email, name, amount, plan }
        template = EmailTemplates.manualPaymentReceipt(payload.name, payload.amount, payload.plan);
        break;

      case 'new_feature':
        // payload: { featureName, description }
        // This is a bulk send, must fetch all users
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        if (users && users.users) {
          template = EmailTemplates.newFeature(payload.featureName, payload.description);
          let sent = 0;
          for (const u of users.users) {
            if (u.email) {
              await sendEmail({ ...template, to: u.email });
              sent++;
            }
          }
          return res.status(200).json({ success: true, message: `Sent to ${sent} users` });
        }
        return res.status(500).json({ error: 'Failed to fetch users' });

      case 'low_score':
        // payload: { email, name }
        template = EmailTemplates.lowScoreIntervention(payload.name);
        break;

      case 'referral':
        // payload: { friendEmail, inviterName }
        template = EmailTemplates.referralInvite(payload.inviterName);
        toEmail = payload.friendEmail;
        break;

      default:
        return res.status(400).json({ error: 'Unknown email type' });
    }

    if (!template || !toEmail) {
      return res.status(400).json({ error: 'Failed to construct email' });
    }

    const result = await sendEmail({ ...template, to: toEmail });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Trigger email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
