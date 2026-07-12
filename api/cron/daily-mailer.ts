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
    const results = {
      expirySent: 0,
      weMissYouSent: 0,
      countdownSent: 0,
    };

    // 1. Fetch active premium users and check expiry
    const { data: subs, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*, profiles!inner(full_name, id), auth.users!inner(email)')
      .eq('status', 'active');

    if (!subError && subs) {
      const now = new Date();
      for (const sub of subs) {
        if (!sub.end_date) continue;
        const endDate = new Date(sub.end_date);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if ([3, 1, 0].includes(diffDays)) {
          // Check if already sent today
          const campaignType = `expiry_${diffDays}_days`;
          const { data: logged } = await supabaseAdmin
            .from('email_campaign_logs')
            .select('id')
            .eq('user_id', sub.user_id)
            .eq('campaign_type', campaignType)
            .single();

          if (!logged) {
            // Send email
            const template = EmailTemplates.subscriptionExpiry(diffDays);
            // We use sub.profiles as any to extract data due to join typing
            const userEmail = (sub as any).users?.email;
            if (userEmail) {
              await sendEmail({ ...template, to: userEmail });
              await supabaseAdmin.from('email_campaign_logs').insert({
                user_id: sub.user_id,
                campaign_type: campaignType
              });
              results.expirySent++;
            }
          }
        }
      }
    }

    // 2. We Miss You Campaigns (Inactive for 5 days)
    // Unfortunately auth.users last_sign_in_at is not easily accessible via generic join 
    // unless using Admin API. 
    // Alternatively, we can check daily_usage or exam_sessions for the latest activity.
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (!userError && users.users) {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      for (const user of users.users) {
        if (user.last_sign_in_at) {
          const lastSignIn = new Date(user.last_sign_in_at);
          if (lastSignIn < fiveDaysAgo) {
            // Check if already sent recently (within last 7 days)
            const { data: logged } = await supabaseAdmin
              .from('email_campaign_logs')
              .select('sent_at')
              .eq('user_id', user.id)
              .eq('campaign_type', 'we_miss_you')
              .order('sent_at', { ascending: false })
              .limit(1);

            let shouldSend = true;
            if (logged && logged.length > 0) {
              const lastSent = new Date(logged[0].sent_at);
              const daysSinceLastSent = (new Date().getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSinceLastSent < 7) {
                shouldSend = false; // Don't spam, wait at least a week before sending another 'we miss you'
              }
            }

            if (shouldSend) {
              const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).single();
              const name = profile?.full_name?.split(' ')[0] || 'Student';
              const template = EmailTemplates.weMissYou(name);
              await sendEmail({ ...template, to: user.email! });
              await supabaseAdmin.from('email_campaign_logs').insert({
                user_id: user.id,
                campaign_type: 'we_miss_you'
              });
              results.weMissYouSent++;
            }
          }
        }
      }
    }

    // 3. Exam Day Countdown
    // Assuming Exam date is a fixed date in the future for JAMB (e.g., April 19, 2027)
    const EXAM_DATE = new Date('2027-04-19T00:00:00Z');
    const daysUntilExam = Math.ceil((EXAM_DATE.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    // Send weekly countdowns (e.g. 60 days, 30 days, 14 days, 7 days, 3 days, 1 day)
    const milestoneDays = [60, 30, 14, 7, 3, 1];
    if (milestoneDays.includes(daysUntilExam)) {
      if (users && users.users) {
        for (const user of users.users) {
          const campaignType = `exam_countdown_${daysUntilExam}`;
          const { data: logged } = await supabaseAdmin
            .from('email_campaign_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('campaign_type', campaignType)
            .single();
            
          if (!logged) {
            const template = EmailTemplates.examCountdown(daysUntilExam);
            await sendEmail({ ...template, to: user.email! });
            await supabaseAdmin.from('email_campaign_logs').insert({
              user_id: user.id,
              campaign_type: campaignType
            });
            results.countdownSent++;
          }
        }
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (err: any) {
    console.error('Daily mailer error:', err);
    return res.status(500).json({ error: err.message });
  }
}
