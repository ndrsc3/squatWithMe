import { kv } from '@vercel/kv';
import { verifyRefreshToken, generateAccessToken } from '../../utils/jwt';

export default async function handler(req, res) {
    console.group('🔵 [API] Token Refresh');
    
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { refreshToken } = req.body;

    try {
        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        
        // Get user data
        const userData = await kv.get(`user:${decoded.userId}`);
        if (!userData) {
            console.warn('🟡 [API] User not found:', decoded.userId);
            console.groupEnd();
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if device is still trusted
        const device = userData.devices?.find(d => d.deviceId === decoded.deviceId);
        if (!device?.trusted) {
            console.warn('🟡 [API] Device no longer trusted:', decoded.deviceId);
            console.groupEnd();
            return res.status(401).json({ error: 'Device no longer trusted' });
        }

        // Generate new access token
        const accessToken = generateAccessToken({
            ...userData,
            deviceId: decoded.deviceId,
            deviceTrusted: true
        });

        // Update last active timestamp
        device.lastUsed = new Date();
        await kv.set(`user:${decoded.userId}`, userData);

        console.debug('🔵 [API] Token refreshed for user:', userData.username);
        console.groupEnd();
        res.status(200).json({ accessToken });
    } catch (error) {
        console.error('🔴 [API] Error refreshing token:', error);
        console.groupEnd();
        res.status(401).json({ error: 'Invalid refresh token' });
    }
} 