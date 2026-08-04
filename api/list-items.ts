import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import type { ItemCategory } from './_lib/domain';
import { allowMethods } from './_lib/http';
import { buildGeoQuery, geocode } from './_lib/geo';
import {
    addItem,
    canManageItem,
    deleteItem,
    getListItems,
    isMember,
    isMemberOfItem,
    setItemNear,
} from './_lib/lists-repo';
import { fetchOgImage } from './_lib/og';

const CATEGORIES: ItemCategory[] = ['resort', 'onsen', 'food', 'other'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'GET', 'POST', 'PATCH', 'DELETE')) return;

    try {
        const session = await requireUser(req);
        if (!session) return res.status(401).json({ error: 'Not signed in' });

        if (req.method === 'PATCH') {
            // Manual near-override: attach/detach an item to a hub regardless of distance.
            const { itemId, nearItemId } = (req.body ?? {}) as {
                itemId?: string;
                nearItemId?: string | null;
            };
            if (!itemId) return res.status(400).json({ error: 'itemId is required' });
            if (!(await isMemberOfItem(itemId, session.userId))) {
                return res.status(403).json({ error: 'Not a member of this list' });
            }
            const ok = await setItemNear(itemId, nearItemId ?? null);
            if (!ok) return res.status(400).json({ error: 'Near target must be in the same list' });
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const { itemId } = (req.body ?? {}) as { itemId?: string };
            if (!itemId) return res.status(400).json({ error: 'itemId is required' });
            if (!(await canManageItem(itemId, session.userId))) {
                return res.status(403).json({ error: 'Only the item author or list owner can remove it' });
            }
            await deleteItem(itemId);
            return res.status(200).json({ success: true });
        }

        if (req.method === 'GET') {
            const listId = typeof req.query.listId === 'string' ? req.query.listId : '';
            if (!listId) return res.status(400).json({ error: 'listId is required' });
            if (!(await isMember(listId, session.userId))) {
                return res.status(403).json({ error: 'Not a member of this list' });
            }
            return res.status(200).json({ items: await getListItems(listId) });
        }

        const { listId, title, category, region, url, address, note } = (req.body ?? {}) as {
            listId?: string;
            title?: string;
            category?: string;
            region?: string;
            url?: string;
            address?: string;
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
        const itemRegion = region?.trim() || null;
        const itemAddress = address?.trim() || null;
        const [imageUrl, geo] = await Promise.all([
            itemUrl ? fetchOgImage(itemUrl) : Promise.resolve(null),
            geocode(buildGeoQuery({ address: itemAddress, title: itemTitle, region: itemRegion })),
        ]);

        const item = await addItem(
            listId,
            {
                title: itemTitle,
                category: itemCategory,
                region: itemRegion,
                url: itemUrl,
                address: itemAddress,
                imageUrl,
                note: note?.trim() || null,
                lat: geo?.lat ?? null,
                lng: geo?.lng ?? null,
            },
            session.userId,
        );
        res.status(201).json({ item });
    } catch (error) {
        console.error('[api/list-items]', error);
        res.status(500).json({ error: 'Item operation failed' });
    }
}
