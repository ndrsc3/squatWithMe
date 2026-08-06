/**
 * Geocoding via OSM Nominatim (free, no key; ~1 req/s policy). Never throws.
 *
 * Nominatim ranks an area (a ski-resort polygon, a whole town) above the point you meant,
 * and for a way/relation it reports the CENTROID. Taking `limit=1` therefore pinned every
 * seeded resort 0.6–2.5 km from its base — mid-mountain instead of at the gondola.
 * So: ask for several candidates and prefer an actual point.
 *
 * A wrong coordinate is worse than none here. The list computes "near" from coordinates
 * (see renderNearby in src/views/lists.ts), so a centroid in the middle of a prefecture
 * silently corrupts every hub distance rather than just misplacing one pin.
 */

export type NominatimHit = {
    lat: string;
    lon: string;
    osm_type?: string;
    class?: string;
    type?: string;
    /** [minLat, maxLat, minLon, maxLon] as strings. */
    boundingbox?: string[];
};

export type GeoResult = {
    lat: number;
    lng: number;
    /** 'point' = an OSM node (a POI). 'area' = a way/relation centroid — approximate. */
    precision: 'point' | 'area';
    spanKm: number;
};

/** Anything wider than this is a region, not a place. Rejected outright. */
const MAX_SPAN_KM = 25;

const KM_PER_DEG_LAT = 111;

/**
 * Transport and admin features share names with the places they serve, and Nominatim
 * happily ranks them first. "Myoko Kogen" matched the railway station of that name —
 * a real node, on the valley floor, 4.2 km from and 233 m below the ski area's base.
 * Demoted rather than dropped: sometimes the station really is the only match.
 */
const FALSE_FRIEND_CLASSES = new Set(['railway', 'highway', 'boundary', 'aeroway']);

/** Rough diagonal span of a Nominatim boundingbox, in km. 0 when absent or unparseable. */
export function bboxSpanKm(bbox?: string[]): number {
    if (!bbox || bbox.length < 4) return 0;
    const [minLat, maxLat, minLon, maxLon] = bbox.map(Number);
    if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) return 0;
    const midLat = (minLat + maxLat) / 2;
    const dLat = (maxLat - minLat) * KM_PER_DEG_LAT;
    const dLon = (maxLon - minLon) * KM_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
    return Math.hypot(dLat, dLon);
}

/**
 * Pick the most precise usable candidate. Plausible features beat false friends
 * (a station named after the resort); points beat area centroids; smaller areas beat
 * bigger ones. Region-scale matches are dropped entirely.
 */
export function pickBestHit(hits: NominatimHit[]): GeoResult | null {
    const scored = hits
        .map((hit) => ({
            lat: parseFloat(hit.lat),
            lng: parseFloat(hit.lon),
            spanKm: bboxSpanKm(hit.boundingbox),
            isPoint: hit.osm_type === 'node',
            isFalseFriend: FALSE_FRIEND_CLASSES.has(hit.class ?? ''),
        }))
        .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng) && h.spanKm <= MAX_SPAN_KM)
        .sort(
            (a, b) =>
                Number(a.isFalseFriend) - Number(b.isFalseFriend) ||
                Number(b.isPoint) - Number(a.isPoint) ||
                a.spanKm - b.spanKm,
        );

    const best = scored[0];
    if (!best) return null;
    return {
        lat: best.lat,
        lng: best.lng,
        precision: best.isPoint ? 'point' : 'area',
        spanKm: best.spanKm,
    };
}

export async function geocode(query: string): Promise<GeoResult | null> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
            {
                signal: controller.signal,
                headers: { 'user-agent': 'squatwithme/2.0 (friends trip planner)' },
            },
        );
        clearTimeout(timer);
        if (!res.ok) return null;
        const data = (await res.json()) as NominatimHit[];
        return Array.isArray(data) ? pickBestHit(data) : null;
    } catch {
        return null;
    }
}

/**
 * Address wins; else title + region. Returns null when the input is too vague to geocode
 * safely — a bare title ("Bang Bang") matches something on nearly every continent, and a
 * confident wrong pin is worse than an honest missing one. A URL in the address slot
 * (the field now takes a pasted Google Maps link) is never a Nominatim query.
 */
export function buildGeoQuery(input: {
    address?: string | null;
    title: string;
    region?: string | null;
}): string | null {
    if (input.address && !/^https?:\/\//i.test(input.address)) return input.address;
    const region = input.region?.trim();
    if (!region || region.toLowerCase() === 'anywhere') return null;
    return `${input.title}, ${region}`;
}

/**
 * Coordinates embedded in a pasted Google Maps URL. `!3d…!4d…` is the selected place's
 * pin — exact, prefer it; `@lat,lng` is only the viewport center. Short share links
 * (maps.app.goo.gl) embed neither and return null — callers fall back to geocoding.
 */
export function coordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
    const pick = (m: RegExpExecArray | null) => {
        if (!m) return null;
        const lat = Number(m[1]);
        const lng = Number(m[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { lat, lng };
    };
    return (
        pick(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(url)) ??
        pick(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url))
    );
}
