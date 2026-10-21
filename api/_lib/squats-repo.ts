import { sql } from './db.js';

/** A user's squat days grouped by month: { 'YYYY-MM': [day, …] } — the grid's shape. */
export interface SquatUser {
    userId: string;
    username: string;
    squats: Record<string, number[]>;
}

export async function recordSquat(userId: string, day: string): Promise<void> {
    await sql`
        INSERT INTO squats (user_id, day) VALUES (${userId}, ${day})
        ON CONFLICT DO NOTHING`;
}

/** All users with their squat days since `fromDay` (inclusive, YYYY-MM-DD). */
export async function getUsersWithSquats(fromDay: string): Promise<SquatUser[]> {
    const { rows } = await sql<{ userId: string; username: string; day: string | null }>`
        SELECT u.id AS "userId", u.username, to_char(s.day, 'YYYY-MM-DD') AS day
        FROM users u
        LEFT JOIN squats s ON s.user_id = u.id AND s.day >= ${fromDay}
        ORDER BY u.username, s.day`;

    const byUser = new Map<string, SquatUser>();
    for (const row of rows) {
        let user = byUser.get(row.userId);
        if (!user) {
            user = { userId: row.userId, username: row.username, squats: {} };
            byUser.set(row.userId, user);
        }
        if (row.day) {
            const monthKey = row.day.slice(0, 7);
            const dayInt = parseInt(row.day.slice(8), 10);
            (user.squats[monthKey] ??= []).push(dayInt);
        }
    }
    return [...byUser.values()];
}

/** Today's live rep count — 0 when the stored row belongs to an earlier day. */
export async function getReps(userId: string, day: string): Promise<number> {
    const { rows } = await sql<{ count: number }>`
        SELECT count FROM squat_reps WHERE user_id = ${userId} AND day = ${day}`;
    return rows[0]?.count ?? 0;
}

/** Overwrite the user's single counter row; a new day replaces yesterday's. */
export async function setReps(userId: string, day: string, count: number): Promise<void> {
    await sql`
        INSERT INTO squat_reps (user_id, day, count) VALUES (${userId}, ${day}, ${count})
        ON CONFLICT (user_id) DO UPDATE
        SET day = EXCLUDED.day, count = EXCLUDED.count, updated_at = now()`;
}
