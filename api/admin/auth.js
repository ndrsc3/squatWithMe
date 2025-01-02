import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { generateAdminTokenPair } from '../../utils/adminJwt';

// Get admin secret from environment variable
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
    throw new Error('Missing ADMIN_SECRET environment variable');
}

function hashAdminSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
}

export default async function handler(req, res) {
    console.group('🔵 [API] Admin Authentication');
    
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, secret } = req.body;

    try {
        // Get admin data
        const adminData = await kv.get('admin:users') || {};
        const adminUser = adminData[username?.toLowerCase()];

        if (!adminUser) {
            console.warn('🟡 [API] Admin user not found:', username);
            console.groupEnd();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify secret
        const hashedSecret = hashAdminSecret(secret);
        if (hashedSecret !== adminUser.secretHash) {
            console.warn('🟡 [API] Invalid admin secret for:', username);
            console.groupEnd();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token pair
        const tokens = generateAdminTokenPair({
            username,
            permissions: adminUser.permissions || ['cleanup']
        });

        // Update last login
        adminUser.lastLogin = new Date();
        await kv.set('admin:users', adminData);

        console.debug('🔵 [API] Admin authenticated successfully:', username);
        console.groupEnd();
        res.status(200).json({ 
            ...tokens,
            permissions: adminUser.permissions || ['cleanup']
        });
    } catch (error) {
        console.error('🔴 [API] Error in admin authentication:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Authentication failed' });
    }
} 