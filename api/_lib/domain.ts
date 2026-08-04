// Domain types for the generalized List primitive (mirrors db/schema.sql).

export interface User {
    id: string;
    username: string;
    email: string | null;
    displayName: string | null;
    createdAt: string;
}

export type ListKind = 'travel' | 'squat' | 'generic';

export interface List {
    id: string;
    name: string;
    kind: ListKind;
    createdBy: string;
    createdAt: string;
}

/** List annotated with the requesting user's membership + role. */
export interface ListWithMembership extends List {
    isMember: boolean;
    role: MemberRole | null;
}

export type MemberRole = 'owner' | 'member';

export interface ListMember {
    listId: string;
    userId: string;
    role: MemberRole;
    addedAt: string;
}

export type ItemCategory = 'resort' | 'onsen' | 'food' | 'other';

export interface Item {
    id: string;
    listId: string;
    title: string;
    category: string | null;
    region: string | null;
    url: string | null;
    address: string | null;
    imageUrl: string | null;
    note: string | null;
    createdBy: string | null;
    createdAt: string;
}

/** Approvals are a single emoji (🐙) per user per item — see APPROVE_EMOJI. */
export const APPROVE_EMOJI = '🐙';

export interface Comment {
    id: string;
    itemId: string;
    userId: string | null;
    username: string | null;
    body: string;
    createdAt: string;
}

/** Composite read shape for the list view: an item with its approvals + comments. */
export interface ItemWithMeta extends Item {
    approvals: Array<{ userId: string; username: string }>;
    comments: Comment[];
}
