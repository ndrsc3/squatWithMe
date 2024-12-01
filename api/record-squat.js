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
        // Get user data
        console.debug('🔵 [API] Fetching user data for:', userId);
        const userData = await kv.get(`user:${userId}`);
        if (!userData) {
            console.warn('🟡 [API] User not found:', userId);
            console.groupEnd();
            return res.status(404).json({ error: 'User not found' });
        }
        console.debug('🔵 [API] Found user:', {
            username: userData.username,
            currentSquats: userData.squats.length
        });

        // Update user data
        const isDuplicate = userData.squats.includes(date);
        if (isDuplicate) {
            console.debug('🔵 [API] Squat already recorded for date:', date);
        } else {
            console.debug('🔵 [API] Adding new squat for date:', date);
            userData.squats.push(date);
        }
        userData.lastActive = new Date().toISOString();
        console.debug('🔵 [API] Updated user data:', {
            squatsCount: userData.squats.length,
            lastActive: userData.lastActive
        });

        // Save updated user data
        console.debug('🔵 [API] Saving updated user data');
        await kv.set(`user:${userId}`, userData);

        // Get all users for stats
        /*
        console.debug('🔵 [API] Fetching user index for stats calculation');
        const userIndex = await kv.get('userIndex') || {};
        const userIds = Object.values(userIndex);
        console.debug('🔵 [API] Fetching data for', userIds.length, 'users');
        
        const users = await Promise.all(
            userIds.map(id => kv.get(`user:${id}`))
        );
        console.debug('🔵 [API] Retrieved all user data');

        console.debug('🔵 [API] Calculating stats');
        const stats = await calculateStats(users);
        console.debug('🔵 [API] Stats calculated:', stats);
        */

        console.debug('🔵 [API] Squat recording completed successfully');
        console.groupEnd();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('🔴 [API] Error recording squat:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to record squat' });
    }
} 