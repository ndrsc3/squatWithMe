import * as kvClient from './kv-client';

export async function generateDeviceFingerprint(): Promise<string> {
    const components = [
        navigator.userAgent,
        navigator.language,
        navigator.hardwareConcurrency,
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.platform,
        navigator.vendor,
    ].join('|');

    const encoder = new TextEncoder();
    const data = encoder.encode(components);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function initializeDeviceId(): Promise<string> {
    let storedDeviceId = localStorage.getItem('deviceId');
    if (!storedDeviceId) {
        const fingerprint = await generateDeviceFingerprint();
        storedDeviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', storedDeviceId);
        localStorage.setItem('deviceFingerprint', fingerprint);
    }
    return storedDeviceId;
}

export async function setupUser(
    userId: string,
    username: string,
    deviceId: string | null,
    recoveryAnswer: string
): Promise<void> {
    const deviceFingerprint = await generateDeviceFingerprint();
    await kvClient.saveUser({ userId, username, deviceId, deviceFingerprint, recoveryAnswer });
    localStorage.setItem('squatUser', JSON.stringify({ userId, username }));
}

export async function recoverAccount(
    username: string,
    recoveryAnswer: string | undefined,
    deviceId: string | null
): Promise<{ userId: string; username: string }> {
    const deviceFingerprint = await generateDeviceFingerprint();
    const result = await kvClient.recoverAccount({
        username,
        recoveryAnswer,
        deviceId,
        deviceFingerprint,
    });
    localStorage.setItem('squatUser', JSON.stringify({ userId: result.userId, username: result.username }));
    return result;
}
