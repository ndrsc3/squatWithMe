import { describe, it, expect } from 'vitest';
import { calculateStreak, longestRun, monthCount, daysSince, daysToWinter, isDormant } from './squats';

describe('calculateStreak', () => {
    it('returns 0 for empty/undefined squats', () => {
        expect(calculateStreak({}, '2026-08-03')).toBe(0);
        // @ts-expect-error — guard against null at runtime
        expect(calculateStreak(null, '2026-08-03')).toBe(0);
    });

    it('counts today when squatted today', () => {
        expect(calculateStreak({ '2026-08': [3] }, '2026-08-03')).toBe(1);
    });

    it('counts consecutive days ending today', () => {
        expect(calculateStreak({ '2026-08': [1, 2, 3] }, '2026-08-03')).toBe(3);
    });

    it('gives grace for today: counts backward from yesterday when today not yet done', () => {
        // today (the 3rd) not in the set, but 1st + 2nd are → streak of 2 still alive
        expect(calculateStreak({ '2026-08': [1, 2] }, '2026-08-03')).toBe(2);
    });

    it('breaks the streak on a gap', () => {
        // squatted today + a gap before → only today counts
        expect(calculateStreak({ '2026-08': [1, 3] }, '2026-08-03')).toBe(1);
    });

    it('crosses month boundaries', () => {
        expect(
            calculateStreak({ '2026-07': [30, 31], '2026-08': [1] }, '2026-08-01'),
        ).toBe(3);
    });

    it('returns 0 when neither today nor yesterday was squatted', () => {
        expect(calculateStreak({ '2026-08': [1] }, '2026-08-03')).toBe(0);
    });
});

describe('longestRun', () => {
    it('finds the best run inside the window, not just the current streak', () => {
        // run of 3 (days 5–7) beats current streak of 1 (day 15)
        expect(longestRun({ '2026-08': [5, 6, 7, 15] }, '2026-08-15', 30)).toBe(3);
    });

    it('crosses month boundaries', () => {
        expect(longestRun({ '2026-07': [31], '2026-08': [1, 2] }, '2026-08-10', 30)).toBe(3);
    });

    it('ignores days before the window', () => {
        expect(longestRun({ '2026-08': [1, 2, 3, 14] }, '2026-08-15', 7)).toBe(1);
    });

    it('returns 0 for empty squats', () => {
        expect(longestRun({}, '2026-08-15', 30)).toBe(0);
    });
});

describe('monthCount', () => {
    it('counts only the current month up to today', () => {
        expect(monthCount({ '2026-07': [30, 31], '2026-08': [1, 2, 3] }, '2026-08-04')).toBe(3);
    });

    it('excludes future days in the month', () => {
        expect(monthCount({ '2026-08': [1, 2, 20] }, '2026-08-04')).toBe(2);
    });
});

describe('daysSince', () => {
    it('counts squat-days from since (inclusive) through today', () => {
        expect(daysSince({ '2026-08': [2, 3, 4] }, '2026-08-03', '2026-08-04')).toBe(2);
    });

    it('spans months', () => {
        expect(daysSince({ '2026-08': [3, 20], '2026-09': [1] }, '2026-08-03', '2026-09-02')).toBe(3);
    });
});

describe('daysToWinter', () => {
    it('counts to Dec 1', () => {
        expect(daysToWinter('2026-11-30')).toBe(1);
        expect(daysToWinter('2026-08-04')).toBe(119);
    });

    it('returns 0 during meteorological winter (Dec–Feb)', () => {
        expect(daysToWinter('2026-12-01')).toBe(0);
        expect(daysToWinter('2027-01-15')).toBe(0);
        expect(daysToWinter('2027-02-28')).toBe(0);
    });

    it('counts to next winter from March', () => {
        expect(daysToWinter('2027-03-01')).toBe(275);
    });
});

describe('isDormant', () => {
    it('dormant when no squat within the quiet window', () => {
        expect(isDormant({ '2026-08': [1] }, '2026-08-15')).toBe(true);
    });

    it('not dormant when squatted recently, even with zero streak', () => {
        // last squat 3 days ago → streak 0 but still active
        expect(isDormant({ '2026-08': [12] }, '2026-08-15')).toBe(false);
    });

    it('not dormant with a live streak', () => {
        expect(isDormant({ '2026-08': [14, 15] }, '2026-08-15')).toBe(false);
    });

    it('boundary: squat exactly quietDays ago still counts as active', () => {
        expect(isDormant({ '2026-08': [8] }, '2026-08-15', 7)).toBe(false);
    });
});
