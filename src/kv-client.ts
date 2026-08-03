import type { SquatData } from './types';

export async function checkUsername(username: string): Promise<{ available: boolean }> {
    const res = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    });
    if (res.status === 409) {
        throw Object.assign(new Error('Username already taken'), { status: 409 });
    }
    if (!res.ok) throw new Error(`Username check failed: ${res.status}`);
    return res.json() as Promise<{ available: boolean }>;
}

export async function saveUser(payload: {
    userId: string;
    username: string;
    deviceId: string | null;
    deviceFingerprint: string;
    recoveryAnswer: string;
}): Promise<{ success: boolean }> {
    const res = await fetch('/api/save-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Save user failed: ${res.status}`);
    return res.json() as Promise<{ success: boolean }>;
}

export async function recordSquat(userId: string, date: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/record-squat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date }),
    });
    if (!res.ok) throw new Error(`Record squat failed: ${res.status}`);
    return res.json() as Promise<{ success: boolean }>;
}

export async function getUsers(): Promise<SquatData> {
    const cachedData = localStorage.getItem('squatData');
    if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData) as { data: SquatData; timestamp: number };
        if (Date.now() - timestamp < 300000) {
            return data;
        }
    }

    const res = await fetch('/api/get-users');
    if (!res.ok) throw new Error(`Get users failed: ${res.status}`);
    const data = (await res.json()) as SquatData;
    localStorage.setItem('squatData', JSON.stringify({ data, timestamp: Date.now() }));
    return data;
}

export async function recoverAccount(payload: {
    username: string;
    recoveryAnswer?: string;
    deviceId: string | null;
    deviceFingerprint: string;
}): Promise<{ success: boolean; userId: string; username: string }> {
    const res = await fetch('/api/recover-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw Object.assign(new Error(error.error || 'Recovery failed'), { status: res.status });
    }
    return res.json() as Promise<{ success: boolean; userId: string; username: string }>;
}
