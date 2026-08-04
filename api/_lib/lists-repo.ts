import { sql } from './db';
import type { Comment, Item, ItemWithMeta, List, MemberRole } from './domain';

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

export async function getListsForUser(userId: string): Promise<List[]> {
    const { rows } = await sql<List>`
        SELECT l.id, l.name, l.kind, l.created_by AS "createdBy", l.created_at AS "createdAt"
        FROM lists l JOIN list_members m ON m.list_id = l.id
        WHERE m.user_id = ${userId}
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
    input: { title: string; category?: string | null; url?: string | null; note?: string | null },
    userId: string,
): Promise<Item> {
    const { rows } = await sql<Item>`
        INSERT INTO items (list_id, title, category, url, note, created_by)
        VALUES (${listId}, ${input.title}, ${input.category ?? null}, ${input.url ?? null},
                ${input.note ?? null}, ${userId})
        RETURNING id, list_id AS "listId", title, category, url, note,
                  created_by AS "createdBy", created_at AS "createdAt"`;
    const item = rows[0];
    if (!item) throw new Error('addItem: insert returned no row');
    return item;
}

/** Items in a list, each with its reactions + comments (stitched in JS — no array params). */
export async function getListItems(listId: string): Promise<ItemWithMeta[]> {
    const { rows: items } = await sql<Item>`
        SELECT id, list_id AS "listId", title, category, url, note,
               created_by AS "createdBy", created_at AS "createdAt"
        FROM items WHERE list_id = ${listId} ORDER BY created_at ASC`;
    if (items.length === 0) return [];

    const { rows: reactions } = await sql<{ itemId: string; emoji: string; userId: string }>`
        SELECT r.item_id AS "itemId", r.emoji, r.user_id AS "userId"
        FROM reactions r JOIN items i ON i.id = r.item_id
        WHERE i.list_id = ${listId}`;

    const { rows: comments } = await sql<Comment>`
        SELECT c.id, c.item_id AS "itemId", c.user_id AS "userId", c.body, c.created_at AS "createdAt"
        FROM comments c JOIN items i ON i.id = c.item_id
        WHERE i.list_id = ${listId} ORDER BY c.created_at ASC`;

    const byItem = new Map<string, ItemWithMeta>(
        items.map((i) => [i.id, { ...i, reactions: [], comments: [] }]),
    );
    for (const r of reactions) byItem.get(r.itemId)?.reactions.push({ emoji: r.emoji, userId: r.userId });
    for (const c of comments) byItem.get(c.itemId)?.comments.push(c);
    return items.map((i) => byItem.get(i.id) as ItemWithMeta);
}

// ── reactions (freeform emoji) ─────────────────────────────────────
export async function addReaction(itemId: string, userId: string, emoji: string): Promise<void> {
    await sql`
        INSERT INTO reactions (item_id, user_id, emoji)
        VALUES (${itemId}, ${userId}, ${emoji})
        ON CONFLICT DO NOTHING`;
}

export async function removeReaction(itemId: string, userId: string, emoji: string): Promise<void> {
    await sql`
        DELETE FROM reactions WHERE item_id = ${itemId} AND user_id = ${userId} AND emoji = ${emoji}`;
}

// ── comments ───────────────────────────────────────────────────────
export async function addComment(itemId: string, userId: string, body: string): Promise<Comment> {
    const { rows } = await sql<Comment>`
        INSERT INTO comments (item_id, user_id, body)
        VALUES (${itemId}, ${userId}, ${body})
        RETURNING id, item_id AS "itemId", user_id AS "userId", body, created_at AS "createdAt"`;
    const comment = rows[0];
    if (!comment) throw new Error('addComment: insert returned no row');
    return comment;
}
