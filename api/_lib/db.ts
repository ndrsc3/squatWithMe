// Thin DB seam. All queries go through this `sql` tag (auto-parameterized —
// interpolations become bound params, never string-concatenated). Swapping the
// Postgres provider later means changing only this file.
//
// Provider: Neon serverless driver (@vercel/postgres is sunset). Lazy-initialized
// so importing this module without DATABASE_URL (build time, unit tests) is safe.
import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon> | null = null;

function getClient(): ReturnType<typeof neon> {
    if (!client) {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error('DATABASE_URL is not set');
        client = neon(url);
    }
    return client;
}

export async function sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...params: unknown[]
): Promise<{ rows: T[] }> {
    const rows = await getClient()(strings, ...params);
    return { rows: rows as T[] };
}
