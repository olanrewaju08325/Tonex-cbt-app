export const BANK_DETAILS = {
  accountNumber: '6017722053',
  accountName: 'BENEDICT CHIDALU OBIANOM',
  bankName: 'Moniepoint',
  whatsappNumber: '09043554038',
  whatsappLink: 'https://wa.me/2349043554038',
};

export const PLAN_DETAILS = {
  monthly: { label: 'Monthly', amount: 2500, durationDays: 30 },
  quarterly: { label: 'Quarterly', amount: 6500, durationDays: 90 },
  yearly: { label: 'Yearly', amount: 25000, durationDays: 365 },
};

export function calculateExpiry(plan: 'monthly' | 'quarterly' | 'yearly'): Date {
  const now = new Date();
  now.setDate(now.getDate() + PLAN_DETAILS[plan].durationDays);
  return now;
}
