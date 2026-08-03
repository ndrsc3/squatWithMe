import { kv } from '@vercel/kv';

export interface UserData {
    userId: string;
    username: string;
    lastActive: Date | string;
    joinDate: Date | string;
    recoveryHash: string;
    devices: Array<{
        deviceId: string;
        fingerprint: string;
        lastUsed: Date | string;
        trusted: boolean;
    }>;
}

export interface UserIndex {
    [usernameLower: string]: string;
}

export async function getUserIndex(): Promise<UserIndex> {
    return ((await kv.get<UserIndex>('userIndex')) as UserIndex) || {};
}

export async function saveUserIndex(index: UserIndex): Promise<void> {
    await kv.set('userIndex', index);
}

export async function getUser(userId: string): Promise<UserData | null> {
    return kv.get<UserData>(`user:${userId}`);
}

export async function saveUser(data: UserData): Promise<void> {
    await kv.set(`user:${data.userId}`, data);
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
    const index = await getUserIndex();
    return !index[username.toLowerCase()];
}

export async function getActiveUserIds(): Promise<string[]> {
    return (await kv.smembers('activeUsers')) || [];
}

export async function getUserSquats(userId: string, monthKey: string): Promise<number[]> {
    return (await kv.smembers<number[]>(`squats:${monthKey}:${userId}`)) || [];
}

export async function recordSquat(userId: string, monthKey: string, day: number): Promise<void> {
    await kv.sadd(`squats:${monthKey}:${userId}`, day);
}

export async function removeUser(userId: string): Promise<void> {
    await kv.del(`user:${userId}`);
    await kv.srem('activeUsers', userId);
}
