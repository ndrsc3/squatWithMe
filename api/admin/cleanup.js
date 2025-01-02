import { kv } from '@vercel/kv';
import { verifyAdminToken, requirePermission } from '../middleware/adminAuth';

async function handler(req, res) {
    console.group('🔵 [API] Admin Cleanup');
    
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, userId } = req.body;

    try {
        switch (action) {
            case 'removeInactiveUsers': {
                // Get all active users
                const activeUsers = await kv.smembers('activeUsers') || [];
                const inactiveUsers = [];

                // Check each user's last activity
                for (const userId of activeUsers) {
                    const userData = await kv.get(`user:${userId}`);
                    if (!userData) continue;

                    const lastActive = new Date(userData.lastActive);
                    const daysSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);

                    if (daysSinceActive > 30) {
                        inactiveUsers.push(userId);
                    }
                }

                // Remove inactive users
                if (inactiveUsers.length > 0) {
                    const pipeline = kv.pipeline();
                    for (const userId of inactiveUsers) {
                        pipeline.del(`user:${userId}`);
                        pipeline.srem('activeUsers', userId);
                    }
                    await pipeline.exec();
                }

                console.debug('🔵 [API] Removed inactive users:', inactiveUsers.length);
                console.groupEnd();
                return res.status(200).json({ 
                    success: true,
                    removedCount: inactiveUsers.length
                });
            }

            case 'removeUser': {
                if (!userId) {
                    console.warn('🟡 [API] No user ID provided for removal');
                    console.groupEnd();
                    return res.status(400).json({ error: 'User ID required' });
                }

                // Get user data to check if exists
                const userData = await kv.get(`user:${userId}`);
                if (!userData) {
                    console.warn('🟡 [API] User not found for removal:', userId);
                    console.groupEnd();
                    return res.status(404).json({ error: 'User not found' });
                }

                // Remove user data and from active users set
                const pipeline = kv.pipeline();
                pipeline.del(`user:${userId}`);
                pipeline.srem('activeUsers', userId);
                await pipeline.exec();

                console.debug('🔵 [API] Removed user:', userId);
                console.groupEnd();
                return res.status(200).json({ success: true });
            }

            default:
                console.warn('🟡 [API] Invalid cleanup action:', action);
                console.groupEnd();
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('🔴 [API] Error in cleanup:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Cleanup operation failed' });
    }
}

// Wrap the handler with admin authentication middleware and require cleanup permission
export default verifyAdminToken(requirePermission('cleanup')(handler)); 