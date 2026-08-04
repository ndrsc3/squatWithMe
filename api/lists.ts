import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import type { ListKind } from './_lib/domain';
import { allowMethods } from './_lib/http';
import { createList, getListsForUser } from './_lib/lists-repo';

const KINDS: ListKind[] = ['travel', 'squat', 'generic'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'GET', 'POST')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        if (req.method === 'GET') {
            return res.status(200).json({ lists: await getListsForUser(session.userId) });
        }

        const { name, kind } = (req.body ?? {}) as { name?: string; kind?: string };
        const listName = name?.trim() ?? '';
        if (!listName || listName.length > 120) {
            return res.status(400).json({ error: 'List name is required (max 120 chars)' });
        }
        const listKind: ListKind = KINDS.includes(kind as ListKind) ? (kind as ListKind) : 'generic';
        const list = await createList(listName, listKind, session.userId);
        res.status(201).json({ list });
    } catch (error) {
        console.error('[api/lists]', error);
        res.status(500).json({ error: 'List operation failed' });
    }
}
