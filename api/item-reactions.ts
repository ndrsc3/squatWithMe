import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth.js';
import { APPROVE_EMOJI } from './_lib/domain.js';
import { allowMethods } from './_lib/http.js';
import { isMemberOfItem, toggleApproval } from './_lib/lists-repo.js';

/** Toggle the caller's 🐙 approval on an item. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'POST')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        const { itemId } = (req.body ?? {}) as { itemId?: string };
        if (!itemId) return res.status(400).json({ error: 'itemId is required' });
        if (!(await isMemberOfItem(itemId, session.userId))) {
            return res.status(403).json({ error: 'Not a member of this list' });
        }
        const approved = await toggleApproval(itemId, session.userId, APPROVE_EMOJI);
        res.status(200).json({ approved });
    } catch (error) {
        console.error('[api/item-reactions]', error);
        res.status(500).json({ error: 'Approval failed' });
    }
}
