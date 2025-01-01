import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    console.group('🔵 [API] Get Users');
    if (req.method !== 'GET') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get active users
        const activeUserIds = await kv.smembers('activeUsers') || [];
        
        // Get user metadata in parallel
        const userPromises = activeUserIds.map(userId => kv.get(`user:${userId}`));
        const users = await Promise.all(userPromises);
        
        // Calculate the required months (current and previous month)
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevDate = new Date(now.setMonth(now.getMonth() - 1));
        const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        // Fetch squats for each user for both months in parallel
        const squatPromises = activeUserIds.flatMap(userId => [
            kv.smembers(`squats:${currentMonth}:${userId}`),
            kv.smembers(`squats:${previousMonth}:${userId}`)
        ]);
        
        const squatResults = await Promise.all(squatPromises);

        // Combine user data with their squats
        const userData = users.map((user, index) => {
            const currentMonthSquats = squatResults[index * 2] || [];
            const previousMonthSquats = squatResults[index * 2 + 1] || [];
            
            return {
                ...user,
                squats: {
                    [currentMonth]: currentMonthSquats,
                    [previousMonth]: previousMonthSquats
                }
            };
        });

        // Filter out any null users (in case some were deleted)
        const activeUsers = userData.filter(Boolean);
        
        console.debug('🔵 [API] Retrieved users:', {
            count: activeUsers.length,
            months: [currentMonth, previousMonth]
        });
        
        console.groupEnd();
        res.status(200).json({ users: activeUsers });
    } catch (error) {
        console.error('🔴 [API] Error fetching users:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to fetch users' });
    }
} 