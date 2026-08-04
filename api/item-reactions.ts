import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import { allowMethods } from './_lib/http';
import { addReaction, isMemberOfItem, removeReaction } from './_lib/lists-repo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'POST', 'DELETE')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        const { itemId, emoji } = (req.body ?? {}) as { itemId?: string; emoji?: string };
        const trimmed = emoji?.trim() ?? '';
        if (!itemId) return res.status(400).json({ error: 'itemId is required' });
        // Freeform emoji — any short grapheme cluster; cap length, no spaces.
        if (!trimmed || trimmed.length > 16 || /\s/.test(trimmed)) {
            return res.status(400).json({ error: 'A single emoji is required' });
        }
        if (!(await isMemberOfItem(itemId, session.userId))) {
            return res.status(403).json({ error: 'Not a member of this list' });
        }

        if (req.method === 'POST') {
            await addReaction(itemId, session.userId, trimmed);
        } else {
            await removeReaction(itemId, session.userId, trimmed);
        }
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[api/item-reactions]', error);
        res.status(500).json({ error: 'Reaction operation failed' });
    }
}
