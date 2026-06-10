import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getUserIndex, getUser, saveUser } from './_lib/storage';

function hashAnswer(answer: string): string {
    const normalizedAnswer = answer.toLowerCase().trim();
    return crypto.createHash('sha256').update(normalizedAnswer).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.group('🔵 [API] Recover Account');
    if (req.method !== 'POST') {
        console.warn('🟡 [API] Invalid method:', req.method);
        console.groupEnd();
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, recoveryAnswer, deviceId, deviceFingerprint } = req.body as {
        username: string;
        recoveryAnswer?: string;
        deviceId: string;
        deviceFingerprint: string;
    };

    try {
        const userIndex = await getUserIndex();
        const userId = userIndex[username.toLowerCase()];

        if (!userId) {
            console.warn('🟡 [API] Username not found:', username);
            console.groupEnd();
            return res.status(404).json({ error: 'Username not found' });
        }

        const userData = await getUser(userId);
        if (!userData) {
            console.warn('🟡 [API] User data not found for:', userId);
            console.groupEnd();
            return res.status(404).json({ error: 'User not found' });
        }

        const knownDevice = userData.devices?.find(
            (device) => device.deviceId === deviceId || device.fingerprint === deviceFingerprint
        );

        let recoverySuccessful = false;

        if (knownDevice && knownDevice.trusted) {
            recoverySuccessful = true;
            console.debug('🔵 [API] Device recognized, allowing recovery without answer');
        } else if (recoveryAnswer) {
            const hashedInput = hashAnswer(recoveryAnswer);
            if (hashedInput === userData.recoveryHash) {
                recoverySuccessful = true;
                userData.devices = userData.devices || [];
                userData.devices.push({
                    deviceId,
                    fingerprint: deviceFingerprint,
                    lastUsed: new Date(),
                    trusted: true,
                });
                await saveUser(userData);
            } else {
                console.warn('🟡 [API] Invalid recovery answer for user:', userId);
                console.groupEnd();
                return res.status(401).json({
                    error: 'Incorrect answer. Remember what liquid you wanted to shoot from your finger!',
                });
            }
        } else {
            console.warn('🟡 [API] Unknown device and no recovery answer provided');
            console.groupEnd();
            return res.status(401).json({ error: 'Please answer the recovery question' });
        }

        if (recoverySuccessful) {
            if (knownDevice) {
                knownDevice.lastUsed = new Date();
                await saveUser(userData);
            }

            console.debug('🔵 [API] Account recovered successfully for:', userId);
            console.groupEnd();
            res.status(200).json({
                success: true,
                userId: userData.userId,
                username: userData.username,
                deviceTrusted: true,
            });
        }
    } catch (error) {
        console.error('🔴 [API] Error recovering account:', error);
        console.groupEnd();
        res.status(500).json({ error: 'Failed to recover account' });
    }
}
