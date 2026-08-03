import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getActiveUserIds, getUser, getUserSquats } from './_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.group('🔵 [API] Get Users');
    if (req.method !== 'GET') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const activeUserIds = await getActiveUserIds();

        const userPromises = activeUserIds.map((userId) => getUser(userId));
        const users = await Promise.all(userPromises);

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevDate = new Date(now.setMonth(now.getMonth() - 1));
        const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        const squatPromises = activeUserIds.flatMap((userId) => [
            getUserSquats(userId, currentMonth),
            getUserSquats(userId, previousMonth),
        ]);
        const squatResults = await Promise.all(squatPromises);

        const userData = users.map((user, index) => {
            const currentMonthSquats = squatResults[index * 2] || [];
            const previousMonthSquats = squatResults[index * 2 + 1] || [];
            return {
                ...user,
                squats: {
                    [currentMonth]: currentMonthSquats,
                    [previousMonth]: previousMonthSquats,
                },
            };
        });

        const activeUsers = userData.filter(Boolean);

        console.debug('🔵 [API] Retrieved users:', {
            count: activeUsers.length,
            months: [currentMonth, previousMonth],
        });

        console.groupEnd();
        res.status(200).json({ users: activeUsers });
    } catch (error) {
        console.error('🔴 [API] Error fetching users:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}
