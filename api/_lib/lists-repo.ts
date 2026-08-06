import { sql } from './db.js';
import type { Comment, Item, ItemWithMeta, List, ListWithMembership, MemberRole } from './domain.js';

// ── lists ──────────────────────────────────────────────────────────
export async function createList(name: string, kind: string, ownerId: string): Promise<List> {
    const { rows } = await sql<List>`
        INSERT INTO lists (name, kind, created_by)
        VALUES (${name}, ${kind}, ${ownerId})
        RETURNING id, name, kind, created_by AS "createdBy", created_at AS "createdAt"`;
    const list = rows[0];
    if (!list) throw new Error('createList: insert returned no row');
    await addMember(list.id, ownerId, 'owner');
    return list;
}

/** Every list, flagged with the user's membership (site-wide friends-trust browse). */
export async function getAllListsWithMembership(userId: string): Promise<ListWithMembership[]> {
    const { rows } = await sql<ListWithMembership>`
        SELECT l.id, l.name, l.kind, l.created_by AS "createdBy", l.created_at AS "createdAt",
               (m.user_id IS NOT NULL) AS "isMember", m.role
        FROM lists l LEFT JOIN list_members m ON m.list_id = l.id AND m.user_id = ${userId}
        ORDER BY l.created_at DESC`;
    return rows;
}

export async function getListById(listId: string): Promise<List | null> {
    const { rows } = await sql<List>`
        SELECT id, name, kind, created_by AS "createdBy", created_at AS "createdAt"
        FROM lists WHERE id = ${listId} LIMIT 1`;
    return rows[0] ?? null;
}

// ── membership ─────────────────────────────────────────────────────
export async function addMember(
    listId: string,
    userId: string,
    role: MemberRole = 'member',
): Promise<void> {
    await sql`
        INSERT INTO list_members (list_id, user_id, role)
        VALUES (${listId}, ${userId}, ${role})
        ON CONFLICT DO NOTHING`;
}

export async function isMember(listId: string, userId: string): Promise<boolean> {
    const { rows } = await sql`
        SELECT 1 FROM list_members WHERE list_id = ${listId} AND user_id = ${userId} LIMIT 1`;
    return rows.length > 0;
}

/** Membership check routed through an item (for reaction/comment endpoints). */
export async function isMemberOfItem(itemId: string, userId: string): Promise<boolean> {
    const { rows } = await sql`
        SELECT 1 FROM items i JOIN list_members m ON m.list_id = i.list_id
        WHERE i.id = ${itemId} AND m.user_id = ${userId} LIMIT 1`;
    return rows.length > 0;
}

// ── items ──────────────────────────────────────────────────────────
export async function addItem(
    listId: string,
    input: {
        title: string;
        category?: string | null;
        region?: string | null;
        url?: string | null;
        address?: string | null;
        imageUrl?: string | null;
        note?: string | null;
        lat?: number | null;
        lng?: number | null;
    },
    userId: string,
): Promise<Item> {
    const { rows } = await sql<Item>`
        INSERT INTO items (list_id, title, category, region, url, address, image_url, note, lat, lng, created_by)
        VALUES (${listId}, ${input.title}, ${input.category ?? null}, ${input.region ?? null},
                ${input.url ?? null}, ${input.address ?? null}, ${input.imageUrl ?? null},
                ${input.note ?? null}, ${input.lat ?? null}, ${input.lng ?? null}, ${userId})
        RETURNING id, list_id AS "listId", title, category, region, url, address,
                  image_url AS "imageUrl", note, lat, lng, near_item_id AS "nearItemId",
                  created_by AS "createdBy", created_at AS "createdAt"`;
    const item = rows[0];
    if (!item) throw new Error('addItem: insert returned no row');
    return item;
}

/** Items in a list, each with its approvals + comments (stitched in JS — no array params). */
export async function getListItems(listId: string): Promise<ItemWithMeta[]> {
    const { rows: items } = await sql<Item>`
        SELECT id, list_id AS "listId", title, category, region, url, address,
               image_url AS "imageUrl", note, lat, lng, near_item_id AS "nearItemId",
               created_by AS "createdBy", created_at AS "createdAt"
        FROM items WHERE list_id = ${listId} ORDER BY created_at ASC`;
    if (items.length === 0) return [];

    const { rows: approvals } = await sql<{ itemId: string; userId: string; username: string }>`
        SELECT r.item_id AS "itemId", r.user_id AS "userId", u.username
        FROM reactions r
        JOIN items i ON i.id = r.item_id
        JOIN users u ON u.id = r.user_id
        WHERE i.list_id = ${listId}`;

    const { rows: comments } = await sql<Comment>`
        SELECT c.id, c.item_id AS "itemId", c.user_id AS "userId", u.username, c.body,
               c.created_at AS "createdAt"
        FROM comments c
        JOIN items i ON i.id = c.item_id
        LEFT JOIN users u ON u.id = c.user_id
        WHERE i.list_id = ${listId} ORDER BY c.created_at ASC`;

    const byItem = new Map<string, ItemWithMeta>(
        items.map((i) => [i.id, { ...i, approvals: [], comments: [] }]),
    );
    for (const a of approvals) byItem.get(a.itemId)?.approvals.push({ userId: a.userId, username: a.username });
    for (const c of comments) byItem.get(c.itemId)?.comments.push(c);
    return items.map((i) => byItem.get(i.id) as ItemWithMeta);
}

// ── approvals (single 🐙 per user per item) ────────────────────────
/** Toggle the user's approval; returns the new state (true = now approved). */
export async function toggleApproval(itemId: string, userId: string, emoji: string): Promise<boolean> {
    const { rows } = await sql`
        DELETE FROM reactions WHERE item_id = ${itemId} AND user_id = ${userId} AND emoji = ${emoji}
        RETURNING 1 AS removed`;
    if (rows.length > 0) return false;
    await sql`
        INSERT INTO reactions (item_id, user_id, emoji)
        VALUES (${itemId}, ${userId}, ${emoji})
        ON CONFLICT DO NOTHING`;
    return true;
}

// ── item management ────────────────────────────────────────────────
/** May the user remove this item? Item creator, or an owner-role member of its list. */
export async function canManageItem(itemId: string, userId: string): Promise<boolean> {
    const { rows } = await sql`
        SELECT 1 FROM items i
        LEFT JOIN list_members m
               ON m.list_id = i.list_id AND m.user_id = ${userId} AND m.role = 'owner'
        WHERE i.id = ${itemId} AND (i.created_by = ${userId} OR m.user_id IS NOT NULL)
        LIMIT 1`;
    return rows.length > 0;
}

export async function deleteItem(itemId: string): Promise<void> {
    await sql`DELETE FROM items WHERE id = ${itemId}`;
}

/** Set/clear the manual near-override. Same-list constraint enforced when setting. */
export async function setItemNear(itemId: string, nearItemId: string | null): Promise<boolean> {
    if (nearItemId === null) {
        await sql`UPDATE items SET near_item_id = NULL WHERE id = ${itemId}`;
        return true;
    }
    const { rows } = await sql`
        UPDATE items SET near_item_id = ${nearItemId}
        WHERE id = ${itemId}
          AND list_id = (SELECT list_id FROM items WHERE id = ${nearItemId})
          AND id <> ${nearItemId}
        RETURNING id`;
    return rows.length > 0;
}

// ── comments ───────────────────────────────────────────────────────
export async function addComment(itemId: string, userId: string, body: string): Promise<Comment> {
    const { rows } = await sql<Comment>`
        INSERT INTO comments (item_id, user_id, body)
        VALUES (${itemId}, ${userId}, ${body})
        RETURNING id, item_id AS "itemId", user_id AS "userId",
                  (SELECT username FROM users WHERE id = ${userId}) AS username,
                  body, created_at AS "createdAt"`;
    const comment = rows[0];
    if (!comment) throw new Error('addComment: insert returned no row');
    return comment;
}
