import * as apiClient from './api-client';

/** V2 relaunch — the season meter banks squat-days from this date. */
export const RELAUNCH_DATE = '2026-08-03';

export async function recordSquat(date: string): Promise<void> {
    await apiClient.recordSquat(date);
}

function hasDay(squats: Record<string, number[]>, d: Date): boolean {
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return squats[mk]?.includes(d.getDate()) ?? false;
}

function parseDay(date: string): Date {
    return new Date(`${date}T00:00:00`);
}

export function calculateStreak(squats: Record<string, number[]>, today: string): number {
    if (!squats) return 0;

    const [yyyy, mm, dd] = today.split('-');
    const monthKey = `${yyyy}-${mm}`;
    const ddInt = parseInt(dd);

    const hasSquattedToday = squats[monthKey]?.includes(ddInt) ?? false;

    let streak = 0;
    const checkDate = parseDay(today);

    if (!hasSquattedToday) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (hasDay(squats, checkDate)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
}

/** Longest consecutive run in the `windowDays` ending at `today`. */
export function longestRun(
    squats: Record<string, number[]>,
    today: string,
    windowDays: number
): number {
    if (!squats) return 0;
    let best = 0;
    let run = 0;
    const d = parseDay(today);
    d.setDate(d.getDate() - (windowDays - 1));
    for (let i = 0; i < windowDays; i++) {
        run = hasDay(squats, d) ? run + 1 : 0;
        if (run > best) best = run;
        d.setDate(d.getDate() + 1);
    }
    return best;
}

/** Squat-days in the calendar month of `today`. */
export function monthCount(squats: Record<string, number[]>, today: string): number {
    if (!squats) return 0;
    const [yyyy, mm, dd] = today.split('-');
    const days = squats[`${yyyy}-${mm}`] ?? [];
    return days.filter((day) => day <= parseInt(dd)).length;
}

/** Squat-days from `since` (inclusive) through `today` — the season meter's "banked". */
export function daysSince(
    squats: Record<string, number[]>,
    since: string,
    today: string
): number {
    if (!squats) return 0;
    const start = parseDay(since);
    const end = parseDay(today);
    let count = 0;
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (hasDay(squats, d)) count++;
    }
    return count;
}

/** Days until meteorological winter (Dec 1); 0 while in winter (Dec–Feb). */
export function daysToWinter(today: string): number {
    const d = parseDay(today);
    const month = d.getMonth();
    if (month === 11 || month === 0 || month === 1) return 0;
    const winter = new Date(d.getFullYear(), 11, 1);
    return Math.round((winter.getTime() - d.getTime()) / 86400000);
}

/** Dormant = no streak and quiet for over `quietDays` (default a week). */
export function isDormant(
    squats: Record<string, number[]>,
    today: string,
    quietDays = 7
): boolean {
    if (!squats) return true;
    if (calculateStreak(squats, today) > 0) return false;
    const d = parseDay(today);
    for (let i = 0; i <= quietDays; i++) {
        if (hasDay(squats, d)) return false;
        d.setDate(d.getDate() - 1);
    }
    return true;
}
