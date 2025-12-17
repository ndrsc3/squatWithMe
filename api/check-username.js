import { kv } from '@vercel/kv';
import { validateUsername } from './lib/validation.js';

export default async function handler(req, res) {
    console.group('🔵 [API] Check Username');
    
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username } = req.body;
        
        // Validate username format
        const validation = validateUsername(username);
        if (!validation.valid) {
            console.warn('🟡 [API] Invalid username:', validation.error);
            console.groupEnd();
            return res.status(400).json({ error: validation.error });
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
