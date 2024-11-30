import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // Basic request logging
    console.log('Request received:', {
        method: req.method,
        body: req.body,
        headers: req.headers
    });

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    // Method check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Basic response to test the endpoint
        return res.status(200).json({ 
            message: 'Endpoint working',
            receivedUsername: req.body?.username 
        });
    } catch (error) {
        console.error('Error in handler:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
} 