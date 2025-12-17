/**
 * Auth module - user authentication and device identification
 */

import { storage } from './storage.js';
import { api, ApiError } from './api.js';
import { debug, warn, logError } from './utils.js';

/**
 * Generate a device fingerprint from browser characteristics
 * @returns {Promise<string>} SHA-256 hash of device characteristics
 */
export async function generateDeviceFingerprint() {
    const components = [
        navigator.userAgent,
        navigator.language,
        navigator.hardwareConcurrency,
        navigator.deviceMemory,
        screen.colorDepth,
        `${screen.width}x${screen.height}`,
        new Date().getTimezoneOffset(),
        navigator.platform,
        navigator.vendor,
    ].join('|');

    const encoder = new TextEncoder();
    const data = encoder.encode(components);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Initialize device identification
 * Creates new device ID if none exists
 * @returns {Promise<string>} Device ID
 */
export async function initializeDeviceId() {
    let deviceId = storage.getDeviceId();
    
    if (!deviceId) {
        const fingerprint = await generateDeviceFingerprint();
        deviceId = crypto.randomUUID();
        storage.setDeviceId(deviceId);
        storage.setDeviceFingerprint(fingerprint);
        debug('Auth', 'Created new device ID', deviceId);
    }
    
    return deviceId;
}

/**
 * Get current device credentials
 * @returns {Promise<{ deviceId: string, fingerprint: string }>}
 */
export async function getDeviceCredentials() {
    const deviceId = storage.getDeviceId() || await initializeDeviceId();
    let fingerprint = storage.getDeviceFingerprint();
    
    if (!fingerprint) {
        fingerprint = await generateDeviceFingerprint();
        storage.setDeviceFingerprint(fingerprint);
    }
    
    return { deviceId, fingerprint };
}

/**
 * Check if a username is available
 * @param {string} username
 * @returns {Promise<{ available: boolean, error?: string }>}
 */
export async function checkUsernameAvailable(username) {
    try {
        await api.checkUsername(username);
        return { available: true };
    } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
            return { 
                available: false, 
                error: 'Username already exists. If this is you, click "Recover it here" below.' 
            };
        }
        return { available: false, error: error.message };
    }
}

/**
 * Register a new user
 * @param {string} username
 * @param {string} recoveryAnswer
 * @returns {Promise<{ success: boolean, userId?: string, error?: string }>}
 */
export async function registerUser(username, recoveryAnswer) {
    debug('Auth', 'Registering new user', username);
    
    try {
        // Check username availability first
        const { available, error: checkError } = await checkUsernameAvailable(username);
        if (!available) {
            return { success: false, error: checkError };
        }

        // Get device credentials
        const { deviceId, fingerprint } = await getDeviceCredentials();
        
        // Generate user ID
        const userId = crypto.randomUUID();

        // Save user to backend
        await api.saveUser({
            userId,
            username,
            deviceId,
            deviceFingerprint: fingerprint,
            recoveryAnswer,
        });

        // Save locally
        storage.setUser({ userId, username });
        
        debug('Auth', 'User registered successfully', { userId, username });
        return { success: true, userId };
        
    } catch (error) {
        logError('Auth', 'Registration failed', error);
        return { success: false, error: error.message || 'Registration failed' };
    }
}

/**
 * Recover an existing account
 * @param {string} username
 * @param {string} [recoveryAnswer] - Required for new devices
 * @returns {Promise<{ success: boolean, userId?: string, username?: string, error?: string }>}
 */
export async function recoverAccount(username, recoveryAnswer) {
    debug('Auth', 'Attempting account recovery', username);
    
    try {
        const { deviceId, fingerprint } = await getDeviceCredentials();

        const result = await api.recoverAccount({
            username,
            recoveryAnswer,
            deviceId,
            deviceFingerprint: fingerprint,
        });

        // Save locally
        storage.setUser({ 
            userId: result.userId, 
            username: result.username 
        });

        debug('Auth', 'Account recovered successfully', result.username);
        return { 
            success: true, 
            userId: result.userId, 
            username: result.username 
        };
        
    } catch (error) {
        if (error instanceof ApiError) {
            if (error.status === 404) {
                return { success: false, error: 'Username not found' };
            }
            if (error.status === 401) {
                return { success: false, error: error.message, needsAnswer: true };
            }
        }
        logError('Auth', 'Recovery failed', error);
        return { success: false, error: error.message || 'Recovery failed' };
    }
}

/**
 * Load saved user from local storage
 * @returns {{ userId: string, username: string } | null}
 */
export function loadSavedUser() {
    const userData = storage.getUser();
    
    if (!userData) {
        debug('Auth', 'No saved user found');
        return null;
    }
    
    // Validate user data structure
    if (!userData.userId || !userData.username) {
        warn('Auth', 'Invalid user data structure, clearing', userData);
        storage.clearUser();
        return null;
    }
    
    debug('Auth', 'Loaded saved user', userData.username);
    return userData;
}

/**
 * Log out current user
 */
export function logout() {
    storage.clearUser();
    debug('Auth', 'User logged out');
}
