import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userKeys = await kv.keys('user:*:lastActive');
        const inactiveThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        const now = Date.now();
        const removedUsers = [];

        for (const key of userKeys) {
            const userId = key.split(':')[1];
            const lastActive = await kv.get(key);

            if (now - lastActive > inactiveThreshold) {
                // Remove user data
                await kv.del(`user:${userId}:lastActive`);
                await kv.del(`user:${userId}:username`);
                await kv.del(`user:${userId}:squats`);
                removedUsers.push(userId);

                // Notify connected clients about removed user
                global.wss?.clients?.forEach(client => {
                    client.send(JSON.stringify({
                        type: 'userRemoved',
                        userId
                    }));
                });
            }
        }

        res.status(200).json({ 
            message: 'Inactive users removed',
            removedCount: removedUsers.length,
            removedUsers 
        });
    } catch (error) {
        console.error('Error removing inactive users:', error);
        res.status(500).json({ error: 'Failed to remove inactive users' });
    }
} 