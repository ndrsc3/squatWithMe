// Typed client for the V2 Postgres-backed API (auth + lists + squats).

export interface ApiUser {
    id: string;
    username: string;
    email: string | null;
    displayName: string | null;
    createdAt: string;
}

export interface ApiList {
    id: string;
    name: string;
    kind: 'travel' | 'squat' | 'generic';
    createdBy: string;
    createdAt: string;
    isMember: boolean;
}

export interface ApiComment {
    id: string;
    itemId: string;
    userId: string | null;
    username: string | null;
    body: string;
    createdAt: string;
}

export type ItemCategory = 'resort' | 'onsen' | 'food' | 'other';

export interface ApiItem {
    id: string;
    listId: string;
    title: string;
    category: string | null;
    region: string | null;
    url: string | null;
    imageUrl: string | null;
    note: string | null;
    createdBy: string | null;
    createdAt: string;
    approvals: Array<{ userId: string; username: string }>;
    comments: ApiComment[];
}

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
    }
}

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const res = await fetch(`/api/${path}`, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed: ${res.status}`);
    return data as T;
}

// ── auth ───────────────────────────────────────────────────────────
export const signup = (username: string, password: string, displayName?: string) =>
    api<{ user: ApiUser }>('auth-signup', 'POST', { username, password, displayName });

export const login = (username: string, password: string) =>
    api<{ user: ApiUser }>('auth-login', 'POST', { username, password });

export const logout = () => api<{ success: boolean }>('auth-logout', 'POST');

export const me = () => api<{ user: ApiUser }>('auth-me');

// ── squats ─────────────────────────────────────────────────────────
export interface SquatUser {
    userId: string;
    username: string;
    squats: Record<string, number[]>;
}

/** All users with squat days since `since` (YYYY-MM-DD, client-local window start). */
export const getSquatUsers = (since: string) =>
    api<{ users: SquatUser[] }>(`get-users?since=${encodeURIComponent(since)}`);

/** Record my squat for the given client-local date; identity comes from the session. */
export const recordSquat = (date: string) =>
    api<{ success: boolean }>('record-squat', 'POST', { date });

// ── lists ──────────────────────────────────────────────────────────
export const getLists = () => api<{ lists: ApiList[] }>('lists');

export const createList = (name: string, kind: ApiList['kind']) =>
    api<{ list: ApiList }>('lists', 'POST', { name, kind });

export const joinList = (listId: string) =>
    api<{ success: boolean }>('list-members', 'POST', { listId });

export const getItems = (listId: string) =>
    api<{ items: ApiItem[] }>(`list-items?listId=${encodeURIComponent(listId)}`);

export const addItem = (
    listId: string,
    input: { title: string; category?: ItemCategory; region?: string; url?: string; note?: string },
) => api<{ item: ApiItem }>('list-items', 'POST', { listId, ...input });

/** Toggle my 🐙 approval on an item; returns the new state. */
export const toggleApproval = (itemId: string) =>
    api<{ approved: boolean }>('item-reactions', 'POST', { itemId });

export const addComment = (itemId: string, body: string) =>
    api<{ comment: ApiComment }>('item-comments', 'POST', { itemId, body });
