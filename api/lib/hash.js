import crypto from 'crypto';

/**
 * Hash a recovery answer for secure storage/comparison
 * @param {string} answer - The recovery answer to hash
 * @returns {string} SHA-256 hash of the normalized answer
 */
export function hashAnswer(answer) {
    const normalized = answer.toLowerCase().trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
}
