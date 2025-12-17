/**
 * Storage module - centralized localStorage operations
 * Provides type-safe access to all persisted data
 */

const KEYS = {
    USER: 'squatUser',
    THEME: 'theme',
    DEVICE_ID: 'deviceId',
    DEVICE_FINGERPRINT: 'deviceFingerprint',
    SQUAT_DATA: 'squatData',
};

/**
 * Safely parse JSON from localStorage
 * @param {string} key - Storage key
 * @returns {*} Parsed value or null
 */
function getJSON(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error(`[Storage] Error parsing ${key}:`, error);
        return null;
    }
}

/**
 * Safely stringify and store JSON
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
function setJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`[Storage] Error storing ${key}:`, error);
    }
}

export const storage = {
    // User data
    getUser() {
        return getJSON(KEYS.USER);
    },
    
    setUser(data) {
        setJSON(KEYS.USER, data);
    },
    
    clearUser() {
        localStorage.removeItem(KEYS.USER);
    },

    // Theme preference
    getTheme() {
        return localStorage.getItem(KEYS.THEME) || 'dark';
    },
    
    setTheme(theme) {
        localStorage.setItem(KEYS.THEME, theme);
    },

    // Device identification
    getDeviceId() {
        return localStorage.getItem(KEYS.DEVICE_ID);
    },
    
    setDeviceId(id) {
        localStorage.setItem(KEYS.DEVICE_ID, id);
    },

    getDeviceFingerprint() {
        return localStorage.getItem(KEYS.DEVICE_FINGERPRINT);
    },
    
    setDeviceFingerprint(fingerprint) {
        localStorage.setItem(KEYS.DEVICE_FINGERPRINT, fingerprint);
    },

    // Cached squat data with timestamp
    getSquatData() {
        const cached = getJSON(KEYS.SQUAT_DATA);
        if (!cached) return null;
        
        // Return cached data if less than 5 minutes old
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
        return null;
    },
    
    setSquatData(data) {
        setJSON(KEYS.SQUAT_DATA, {
            data,
            timestamp: Date.now()
        });
    },

    // Clear all app data
    clearAll() {
        Object.values(KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
};
