import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { getUser } from './_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.group('🔵 [API] Record Squat');
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, date } = req.body as { userId: string; date: string };
    console.debug('🔵 [API] Recording squat:', { userId, date });

    try {
        const userData = await getUser(userId);
        if (!userData) {
            console.warn('🟡 [API] User not found:', userId);
            console.groupEnd();
            return res.status(404).json({ error: 'User not found' });
        }

        const [year, month, day] = date.split('-');
        const monthKey = `${year}-${month}`;

        const pipeline = kv.pipeline();
        pipeline.sadd(`squats:${monthKey}:${userId}`, parseInt(day));
        pipeline.set(`user:${userId}`, { ...userData, lastActive: new Date() });
        pipeline.sadd('activeUsers', userId);
        await pipeline.exec();

        console.debug('🔵 [API] Recorded squat for:', { userId, monthKey, day });
        console.groupEnd();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('🔴 [API] Error recording squat:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to record squat' });
    }
}
