/**
 * Reusable UI component templates
 * Functions that return HTML strings for consistent UI patterns
 */

import { escapeHtml, escapeAttr } from './escape.js';

/**
 * Render a list of items using a template function
 * @param {Array} items - Array of items to render
 * @param {Function} templateFn - Function that returns HTML for each item
 * @returns {string} Combined HTML string
 */
export function renderList(items, templateFn) {
    if (!items?.length) return '';
    return items.map(templateFn).join('');
}

/**
 * User card component - displays user info
 * @param {Object} props
 * @param {string} props.username - Username to display
 * @param {number} [props.points] - User's points
 * @param {number} [props.streak] - Current streak
 * @param {boolean} [props.isCurrentUser] - Whether this is the logged-in user
 * @param {string} [props.userId] - User ID for data attributes
 * @returns {string} HTML string
 */
export function UserCard({ username, points, streak, isCurrentUser = false, userId }) {
    const currentClass = isCurrentUser ? 'current-user' : '';
    const userIdAttr = userId ? `data-user-id="${escapeAttr(userId)}"` : '';
    
    return `
        <div class="user-card ${currentClass}" ${userIdAttr}>
            <span class="user-card-name">${escapeHtml(username)}</span>
            ${points != null ? `<span class="user-card-points">${escapeHtml(points)} pts</span>` : ''}
            ${streak != null ? `<span class="user-card-streak">${streak > 0 ? `${streak}🔥` : '0'}</span>` : ''}
        </div>
    `;
}

/**
 * Notification item component
 * @param {Object} props
 * @param {string} props.id - Notification ID
 * @param {string} props.message - Notification message
 * @param {string|Date} props.time - Time of notification
 * @param {boolean} [props.isRead] - Whether notification has been read
 * @param {string} [props.type] - Notification type (info, success, warning)
 * @returns {string} HTML string
 */
export function NotificationItem({ id, message, time, isRead = false, type = 'info' }) {
    const readClass = isRead ? 'read' : 'unread';
    const timeStr = time instanceof Date ? time.toLocaleString() : time;
    
    return `
        <div class="notification-item ${readClass} notification-${type}" 
             data-notification-id="${escapeAttr(id)}"
             data-action="mark-read">
            <p class="notification-message">${escapeHtml(message)}</p>
            <time class="notification-time">${escapeHtml(timeStr)}</time>
        </div>
    `;
}

/**
 * Points badge component
 * @param {Object} props
 * @param {number} props.points - Total points
 * @param {number} [props.level] - User level (calculated from points if not provided)
 * @returns {string} HTML string
 */
export function PointsBadge({ points, level }) {
    const displayLevel = level ?? Math.floor(points / 100);
    
    return `
        <div class="points-badge">
            <span class="points-value">${escapeHtml(points)}</span>
            <span class="points-label">pts</span>
            ${displayLevel > 0 ? `<span class="points-level">Lvl ${displayLevel}</span>` : ''}
        </div>
    `;
}

/**
 * Empty state component for when there's no data
 * @param {Object} props
 * @param {string} [props.icon] - Emoji or icon to display
 * @param {string} props.title - Title text
 * @param {string} [props.message] - Description message
 * @param {string} [props.actionText] - Text for action button
 * @param {string} [props.actionId] - ID for action button
 * @returns {string} HTML string
 */
export function EmptyState({ icon = '📭', title, message, actionText, actionId }) {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3 class="empty-state-title">${escapeHtml(title)}</h3>
            ${message ? `<p class="empty-state-message">${escapeHtml(message)}</p>` : ''}
            ${actionText ? `
                <button class="empty-state-action" ${actionId ? `id="${escapeAttr(actionId)}"` : ''}>
                    ${escapeHtml(actionText)}
                </button>
            ` : ''}
        </div>
    `;
}

/**
 * Loading spinner component
 * @param {Object} [props]
 * @param {string} [props.size] - Size class (small, medium, large)
 * @param {string} [props.message] - Loading message
 * @returns {string} HTML string
 */
export function LoadingSpinner({ size = 'medium', message } = {}) {
    return `
        <div class="loading-spinner loading-${size}">
            <div class="spinner"></div>
            ${message ? `<p class="loading-message">${escapeHtml(message)}</p>` : ''}
        </div>
    `;
}

/**
 * Button component with variants
 * @param {Object} props
 * @param {string} props.text - Button text
 * @param {string} [props.variant] - Button variant (primary, secondary, danger)
 * @param {string} [props.id] - Button ID
 * @param {boolean} [props.disabled] - Whether button is disabled
 * @param {string} [props.type] - Button type (button, submit)
 * @param {Object} [props.data] - Data attributes
 * @returns {string} HTML string
 */
export function Button({ text, variant = 'primary', id, disabled = false, type = 'button', data = {} }) {
    const idAttr = id ? `id="${escapeAttr(id)}"` : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const dataAttrs = Object.entries(data)
        .map(([key, value]) => `data-${key}="${escapeAttr(value)}"`)
        .join(' ');
    
    return `
        <button class="btn btn-${variant}" ${idAttr} ${disabledAttr} type="${type}" ${dataAttrs}>
            ${escapeHtml(text)}
        </button>
    `;
}

/**
 * Card container component
 * @param {Object} props
 * @param {string} [props.title] - Card title
 * @param {string} props.content - Card content (HTML allowed - caller must escape)
 * @param {string} [props.footer] - Card footer (HTML allowed)
 * @param {string} [props.className] - Additional CSS classes
 * @returns {string} HTML string
 */
export function Card({ title, content, footer, className = '' }) {
    return `
        <div class="card ${className}">
            ${title ? `<div class="card-header"><h3>${escapeHtml(title)}</h3></div>` : ''}
            <div class="card-body">${content}</div>
            ${footer ? `<div class="card-footer">${footer}</div>` : ''}
        </div>
    `;
}

/**
 * Toast notification component
 * @param {Object} props
 * @param {string} props.message - Toast message
 * @param {string} [props.type] - Toast type (info, success, error, warning)
 * @returns {string} HTML string
 */
export function Toast({ message, type = 'info' }) {
    return `
        <div class="toast toast-${type}">
            ${escapeHtml(message)}
        </div>
    `;
}
