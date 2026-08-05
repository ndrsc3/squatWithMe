import { describe, expect, it } from 'vitest';
import { bboxSpanKm, buildGeoQuery, pickBestHit, type NominatimHit } from './geo';

/** Nominatim shape, trimmed to the fields pickBestHit reads. */
function hit(partial: Partial<NominatimHit> & Pick<NominatimHit, 'lat' | 'lon'>): NominatimHit {
    return { osm_type: 'node', boundingbox: undefined, ...partial };
}

describe('bboxSpanKm', () => {
    it('0 when absent or malformed', () => {
        expect(bboxSpanKm(undefined)).toBe(0);
        expect(bboxSpanKm(['1', '2'])).toBe(0);
        expect(bboxSpanKm(['a', 'b', 'c', 'd'])).toBe(0);
    });

    it('node-sized boxes are sub-km', () => {
        expect(bboxSpanKm(['42.8614', '42.8616', '140.6976', '140.6978'])).toBeLessThan(1);
    });

    it('a ski-area polygon is a few km', () => {
        // Rusutsu's winter_sports polygon, roughly.
        const span = bboxSpanKm(['42.7200', '42.7600', '140.8700', '140.9300']);
        expect(span).toBeGreaterThan(3);
        expect(span).toBeLessThan(12);
    });

    it('a prefecture is region-scale', () => {
        expect(bboxSpanKm(['41.3', '45.6', '139.3', '148.9'])).toBeGreaterThan(25);
    });
});

describe('pickBestHit', () => {
    it('null on empty', () => {
        expect(pickBestHit([])).toBeNull();
    });

    it('prefers a node over an area centroid', () => {
        const best = pickBestHit([
            hit({
                lat: '42.7309',
                lon: '140.9196',
                osm_type: 'way',
                class: 'landuse',
                boundingbox: ['42.7200', '42.7600', '140.8700', '140.9300'],
            }),
            hit({ lat: '42.7492', lon: '140.8995', osm_type: 'node', class: 'aerialway' }),
        ]);
        expect(best?.lat).toBeCloseTo(42.7492, 4);
        expect(best?.precision).toBe('point');
    });

    it('picks the smallest area when no node is available', () => {
        const best = pickBestHit([
            hit({
                lat: '43.0',
                lon: '142.0',
                osm_type: 'relation',
                class: 'place',
                boundingbox: ['42.90', '43.10', '141.90', '142.10'],
            }),
            hit({
                lat: '43.32',
                lon: '142.35',
                osm_type: 'way',
                class: 'landuse',
                boundingbox: ['43.315', '43.325', '142.345', '142.355'],
            }),
        ]);
        expect(best?.lat).toBeCloseTo(43.32, 2);
        expect(best?.precision).toBe('area');
    });

    it('drops region-scale matches entirely', () => {
        const best = pickBestHit([
            hit({
                lat: '43.2',
                lon: '142.8',
                osm_type: 'relation',
                class: 'boundary',
                boundingbox: ['41.3', '45.6', '139.3', '148.9'],
            }),
        ]);
        expect(best).toBeNull();
    });

    it('demotes a railway station that shares the place name (the Myoko Kogen case)', () => {
        // Real data: Nominatim ranked the station node first, 4.2 km from the ski base.
        const station = hit({
            lat: '36.8722009',
            lon: '138.2121958',
            osm_type: 'node',
            class: 'railway',
            type: 'station',
        });
        const resort = hit({
            lat: '36.896459',
            lon: '138.175545',
            osm_type: 'way',
            class: 'landuse',
            boundingbox: ['36.890', '36.905', '138.160', '138.185'],
        });
        const best = pickBestHit([station, resort]);
        expect(best?.lat).toBeCloseTo(36.8965, 3);
    });

    it('still returns a false friend when it is the only candidate', () => {
        const best = pickBestHit([
            hit({ lat: '36.8722', lon: '138.2122', osm_type: 'node', class: 'railway' }),
        ]);
        expect(best?.lat).toBeCloseTo(36.8722, 4);
    });

    it('ignores unparseable coordinates', () => {
        const best = pickBestHit([
            hit({ lat: 'nope', lon: 'nope', osm_type: 'node' }),
            hit({ lat: '38.1617', lon: '140.3952', osm_type: 'node' }),
        ]);
        expect(best?.lat).toBeCloseTo(38.1617, 4);
    });
});

describe('buildGeoQuery', () => {
    it('address wins outright', () => {
        expect(
            buildGeoQuery({
                address: '13 Izumikawa, Rusutsu-mura, Hokkaido 048-1711, Japan',
                title: 'Rusutsu',
                region: 'Hokkaido',
            }),
        ).toBe('13 Izumikawa, Rusutsu-mura, Hokkaido 048-1711, Japan');
    });

    it('falls back to title + region', () => {
        expect(buildGeoQuery({ title: 'Rusutsu', region: 'Hokkaido' })).toBe('Rusutsu, Hokkaido');
    });

    it('null when the region is "Anywhere" — too vague to pin', () => {
        expect(buildGeoQuery({ title: 'Izakaya night', region: 'Anywhere' })).toBeNull();
        expect(buildGeoQuery({ title: 'Izakaya night', region: 'anywhere' })).toBeNull();
    });

    it('null on a bare title', () => {
        expect(buildGeoQuery({ title: 'Bang Bang' })).toBeNull();
        expect(buildGeoQuery({ title: 'Bang Bang', region: '   ' })).toBeNull();
    });
});
