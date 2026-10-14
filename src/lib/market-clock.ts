import type { MarketSession } from '../types';

export class MarketHoursEngine {
  public static resolve(timestamp: number = Date.now()): { session: MarketSession; nyTimeStr: string } {
    const date = new Date(timestamp);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const parts = formatter.formatToParts(date);
    let weekday = '';
    let hour = 0;
    let minute = 0;
    let second = 0;
    let month = '';
    let day = '';
    let year = '';

    for (const part of parts) {
      if (part.type === 'weekday') weekday = part.value;
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
      if (part.type === 'second') second = parseInt(part.value, 10);
      if (part.type === 'month') month = part.value;
      if (part.type === 'day') day = part.value;
      if (part.type === 'year') year = part.value;
    }

    const nyTimeStr = `${year}-${month}-${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} ET`;

    if (weekday === 'Sat' || weekday === 'Sun') {
      return { session: 'WEEKEND_CLOSED', nyTimeStr };
    }

    const minutesFromMidnight = hour * 60 + minute;
    const preMarketStart = 4 * 60; // 04:00 ET
    const marketOpen = 9 * 60 + 30; // 09:30 ET
    const marketClose = 16 * 60; // 16:00 ET
    const afterHoursEnd = 20 * 60; // 20:00 ET

    if (minutesFromMidnight >= marketOpen && minutesFromMidnight < marketClose) {
      return { session: 'REGULAR_HOURS', nyTimeStr };
    }
    if (minutesFromMidnight >= preMarketStart && minutesFromMidnight < marketOpen) {
      return { session: 'PRE_MARKET', nyTimeStr };
    }
    if (minutesFromMidnight >= marketClose && minutesFromMidnight < afterHoursEnd) {
      return { session: 'AFTER_HOURS', nyTimeStr };
    }
    return { session: 'WEEKEND_CLOSED', nyTimeStr };
  }
}
