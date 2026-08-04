import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import type { ItemCategory } from './_lib/domain';
import { allowMethods } from './_lib/http';
import { addItem, getListItems, isMember } from './_lib/lists-repo';
import { fetchOgImage } from './_lib/og';

const CATEGORIES: ItemCategory[] = ['resort', 'onsen', 'food', 'other'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'GET', 'POST')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        if (req.method === 'GET') {
            const listId = typeof req.query.listId === 'string' ? req.query.listId : '';
            if (!listId) return res.status(400).json({ error: 'listId is required' });
            if (!(await isMember(listId, session.userId))) {
                return res.status(403).json({ error: 'Not a member of this list' });
            }
            return res.status(200).json({ items: await getListItems(listId) });
        }

        const { listId, title, category, region, url, note } = (req.body ?? {}) as {
            listId?: string;
            title?: string;
            category?: string;
            region?: string;
            url?: string;
            note?: string;
        };
        const itemTitle = title?.trim() ?? '';
        if (!listId) return res.status(400).json({ error: 'listId is required' });
        if (!itemTitle || itemTitle.length > 200) {
            return res.status(400).json({ error: 'Title is required (max 200 chars)' });
        }
        if (!(await isMember(listId, session.userId))) {
            return res.status(403).json({ error: 'Not a member of this list' });
        }

        const itemCategory: ItemCategory = CATEGORIES.includes(category as ItemCategory)
            ? (category as ItemCategory)
            : 'other';
        const itemUrl = url?.trim() || null;
        const imageUrl = itemUrl ? await fetchOgImage(itemUrl) : null;

        const item = await addItem(
            listId,
            {
                title: itemTitle,
                category: itemCategory,
                region: region?.trim() || null,
                url: itemUrl,
                imageUrl,
                note: note?.trim() || null,
            },
            session.userId,
        );
        res.status(201).json({ item });
    } catch (error) {
        console.error('[api/list-items]', error);
        res.status(500).json({ error: 'Item operation failed' });
    }
}
