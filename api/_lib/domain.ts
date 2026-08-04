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

export type MemberRole = 'owner' | 'member';

export interface ListMember {
    listId: string;
    userId: string;
    role: MemberRole;
    addedAt: string;
}

export interface Item {
    id: string;
    listId: string;
    title: string;
    category: string | null;
    url: string | null;
    note: string | null;
    createdBy: string | null;
    createdAt: string;
}

export interface Reaction {
    itemId: string;
    userId: string;
    emoji: string;
    createdAt: string;
}

export interface Comment {
    id: string;
    itemId: string;
    userId: string | null;
    body: string;
    createdAt: string;
}

/** Composite read shape for the list view: an item with its reactions + comments. */
export interface ItemWithMeta extends Item {
    reactions: Array<{ emoji: string; userId: string }>;
    comments: Comment[];
}
