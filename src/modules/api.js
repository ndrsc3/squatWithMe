/**
 * API Client module - centralized API communication
 * Provides consistent error handling and request formatting
 */

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/**
 * Make an API request with consistent error handling
 * @param {string} endpoint - API endpoint (without /api/ prefix)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 * @throws {ApiError} On non-2xx responses
 */
async function request(endpoint, options = {}) {
    const url = `/api/${endpoint}`;
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    };

    try {
        const response = await fetch(url, config);
        
        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        if (!response.ok) {
            const error = isJson ? await response.json() : { error: response.statusText };
            throw new ApiError(response.status, error.error || 'Request failed');
        }

        return isJson ? response.json() : { success: true };
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        // Network or other errors
        throw new ApiError(0, error.message || 'Network error');
    }
}

/**
 * API client with methods for each endpoint
 */
export const api = {
    /**
     * Check if a username is available
     * @param {string} username
     * @returns {Promise<{ available: boolean }>}
     */
    checkUsername(username) {
        return request('check-username', {
            method: 'POST',
            body: JSON.stringify({ username }),
        });
    },

    /**
     * Save a new user
     * @param {Object} userData - User data to save
     * @returns {Promise<{ success: boolean }>}
     */
    saveUser(userData) {
        return request('save-user', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    /**
     * Recover an existing account
     * @param {Object} recoveryData - Recovery credentials
     * @returns {Promise<{ success: boolean, userId: string, username: string }>}
     */
    recoverAccount(recoveryData) {
        return request('recover-account', {
            method: 'POST',
            body: JSON.stringify(recoveryData),
        });
    },

    /**
     * Get all users and their squat data
     * @returns {Promise<{ users: Array }>}
     */
    getUsers() {
        return request('get-users', {
            method: 'GET',
        });
    },

    /**
     * Record a squat for the current user
     * @param {string} userId
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<{ success: boolean }>}
     */
    recordSquat(userId, date) {
        return request('record-squat', {
            method: 'POST',
            body: JSON.stringify({ userId, date }),
        });
    },
};
