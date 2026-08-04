import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import { allowMethods } from './_lib/http';
import { addMember, getListById } from './_lib/lists-repo';

// Open join: the whole site is login-gated and shared friends-only by link,
// so any signed-in user may join any list (v1 trust model).
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'POST')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        const { listId } = (req.body ?? {}) as { listId?: string };
        if (!listId) return res.status(400).json({ error: 'listId is required' });
        if (!(await getListById(listId))) {
            return res.status(404).json({ error: 'List not found' });
        }
        await addMember(listId, session.userId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[api/list-members]', error);
        res.status(500).json({ error: 'Join failed' });
    }
}
