/**
 * Theme module - dark/light theme management
 */

import { storage } from '../modules/storage.js';
import { debug } from '../modules/utils.js';

/**
 * Initialize theme from stored preference
 * @returns {string} Current theme ('dark' or 'light')
 */
export function initTheme() {
    const savedTheme = storage.getTheme();
    applyTheme(savedTheme);
    debug('Theme', 'Initialized theme', savedTheme);
    return savedTheme;
}

/**
 * Apply a theme to the document
 * @param {string} theme - 'dark' or 'light'
 */
export function applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'light') {
        root.classList.add('light-theme');
    } else {
        root.classList.remove('light-theme');
    }
}

/**
 * Toggle between dark and light themes
 * @returns {string} New theme value
 */
export function toggleTheme() {
    const root = document.documentElement;
    const isLightTheme = root.classList.toggle('light-theme');
    const newTheme = isLightTheme ? 'light' : 'dark';
    
    storage.setTheme(newTheme);
    debug('Theme', 'Toggled theme', newTheme);
    
    return newTheme;
}

/**
 * Get current theme
 * @returns {string} Current theme ('dark' or 'light')
 */
export function getCurrentTheme() {
    return document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
}

/**
 * Set up theme toggle button event listener
 * @param {Function} [onToggle] - Optional callback after toggle
 */
export function setupThemeToggle(onToggle) {
    const toggleButton = document.getElementById('theme-toggle');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            const newTheme = toggleTheme();
            if (onToggle) {
                onToggle(newTheme);
            }
        });
    }
}
