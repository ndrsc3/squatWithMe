import { describe, expect, it } from 'vitest';
import { distanceKm, formatKm } from './geo';

const TOKYO = { lat: 35.6762, lng: 139.6503 };
const OSAKA = { lat: 34.6937, lng: 135.5023 };
const NOZAWA = { lat: 36.9218, lng: 138.4405 };
const NOZAWA_BATHS = { lat: 36.9235, lng: 138.4419 };

describe('distanceKm', () => {
    it('zero for identical points', () => {
        expect(distanceKm(TOKYO, TOKYO)).toBe(0);
    });
    it('Tokyo–Osaka ≈ 400 km', () => {
        const d = distanceKm(TOKYO, OSAKA);
        expect(d).toBeGreaterThan(380);
        expect(d).toBeLessThan(420);
    });
    it('symmetric', () => {
        expect(distanceKm(TOKYO, OSAKA)).toBeCloseTo(distanceKm(OSAKA, TOKYO), 10);
    });
    it('sub-km village distance', () => {
        expect(distanceKm(NOZAWA, NOZAWA_BATHS)).toBeLessThan(1);
    });
});

describe('formatKm', () => {
    it('one decimal under 10', () => {
        expect(formatKm(0.42)).toBe('0.4 km');
    });
    it('rounds above 10', () => {
        expect(formatKm(17.6)).toBe('18 km');
    });
});
