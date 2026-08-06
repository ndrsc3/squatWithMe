import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth.js';
import { allowMethods } from './_lib/http.js';
import { findUserById } from './_lib/users-repo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'GET')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });
        const user = await findUserById(session.userId);
        if (!user) return res.status(401).json({ error: 'Account no longer exists' });
        res.status(200).json({ user });
    } catch (error) {
        console.error('[api/auth-me]', error);
        res.status(500).json({ error: 'Failed to load session' });
    }
}
