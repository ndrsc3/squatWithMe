import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    console.group('🔵 [API] Check Username');
    try {
        const { username } = req.body;
        
        // Check not empty
        if (!username) {
            console.warn('🟡 [API] Missing username in request');
            console.groupEnd();
            return res.status(400).json({ error: 'Username is required' });
        }

        // Check username in index
        const userIndex = await kv.get('userIndex') || {};
        console.debug('🔵 [API] Checking username against index:', {
            usernameToCheck: username,
            indexSize: Object.keys(userIndex).length
        });

        // Check if username exists (case insensitive)
        if (userIndex[username.toLowerCase()]) {
            console.warn('🟡 [API] Username exists:', username);
            console.groupEnd();
            return res.status(409).json({ error: 'Username already taken' });
        }

        console.debug('🔵 [API] Username available:', username);
        console.groupEnd();
        return res.status(200).json({ available: true });
    } catch (error) {
        console.error('🔴 [API] Error:', error);
        console.groupEnd();
        return res.status(500).json({ error: 'Internal server error' });
    }
} 