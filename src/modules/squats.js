/**
 * Squats module - squat tracking, streaks, and data processing
 */

import { api } from './api.js';
import { storage } from './storage.js';
import { getTodayInfo } from './utils.js';
import { debug, logError } from './utils.js';

/**
 * Check if a user has squatted on a given date
 * @param {Object} squats - User's squat data { monthKey: [dayInts] }
 * @param {string} monthKey - Month key in YYYY-MM format
 * @param {number} dayInt - Day of month as integer
 * @returns {boolean}
 */
export function hasSquattedOnDate(squats, monthKey, dayInt) {
    // Null-safe access to fix the original bug
    return squats?.[monthKey]?.includes(dayInt) ?? false;
}

/**
 * Check if a user has squatted today
 * @param {Object} squats - User's squat data
 * @returns {boolean}
 */
export function hasSquattedToday(squats) {
    const { monthKey, dayInt } = getTodayInfo();
    return hasSquattedOnDate(squats, monthKey, dayInt);
}

/**
 * Calculate the current streak for a user
 * @param {Object} squats - User's squat data { monthKey: [dayInts] }
 * @returns {number} Current streak count
 */
export function calculateStreak(squats) {
    if (!squats) return 0;
    
    const { date: todaysDate } = getTodayInfo();
    let streak = 0;
    let checkDate = new Date(todaysDate);
    
    // If they haven't squatted today, start checking from yesterday
    if (!hasSquattedToday(squats)) {
        checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Count backwards from checkDate to find streak
    while (true) {
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;
        const dayInt = checkDate.getDate();
        
        // Check if squatted on this date (null-safe)
        if (!hasSquattedOnDate(squats, monthKey, dayInt)) {
            break;
        }
        
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return streak;
}

/**
 * Process raw user data from API into application format
 * @param {Object} data - Raw API response { users: [] }
 * @returns {Object} Processed data with users and stats
 */
export function processUserData(data, currentUserId) {
    const { dayInt, monthKey } = getTodayInfo();
    
    // Process users and calculate their streaks
    const processedUsers = (data.users || []).map(user => ({
        ...user,
        currentStreak: calculateStreak(user.squats || {}),
    }));

    // Calculate global stats
    const stats = {
        longestStreak: 0,
        streakHolder: '',
        userStreaks: {},
        activeToday: 0,
    };

    processedUsers.forEach(user => {
        // Store user's streak
        stats.userStreaks[user.userId] = user.currentStreak;
        
        // Count users who squatted today
        if (hasSquattedToday(user.squats)) {
            stats.activeToday++;
        }
        
        // Update longest streak if necessary
        if (user.currentStreak > stats.longestStreak) {
            stats.longestStreak = user.currentStreak;
            stats.streakHolder = user.username;
        }
    });

    // Find current user
    const currentUser = processedUsers.find(u => u.userId === currentUserId);
    const squatToday = currentUser ? hasSquattedToday(currentUser.squats) : false;

    return {
        users: processedUsers,
        stats,
        currentUser,
        squatToday,
    };
}

/**
 * Fetch and process user data from API
 * @param {string} currentUserId - Current user's ID
 * @returns {Promise<Object>} Processed user data
 */
export async function fetchUserData(currentUserId) {
    debug('Squats', 'Fetching user data');
    
    try {
        // Check cache first
        const cached = storage.getSquatData();
        let processedData = null;
        
        if (cached) {
            processedData = processUserData(cached, currentUserId);
            debug('Squats', 'Using cached data', { userCount: cached.users?.length });
        }
        
        // Fetch fresh data
        const freshData = await api.getUsers();
        
        // Process and cache
        processedData = processUserData(freshData, currentUserId);
        storage.setSquatData(freshData);
        
        debug('Squats', 'Fetched fresh data', { userCount: freshData.users?.length });
        return processedData;
        
    } catch (error) {
        logError('Squats', 'Failed to fetch data', error);
        throw error;
    }
}

/**
 * Record a squat for the current user
 * @param {string} userId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function recordSquat(userId) {
    const { today } = getTodayInfo();
    debug('Squats', 'Recording squat', { userId, date: today });
    
    try {
        await api.recordSquat(userId, today);
        debug('Squats', 'Squat recorded successfully');
        return { success: true };
    } catch (error) {
        logError('Squats', 'Failed to record squat', error);
        return { success: false, error: error.message || 'Failed to record squat' };
    }
}

/**
 * Sort users for display (current user first, then by streak)
 * @param {Array} users - Array of user objects
 * @param {string} currentUserId - Current user's ID
 * @returns {Array} Sorted users
 */
export function sortUsersForDisplay(users, currentUserId) {
    // Remove duplicates by userId
    const uniqueUsers = Array.from(
        new Map(users.map(user => [user.userId, user])).values()
    );
    
    return uniqueUsers.sort((a, b) => {
        // Always put current user first
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        
        // Then sort by streak (highest to lowest)
        if (a.currentStreak !== b.currentStreak) {
            return b.currentStreak - a.currentStreak;
        }
        
        // If streaks are equal, sort alphabetically
        return a.username.localeCompare(b.username);
    });
}
