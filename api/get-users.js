import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.debug('🔵 [User] Get Users');
        const users = await getActiveUsers();
        const stats = await calculateStats(users);
        res.status(200).json({ users, stats });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}

async function getActiveUsers() {
    console.debug('🔵 [User] Fetching active users');
    const userKeys = await kv.keys('user:*:username');
    const users = [];

    for (const key of userKeys) {
        const userId = key.split(':')[1];
        const lastActive = await kv.get(`user:${userId}:lastActive`);

        // Skip inactive users (30 days)
        if (Date.now() - lastActive > 30 * 24 * 60 * 60 * 1000) {
            continue;
        }

        const username = await kv.get(`user:${userId}:username`);
        const squats = await kv.smembers(`user:${userId}:squats`) || [];
        users.push({ userId, username, squats });
    }

    return users;
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