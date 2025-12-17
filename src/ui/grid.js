/**
 * Grid module - squat grid rendering
 */

import { byId, createElement, clearChildren } from './dom.js';
import { sortUsersForDisplay, hasSquattedOnDate } from '../modules/squats.js';
import { getLastNDays, formatDateForDisplay, getTodayInfo } from '../modules/utils.js';
import { debug } from '../modules/utils.js';

/** Number of days to display in the grid */
const DISPLAY_DAYS = 12;

/**
 * Render the squat grid
 * @param {Object} squatData - Processed squat data { users: [], stats: {} }
 * @param {string} currentUserId - Current user's ID
 */
export function renderGrid(squatData, currentUserId) {
    debug('Grid', 'Rendering grid', { userCount: squatData.users?.length });
    
    const grid = byId('squat-grid');
    if (!grid) return;
    
    // Clear existing content
    clearChildren(grid);
    
    // Get sorted users
    const sortedUsers = sortUsersForDisplay(squatData.users || [], currentUserId);
    
    // Get dates to display (most recent first)
    const dates = getLastNDays(DISPLAY_DAYS);
    const { today } = getTodayInfo();
    
    // Set up grid layout
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `minmax(100px, auto) minmax(80px, auto) repeat(${dates.length}, 1fr)`;
    grid.style.gridTemplateRows = `auto repeat(${sortedUsers.length}, auto)`;
    
    // Add headers
    addGridHeaders(grid, dates, sortedUsers.length, today);
    
    // Add user rows
    sortedUsers.forEach(user => {
        addUserRow(grid, user, dates, currentUserId, today);
    });
}

/**
 * Add grid header row
 * @param {Element} grid - Grid container
 * @param {string[]} dates - Array of date strings
 * @param {number} userCount - Number of users
 * @param {string} today - Today's date string
 */
function addGridHeaders(grid, dates, userCount, today) {
    // Users column header
    const cornerCell = createElement('div', { className: 'grid-cell corner-header' }, `Users (${userCount})`);
    grid.appendChild(cornerCell);
    
    // Streak column header
    const streakHeader = createElement('div', { className: 'grid-cell corner-header' }, 'Streak');
    grid.appendChild(streakHeader);
    
    // Date headers
    dates.forEach(date => {
        const cell = createElement('div', { className: 'grid-cell date-header' });
        const formatted = formatDateForDisplay(date);
        
        // Date text (MM/DD)
        cell.textContent = formatted.short;
        
        // Highlight today
        if (date === today) {
            cell.classList.add('today');
        }
        
        // Day of week below date
        const daySpan = createElement('span', { className: 'day-of-week' }, formatted.dayOfWeek);
        cell.appendChild(daySpan);
        
        grid.appendChild(cell);
    });
}

/**
 * Add a user row to the grid
 * @param {Element} grid - Grid container
 * @param {Object} user - User data
 * @param {string[]} dates - Array of date strings
 * @param {string} currentUserId - Current user's ID
 * @param {string} today - Today's date string
 */
function addUserRow(grid, user, dates, currentUserId, today) {
    // Username cell
    const nameCell = createElement('div', { className: 'grid-cell user-name' }, user.username);
    if (user.userId === currentUserId) {
        nameCell.classList.add('current-user');
    }
    grid.appendChild(nameCell);
    
    // Streak cell
    const streakCell = createElement('div', { className: 'grid-cell streak-cell' });
    if (user.currentStreak > 0) {
        streakCell.textContent = `${user.currentStreak}🔥`;
    } else {
        streakCell.textContent = '0';
    }
    grid.appendChild(streakCell);
    
    // Squat cells for each date
    dates.forEach(date => {
        const cell = createSquatCell(user.squats, date, today);
        grid.appendChild(cell);
    });
}

/**
 * Create a squat cell for a specific date
 * @param {Object} squats - User's squat data
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} today - Today's date string
 * @returns {Element} Grid cell element
 */
function createSquatCell(squats, date, today) {
    const cell = createElement('div', { className: 'grid-cell' });
    
    // Parse date to check squat data
    const [yyyy, mm, dd] = date.split('-');
    const monthKey = `${yyyy}-${mm}`;
    const dayInt = parseInt(dd);
    
    // Check if squatted on this date
    if (hasSquattedOnDate(squats, monthKey, dayInt)) {
        cell.classList.add('squatted');
        cell.innerHTML = '✓';
    }
    
    // Highlight today's column
    if (date === today) {
        cell.classList.add('today');
    }
    
    return cell;
}
