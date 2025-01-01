import { kv } from '@vercel/kv';
import crypto from 'crypto';

function hashAnswer(answer) {
    // Normalize the answer (lowercase, trim whitespace)
    const normalizedAnswer = answer.toLowerCase().trim();
    return crypto.createHash('sha256').update(normalizedAnswer).digest('hex');
}

export default async function handler(req, res) {
    console.group('🔵 [API] Save User');
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, username, deviceId, deviceFingerprint, recoveryAnswer } = req.body;
    
    try {
        // Check if username exists in index
        const userIndex = await kv.get('userIndex') || {};
        if (userIndex[username.toLowerCase()]) {
            console.warn('🟡 [API] Username already exists:', username);
            console.groupEnd();
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash the recovery answer
        const hashedAnswer = hashAnswer(recoveryAnswer);

        // Create user metadata
        const userData = {
            userId,
            username,
            lastActive: new Date(),
            joinDate: new Date(),
            recoveryHash: hashedAnswer,
            devices: [{
                deviceId,
                fingerprint: deviceFingerprint,
                lastUsed: new Date(),
                trusted: true
            }]
        };

        // Get current active users
        const activeUsers = await kv.smembers('activeUsers') || [];

        // Save user data and update indexes atomically using pipeline
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