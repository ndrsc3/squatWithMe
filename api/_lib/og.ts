/** Best-effort og:image autopull from an item's link. Never throws; null on any failure. */
export async function fetchOgImage(pageUrl: string): Promise<string | null> {
    try {
        const parsed = new URL(pageUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(pageUrl, {
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'user-agent': 'Mozilla/5.0 (compatible; squatwithme/2.0)' },
        });
        clearTimeout(timer);
        if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null;

        const html = (await res.text()).slice(0, 300_000);
        const match =
            html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ??
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        const imageUrl = match?.[1] ?? null;
        if (!imageUrl || !/^https?:\/\//.test(imageUrl)) return null;
        return imageUrl.length <= 2000 ? imageUrl : null;
    } catch {
        return null;
    }
}
