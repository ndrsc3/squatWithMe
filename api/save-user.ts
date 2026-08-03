import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { kv } from '@vercel/kv';
import { getUserIndex } from './_lib/storage';
import type { UserData } from './_lib/storage';

function hashAnswer(answer: string): string {
    const normalizedAnswer = answer.toLowerCase().trim();
    return crypto.createHash('sha256').update(normalizedAnswer).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.group('🔵 [API] Save User');
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, username, deviceId, deviceFingerprint, recoveryAnswer } = req.body as {
        userId: string;
        username: string;
        deviceId: string;
        deviceFingerprint: string;
        recoveryAnswer: string;
    };

    try {
        const userIndex = await getUserIndex();
        if (userIndex[username.toLowerCase()]) {
            console.warn('🟡 [API] Username already exists:', username);
            console.groupEnd();
            return res.status(409).json({ error: 'Username already taken' });
        }

        const hashedAnswer = hashAnswer(recoveryAnswer);

        const userData: UserData = {
            userId,
            username,
            lastActive: new Date(),
            joinDate: new Date(),
            recoveryHash: hashedAnswer,
            devices: [
                {
                    deviceId,
                    fingerprint: deviceFingerprint,
                    lastUsed: new Date(),
                    trusted: true,
                },
            ],
        };

        const pipeline = kv.pipeline();
        pipeline.set(`user:${userId}`, userData);
        userIndex[username.toLowerCase()] = userId;
        pipeline.set('userIndex', userIndex);
        pipeline.sadd('activeUsers', userId);
        await pipeline.exec();

        console.debug('🔵 [API] Saved new user:', { userId, username });
        console.groupEnd();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('🔴 [API] Error saving user:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to save user' });
    }
}
