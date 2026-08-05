import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth.js';
import { allowMethods } from './_lib/http.js';
import { addComment, isMemberOfItem } from './_lib/lists-repo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'POST')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        const { itemId, body } = (req.body ?? {}) as { itemId?: string; body?: string };
        const text = body?.trim() ?? '';
        if (!itemId) return res.status(400).json({ error: 'itemId is required' });
        if (!text || text.length > 2000) {
            return res.status(400).json({ error: 'Comment is required (max 2000 chars)' });
        }
        if (!(await isMemberOfItem(itemId, session.userId))) {
            return res.status(403).json({ error: 'Not a member of this list' });
        }
        const comment = await addComment(itemId, session.userId, text);
        res.status(201).json({ comment });
    } catch (error) {
        console.error('[api/item-comments]', error);
        res.status(500).json({ error: 'Comment failed' });
    }
}
