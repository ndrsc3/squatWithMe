import { kv } from '@vercel/kv';
import { verifyAdminRefreshToken, generateAdminAccessToken } from '../../utils/adminJwt';

export default async function handler(req, res) {
    console.group('🔵 [API] Admin Token Refresh');
    
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { refreshToken } = req.body;

    try {
        // Verify refresh token
        const decoded = verifyAdminRefreshToken(refreshToken);
        
        // Get admin data
        const adminData = await kv.get('admin:users') || {};
        const adminUser = adminData[decoded.username];

        if (!adminUser) {
            console.warn('🟡 [API] Admin user not found:', decoded.username);
            console.groupEnd();
            return res.status(404).json({ error: 'Admin user not found' });
        }

        // Generate new access token
        const accessToken = generateAdminAccessToken({
            username: decoded.username,
            permissions: adminUser.permissions || ['cleanup']
        });

        // Update last active timestamp
        adminUser.lastActive = new Date();
        await kv.set('admin:users', adminData);

        console.debug('🔵 [API] Admin token refreshed for:', decoded.username);
        console.groupEnd();
        res.status(200).json({ accessToken });
    } catch (error) {
        console.error('🔴 [API] Error refreshing admin token:', error);
        console.groupEnd();
        res.status(401).json({ error: 'Invalid refresh token' });
    }
} 