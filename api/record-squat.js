import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    console.group('🔵 [API] Record Squat');
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, date } = req.body;
    console.debug('🔵 [API] Recording squat:', { userId, date });

    try {
        // Get user data to verify user exists
        console.debug('🔵 [API] Fetching user data for:', userId);
        const userData = await kv.get(`user:${userId}`);
        if (!userData) {
            console.warn('🟡 [API] User not found:', userId);
            console.groupEnd();
            return res.status(404).json({ error: 'User not found' });
        }

        // Parse date and create monthly key
        const [year, month, day] = date.split('-');
        const monthKey = `${year}-${month}`;
        const dayOfMonth = day;
        const monthlySquatsKey = `squats:${monthKey}:${userId}`;

        // Add squat to monthly set and update user's lastActive
        const pipeline = kv.pipeline();
        pipeline.sadd(monthlySquatsKey, parseInt(dayOfMonth));
        pipeline.set(`user:${userId}`, {
            ...userData,
            lastActive: new Date()
        });
        pipeline.sadd('activeUsers', userId);
        await pipeline.exec();

        console.debug('🔵 [API] Recorded squat for:', {
            userId,
            monthKey,
            dayOfMonth
        });
        
        console.groupEnd();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('🔴 [API] Error recording squat:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to record squat' });
    }
} 