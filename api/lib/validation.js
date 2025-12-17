/**
 * Validate username format
 * @param {string} username - The username to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return { valid: false, error: 'Username is required' };
    }

    const trimmed = username.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: 'Username must be at least 2 characters' };
    }

    if (trimmed.length > 20) {
        return { valid: false, error: 'Username must be 20 characters or less' };
    }

    // Allow alphanumeric, underscore, and hyphen
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(trimmed)) {
        return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }

    return { valid: true };
}
