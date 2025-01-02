import { kv } from '@vercel/kv';
import { verifyUserToken } from './middleware/userAuth';

async function handler(req, res) {
    console.group('🔵 [API] Record Squat');
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { date } = req.body;
    const { userId } = req.user; // User data from JWT

    try {
        // Get user data to verify user exists and update last active
        console.debug('🔵 [API] Fetching user data for:', userId);
        const userData = await kv.get(`user:${userId}`);
        if (!userData) {
            console.warn('🟡 [API] User not found:', userId);
            console.groupEnd();
            return res.status(404).json({ error: 'User not found' });
        }

        // Parse date and create monthly key
        const squatDate = new Date(date);
        const monthKey = `${squatDate.getFullYear()}-${String(squatDate.getMonth() + 1).padStart(2, '0')}`;
        const dayOfMonth = String(squatDate.getDate()).padStart(2, '0');
        const monthlySquatsKey = `squats:${monthKey}:${userId}`;

        // Add squat to monthly set and update user's lastActive
        const pipeline = kv.pipeline();
        pipeline.sadd(monthlySquatsKey, dayOfMonth);
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

// Wrap the handler with user authentication middleware
export default verifyUserToken(handler); 