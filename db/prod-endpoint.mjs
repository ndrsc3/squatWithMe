// The production database's identity — the ONE place it lives. Imported by
// scripts/dev-check.mjs (local dev must never point at production) and, from the
// preview-branch work on, by db/run-schema.mjs (a preview build must never write to it).
//
// The Neon endpoint id (`ep-…`) is not a secret: it is the hostname's first label, with
// no credentials. Pooled and direct hosts differ only by a `-pooler` suffix, so both
// forms are matched.
//
// Fail closed: an unset id or an unparseable URL counts as production.

export const PROD_ENDPOINT_ID = 'ep-blue-smoke-awocaq2b';

/** `ep-…` id of a Postgres URL, `-pooler` stripped; null when it can't be read. */
export function endpointId(url) {
    try {
        const label = new URL(url).hostname.split('.')[0];
        return label.startsWith('ep-') ? label.replace(/-pooler$/, '') : null;
    } catch {
        return null;
    }
}

/** True when `url` is — or can't be proven not to be — the production database. */
export function isProductionUrl(url, prodId = PROD_ENDPOINT_ID) {
    const id = endpointId(url);
    if (!prodId || !id) return true;
    return id === prodId;
}
