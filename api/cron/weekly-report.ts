import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase';
import { sendEmail, EmailTemplates } from '../_lib/mailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Optional: Verify cron secret if configured in Vercel
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let emailsSent = 0;

    // Fetch all profiles that have a parent_email
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, parent_email')
      .not('parent_email', 'is', null);

    if (!profileErr && profiles) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isoSevenDaysAgo = sevenDaysAgo.toISOString();

      for (const profile of profiles) {
        if (!profile.parent_email) continue;

        // Fetch exam sessions for this user in the last 7 days
        const { data: sessions } = await supabaseAdmin
          .from('exam_sessions')
          .select('score')
          .eq('user_id', profile.id)
          .eq('status', 'completed')
          .gte('completed_at', isoSevenDaysAgo);

        if (sessions && sessions.length > 0) {
          const totalExams = sessions.length;
          const avgScore = sessions.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalExams;

          const template = EmailTemplates.weeklyReport(profile.full_name || 'Student', totalExams, avgScore);
          await sendEmail({ ...template, to: profile.parent_email });
          emailsSent++;
        }
      }
    }

    return res.status(200).json({ success: true, emailsSent });
  } catch (err: any) {
    console.error('Weekly report error:', err);
    return res.status(500).json({ error: err.message });
  }
}
