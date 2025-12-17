import { kv } from '@vercel/kv';
import { hashAnswer } from './lib/hash.js';

export default async function handler(req, res) {
    console.group('🔵 [API] Recover Account');
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, recoveryAnswer, deviceId, deviceFingerprint } = req.body;
    
    try {
        // Get userId from username
        const userIndex = await kv.get('userIndex') || {};
        const userId = userIndex[username.toLowerCase()];
        
        if (!userId) {
            console.warn('🟡 [API] Username not found:', username);
            console.groupEnd();
            return res.status(404).json({ error: 'Username not found' });
        }

        // Get user data
        const userData = await kv.get(`user:${userId}`);
        if (!userData) {
            console.warn('🟡 [API] User data not found for:', userId);
            console.groupEnd();
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if this is a known device
        const knownDevice = userData.devices?.find(device => 
            device.deviceId === deviceId || device.fingerprint === deviceFingerprint
        );

        let recoverySuccessful = false;

        if (knownDevice && knownDevice.trusted) {
            // Known and trusted device - allow recovery without answer
            recoverySuccessful = true;
            console.debug('🔵 [API] Device recognized, allowing recovery without answer');
        } else if (recoveryAnswer) {
            // Verify recovery answer
            const hashedInput = hashAnswer(recoveryAnswer);
            if (hashedInput === userData.recoveryHash) {
                recoverySuccessful = true;
                // Add this device to trusted devices
                userData.devices = userData.devices || [];
                userData.devices.push({
                    deviceId,
                    fingerprint: deviceFingerprint,
                    lastUsed: new Date(),
                    trusted: true
                });
                // Update user data with new device
                await kv.set(`user:${userId}`, userData);
            } else {
                console.warn('🟡 [API] Invalid recovery answer for user:', userId);
                console.groupEnd();
                return res.status(401).json({ error: 'Incorrect answer. Remember what liquid you wanted to shoot from your finger!' });
            }
        } else {
            console.warn('🟡 [API] Unknown device and no recovery answer provided');
            console.groupEnd();
            return res.status(401).json({ error: 'Please answer the recovery question' });
        }

        if (recoverySuccessful) {
            // Update last used timestamp for the device
            if (knownDevice) {
                knownDevice.lastUsed = new Date();
                await kv.set(`user:${userId}`, userData);
            }

            console.debug('🔵 [API] Account recovered successfully for:', userId);
            console.groupEnd();
            res.status(200).json({ 
                success: true,
                userId: userData.userId,
                username: userData.username,
                deviceTrusted: true
            });
        }
    } catch (error) {
        console.error('🔴 [API] Error recovering account:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to recover account' });
    }
} 