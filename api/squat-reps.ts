import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth.js';
import { allowMethods } from './_lib/http.js';
import { getReps, recordSquat, setReps } from './_lib/squats-repo.js';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_GOAL = 100;
const MAX_REPS = 10_000;

/** Live rep counter. GET ?day= → { count }; POST { day, count } → { count, recorded }. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'GET', 'POST')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        // The client supplies its local date, same contract as record-squat.
        if (req.method === 'GET') {
            const day = typeof req.query.day === 'string' ? req.query.day : '';
            if (!DAY_RE.test(day)) return res.status(400).json({ error: 'day must be YYYY-MM-DD' });
            return res.status(200).json({ count: await getReps(session.userId, day) });
        }

        const { day, count } = (req.body ?? {}) as { day?: string; count?: unknown };
        if (!day || !DAY_RE.test(day)) return res.status(400).json({ error: 'day must be YYYY-MM-DD' });
        if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > MAX_REPS) {
            return res.status(400).json({ error: `count must be an integer 0–${MAX_REPS}` });
        }
        await setReps(session.userId, day, count);
        const recorded = count >= DAILY_GOAL;
        if (recorded) await recordSquat(session.userId, day);
        res.status(200).json({ count, recorded });
    } catch (error) {
        console.error('[api/squat-reps]', error);
        res.status(500).json({ error: 'Failed to save reps' });
    }
}
