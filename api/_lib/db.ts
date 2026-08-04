// Thin DB seam. All queries go through this `sql` tag (auto-parameterized —
// interpolations become bound params, never string-concatenated). Swapping the
// Postgres provider later means changing only this file.
export { sql } from '@vercel/postgres';
