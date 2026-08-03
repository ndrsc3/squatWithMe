import { describe, it, expect } from 'vitest';
import { calculateStreak } from './squats';

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
