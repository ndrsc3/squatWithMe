import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import { allowMethods } from './_lib/http';
import { getUsersWithSquats } from './_lib/squats-repo';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'GET')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        // Client sends the window start (its local first-of-previous-month);
        // fallback ~2 months back matches the V1 fetch window.
        const since = typeof req.query.since === 'string' ? req.query.since : '';
        let fromDay: string;
        if (DAY_RE.test(since)) {
            fromDay = since;
        } else {
            const d = new Date();
            d.setMonth(d.getMonth() - 1, 1);
            fromDay = d.toISOString().slice(0, 10);
        }
        res.status(200).json({ users: await getUsersWithSquats(fromDay) });
    } catch (error) {
        console.error('[api/get-users]', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
}
