import { sql } from './db';
import type { User } from './domain';

/** User row including the password hash — for login verification only; never returned to clients. */
export interface UserWithSecret extends User {
    passwordHash: string;
}

export async function createUser(input: {
    username: string;
    passwordHash: string;
    email?: string | null;
    displayName?: string | null;
}): Promise<User> {
    const { rows } = await sql<User>`
        INSERT INTO users (username, password_hash, email, display_name)
        VALUES (${input.username}, ${input.passwordHash}, ${input.email ?? null}, ${input.displayName ?? null})
        RETURNING id, username, email, display_name AS "displayName", created_at AS "createdAt"`;
    const user = rows[0];
    if (!user) throw new Error('createUser: insert returned no row');
    return user;
}

export async function findUserByUsername(username: string): Promise<UserWithSecret | null> {
    const { rows } = await sql<UserWithSecret>`
        SELECT id, username, email, display_name AS "displayName", created_at AS "createdAt",
               password_hash AS "passwordHash"
        FROM users WHERE username = ${username} LIMIT 1`;
    return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
    const { rows } = await sql<User>`
        SELECT id, username, email, display_name AS "displayName", created_at AS "createdAt"
        FROM users WHERE id = ${id} LIMIT 1`;
    return rows[0] ?? null;
}
