/**
 * West Africa Time (WAT) helper utility
 * Lock all date & streak calculations to UTC+1 to avoid local client timezone skews.
 */

export function getWATDate(): Date {
  const now = new Date();
  // Get UTC time in ms
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // West Africa Time is UTC+1 (offset: +3600000 ms)
  const watTime = new Date(utc + 3600000);
  return watTime;
}

export function getWATString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wat = new Date(utc + 3600000);
  
  // Format as YYYY-MM-DD
  const yyyy = wat.getFullYear();
  const mm = String(wat.getMonth() + 1).padStart(2, "0");
  const dd = String(wat.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isWATToday(dateStr: string): boolean {
  return getWATString() === dateStr;
}

export function getSecondsUntilWATMidnight(): number {
  const watNow = getWATDate();
  const watMidnight = new Date(watNow);
  watMidnight.setHours(24, 0, 0, 0); // Next midnight in WAT
  
  return Math.max(0, Math.floor((watMidnight.getTime() - watNow.getTime()) / 1000));
}
