import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'antigravitymuiz@gmail.com',
    pass: process.env.SMTP_PASSWORD, // Must be Google App Password
  },
});

export type EmailTemplateParams = {
  subject: string;
  body: string;
  to: string;
};

// Base HTML Wrapper for beautiful emails
function getHtmlTemplate(title: string, bodyContent: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
      .header { background-color: #08142D; padding: 30px 20px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; }
      .content { padding: 30px; color: #334155; line-height: 1.6; font-size: 16px; }
      .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; }
      .button { display: inline-block; background-color: #2563EB; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
      .highlight { color: #2563EB; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Tonex CBT Engine</h1>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Tonex CBT. All rights reserved.<br>
        This is an automated message, please do not reply directly to this email.
      </div>
    </div>
  </body>
  </html>
  `;
}

export async function sendEmail({ subject, body, to }: EmailTemplateParams) {
  const html = getHtmlTemplate(subject, body);
  
  try {
    const info = await transporter.sendMail({
      from: '"Tonex CBT" <antigravitymuiz@gmail.com>',
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return { success: false, error };
  }
}

// ---------------------------------------------------------
// Specialized Email Generators
// ---------------------------------------------------------

export const EmailTemplates = {
  welcomeDrip(day: number, name: string) {
    if (day === 1) {
      return {
        subject: "Welcome to Tonex CBT! 🚀",
        body: `
          <h2>Hi ${name}, welcome aboard!</h2>
          <p>We are thrilled to have you join Tonex CBT. Our platform is designed to help you ace your JAMB and Post-UTME exams with ease.</p>
          <p>Start your first practice session today and experience the difference.</p>
          <center><a href="https://tonex-cbt.vercel.app/practice" class="button">Start Practicing</a></center>
        `
      };
    } else if (day === 2) {
      return {
        subject: "Did you know about our AI Predictor? 🎓",
        body: `
          <h2>Hi ${name},</h2>
          <p>Did you know Tonex CBT features a smart <span class="highlight">AI Admission Predictor</span>?</p>
          <p>Upgrade to our Premium plan to unlock this feature and see your exact chances of gaining admission into your dream university!</p>
          <center><a href="https://tonex-cbt.vercel.app/premium" class="button">Unlock Premium</a></center>
        `
      };
    } else {
      return {
        subject: "Master your weaknesses with AI Summaries 🧠",
        body: `
          <h2>Hi ${name},</h2>
          <p>Our AI doesn't just grade you—it acts as your personal tutor. At the end of every mock exam, Premium users get a personalized breakdown of exactly what topics to study next.</p>
          <p>Stop guessing and start studying smarter.</p>
          <center><a href="https://tonex-cbt.vercel.app/premium" class="button">Get AI Insights</a></center>
        `
      };
    }
  },

  weeklyReport(studentName: string, examsTaken: number, averageScore: number) {
    return {
      subject: \`Weekly Progress Report for \${studentName}\`,
      body: \`
        <h2>Weekly Study Report</h2>
        <p>Here is the weekly CBT performance summary for <strong>\${studentName}</strong>:</p>
        <ul>
          <li><strong>Exams Completed:</strong> \${examsTaken}</li>
          <li><strong>Average Score:</strong> \${averageScore.toFixed(1)}%</li>
        </ul>
        <p>\${averageScore >= 70 ? 'Great job! Keep up the excellent work.' : 'There is room for improvement. We recommend focusing on weak subjects this week.'}</p>
      \`
    };
  },

  subscriptionExpiry(daysLeft: number) {
    return {
      subject: \`Action Required: Your Premium Plan expires in \${daysLeft} \${daysLeft === 1 ? 'day' : 'days'}\`,
      body: \`
        <h2>Don't lose your Premium features!</h2>
        <p>Your Tonex CBT Premium subscription will expire in <strong>\${daysLeft} \${daysLeft === 1 ? 'day' : 'days'}</strong>.</p>
        <p>Renew now to keep access to AI Tutors, Offline Downloads, and unlimited exams.</p>
        <center><a href="https://tonex-cbt.vercel.app/premium" class="button">Renew Subscription</a></center>
      \`
    };
  },

  examCountdown(daysLeft: number) {
    return {
      subject: \`Only \${daysLeft} days until Exam Day! ⏳\`,
      body: \`
        <h2>The clock is ticking!</h2>
        <p>You have exactly <strong>\${daysLeft} days</strong> left until the official exams.</p>
        <p>Make every day count. Take a full proctored mock exam today to test your readiness.</p>
        <center><a href="https://tonex-cbt.vercel.app/exam" class="button">Take Mock Exam</a></center>
      \`
    };
  },

  weMissYou(name: string) {
    return {
      subject: "We miss you at Tonex CBT! 👋",
      body: \`
        <h2>Where have you been, \${name}?</h2>
        <p>You haven't practiced in over 5 days. Consistency is the secret to high scores!</p>
        <p>Log in now and complete just one quick 15-minute practice session to keep your brain sharp.</p>
        <center><a href="https://tonex-cbt.vercel.app/practice" class="button">Resume Practice</a></center>
      \`
    };
  },

  achievementUnlocked(name: string, achievement: string) {
    return {
      subject: \`Achievement Unlocked: \${achievement}! 🏆\`,
      body: \`
        <h2>Congratulations, \${name}!</h2>
        <p>You just unlocked a new milestone: <strong class="highlight">\${achievement}</strong></p>
        <p>We are incredibly proud of your dedication. Keep climbing the leaderboard!</p>
        <center><a href="https://tonex-cbt.vercel.app/leaderboard" class="button">View Leaderboard</a></center>
      \`
    };
  },

  manualPaymentReceipt(name: string, amount: number, plan: string) {
    return {
      subject: "Payment Received - Premium Activated! 💳",
      body: \`
        <h2>Thank you for your payment, \${name}!</h2>
        <p>We have successfully received your bank transfer of <strong>₦\${amount.toLocaleString()}</strong>.</p>
        <p>Your <strong>\${plan.toUpperCase()}</strong> plan is now fully active.</p>
        <p>Log out and log back in to access all your premium features.</p>
        <center><a href="https://tonex-cbt.vercel.app/" class="button">Go to Dashboard</a></center>
      \`
    };
  },

  newFeature(featureName: string, description: string) {
    return {
      subject: \`New Feature Alert: \${featureName} is here! 🌟\`,
      body: \`
        <h2>Exciting news!</h2>
        <p>We just launched a brand new feature: <strong>\${featureName}</strong>.</p>
        <p>\${description}</p>
        <center><a href="https://tonex-cbt.vercel.app/" class="button">Try it now</a></center>
      \`
    };
  },

  lowScoreIntervention(name: string) {
    return {
      subject: "Need some help with your studies? 📚",
      body: \`
        <h2>Hi \${name}, don't give up!</h2>
        <p>We noticed your recent mock exam scores were a bit lower than usual. That's completely normal, but it means you need to change your study strategy.</p>
        <p>Our <strong>AI Chatbot Tutor</strong> in Practice Mode can explain every failed question to you step-by-step.</p>
        <center><a href="https://tonex-cbt.vercel.app/practice" class="button">Practice with AI</a></center>
      \`
    };
  },

  referralInvite(inviterName: string) {
    return {
      subject: \`\${inviterName} invited you to join Tonex CBT! 🎓\`,
      body: \`
        <h2>Your friend \${inviterName} thinks you'd love Tonex CBT.</h2>
        <p>Join the smartest community of students preparing for JAMB and Post-UTME using AI technology.</p>
        <center><a href="https://tonex-cbt.vercel.app/signup" class="button">Create Free Account</a></center>
      \`
    };
  }
};
