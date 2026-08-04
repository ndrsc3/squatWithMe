import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import { allowMethods } from './_lib/http';
import { recordSquat } from './_lib/squats-repo';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'POST')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        // Identity comes from the session; the client only supplies its local date.
        const { date } = (req.body ?? {}) as { date?: string };
        if (!date || !DAY_RE.test(date)) {
            return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
        }
        await recordSquat(session.userId, date);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[api/record-squat]', error);
        res.status(500).json({ error: 'Failed to record squat' });
    }
}
