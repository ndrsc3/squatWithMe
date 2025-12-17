/**
 * Utility functions - date helpers and common operations
 */

/**
 * Get formatted date information for today
 * @returns {Object} Date info with various formats
 */
export function getTodayInfo() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    
    return {
        date: now,
        today: `${yyyy}-${mm}-${dd}`,      // YYYY-MM-DD
        monthKey: `${yyyy}-${mm}`,          // YYYY-MM
        dayInt: parseInt(dd),               // Day as integer (1-31)
        year: yyyy,
        month: parseInt(mm),
        day: parseInt(dd),
    };
}

/**
 * Parse a date string and get its components
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object} Parsed date components
 */
export function parseDateStr(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return {
        year,
        month,
        day,
        monthKey: `${year}-${String(month).padStart(2, '0')}`,
        dayInt: day,
    };
}

/**
 * Get an array of the last N dates starting from today
 * @param {number} count - Number of days to get
 * @returns {string[]} Array of date strings in YYYY-MM-DD format
 */
export function getLastNDays(count) {
    const { today } = getTodayInfo();
    const dates = [];
    
    for (let i = 0; i < count; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
}

/**
 * Format a date for display
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Object} Formatted date parts
 */
export function formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    return {
        short: `${month}/${day}`,
        dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        full: dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        }),
    };
}

/**
 * Check if debugging is enabled (localhost only)
 * @returns {boolean}
 */
export function isDebugEnabled() {
    return window.location.hostname === 'localhost';
}

/**
 * Debug logger - only logs in development
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {*} data - Optional data to log
 */
export function debug(category, message, data) {
    if (isDebugEnabled()) {
        if (data !== undefined) {
            console.debug(`🔵 [${category}] ${message}`, data);
        } else {
            console.debug(`🔵 [${category}] ${message}`);
        }
    }
}

/**
 * Warning logger
 * @param {string} category - Log category
 * @param {string} message - Warning message
 * @param {*} data - Optional data to log
 */
export function warn(category, message, data) {
    if (data !== undefined) {
        console.warn(`🟡 [${category}] ${message}`, data);
    } else {
        console.warn(`🟡 [${category}] ${message}`);
    }
}

/**
 * Error logger
 * @param {string} category - Log category
 * @param {string} message - Error message
 * @param {*} error - Error object
 */
export function logError(category, message, error) {
    console.error(`🔴 [${category}] ${message}`, error);
}
