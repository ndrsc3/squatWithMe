import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    console.group('🔵 [API] Get Users');
    if (req.method !== 'GET') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get user index
        const userIndex = await kv.get('userIndex') || {};
        const userIds = Object.values(userIndex);
        
        // Get all users in parallel
        const userPromises = userIds.map(id => kv.get(`user:${id}`));
        const users = await Promise.all(userPromises);
        
        console.debug('🔵 [API] Retrieved users:', {
            count: users.length,
            users: users.map(u => ({ userId: u.userId, username: u.username }))
        });

        // Filter out inactive users (30 days)
        const activeUsers = users.filter(user => {
            const lastActive = new Date(user.lastActive).getTime();
            return Date.now() - lastActive <= 30 * 24 * 60 * 60 * 1000;
        });
        
        console.groupEnd();
        res.status(200).json({ users: activeUsers });
    } catch (error) {
        console.error('🔴 [API] Error fetching users:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to fetch users' });
    }
} 