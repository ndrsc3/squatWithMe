import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    console.group('🔵 [API] Save User');
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, username } = req.body;
    
    try {
        // Check if username exists in index
        const userIndex = await kv.get('userIndex') || {};
        if (userIndex[username.toLowerCase()]) {
            console.warn('🟡 [API] Username already exists:', username);
            console.groupEnd();
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Create user data
        const userData = {
            userId,
            username,
            lastActive: new Date().toISOString(),
            squats: []
        };

        // Save user data and update index atomically using transaction
        const pipeline = kv.pipeline();
        pipeline.set(`user:${userId}`, userData);
        userIndex[username.toLowerCase()] = userId;
        pipeline.set('userIndex', userIndex);
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