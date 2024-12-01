import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    console.group('🔵 [API] Get Users');
    if (req.method !== 'GET') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get user index
        const userIndex = await kv.get('userIndex') || {};
        const userIds = Object.values(userIndex);
        
        // Get all users in parallel
        const userPromises = userIds.map(id => kv.get(`user:${id}`));
        const users = await Promise.all(userPromises);
        
        console.debug('🔵 [API] Retrieved users:', {
            count: users.length,
            users: users.map(u => ({ userId: u.userId, username: u.username }))
        });

        // Filter out inactive users (30 days)
        const activeUsers = users.filter(user => {
            const lastActive = new Date(user.lastActive).getTime();
            return Date.now() - lastActive <= 30 * 24 * 60 * 60 * 1000;
        });

        const stats = await calculateStats(activeUsers);
        
        console.groupEnd();
        res.status(200).json({ users: activeUsers, stats });
    } catch (error) {
        console.error('🔴 [API] Error fetching users:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}

async function calculateStats(users) {
    let longestStreak = 0;
    let streakHolder = '';
    
    for (const user of users) {
        const dates = user.squats.sort();
        let currentStreak = 0;
        let maxStreak = 0;
        
        // Calculate streaks
        for (let i = 0; i < dates.length; i++) {
            const currentDate = new Date(dates[i]);
            const nextDate = new Date(dates[i + 1]);
            
            if (i === 0 || isConsecutiveDay(new Date(dates[i - 1]), currentDate)) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
            
            maxStreak = Math.max(maxStreak, currentStreak);
        }
        
        if (maxStreak > longestStreak) {
            longestStreak = maxStreak;
            streakHolder = user.username;
        }
    }
    
    return { longestStreak, streakHolder };
}

function isConsecutiveDay(date1, date2) {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((date2 - date1) / oneDayMs));
    return diffDays === 1;
} 