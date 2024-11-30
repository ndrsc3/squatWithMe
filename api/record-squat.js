import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, username, date } = req.body;

    try {
        await kv.sadd(`user:${userId}:squats`, date);
        await kv.set(`user:${userId}:lastActive`, Date.now());

        //const users = await getActiveUsers();
        //const stats = await calculateStats();

        if (global.wss) {
            const updateMessage = {
                type: 'update',
                users,
                stats
            };
            
            global.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(updateMessage));
                }
            });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error recording squat:', error);
        res.status(500).json({ error: 'Failed to record squat' });
    }
} 