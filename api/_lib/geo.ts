/** Best-effort geocoding via OSM Nominatim (free, no key; ~1 req/s policy). Never throws. */
export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
            {
                signal: controller.signal,
                headers: { 'user-agent': 'squatwithme/2.0 (friends trip planner)' },
            },
        );
        clearTimeout(timer);
        if (!res.ok) return null;
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        const hit = data[0];
        if (!hit) return null;
        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    } catch {
        return null;
    }
}

/** Address wins; else title + region ("Anywhere"/empty region → title alone). */
export function buildGeoQuery(input: {
    address?: string | null;
    title: string;
    region?: string | null;
}): string {
    if (input.address) return input.address;
    const region = input.region && input.region.toLowerCase() !== 'anywhere' ? `, ${input.region}` : '';
    return `${input.title}${region}`;
}
