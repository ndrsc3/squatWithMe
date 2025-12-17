/**
 * XSS prevention utilities for safe rendering of user content
 */

/** HTML entities to escape */
const HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/** Regex to match HTML special characters */
const HTML_REGEX = /[&<>"']/g;

/**
 * Escape HTML special characters in a string
 * Use when inserting user content into HTML
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(HTML_REGEX, char => HTML_ENTITIES[char]);
}

/**
 * Escape a string for use in HTML attributes
 * More aggressive escaping for attribute contexts
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for attributes
 */
export function escapeAttr(str) {
    if (str == null) return '';
    // Escape HTML entities plus additional characters that could break out of attributes
    return String(str)
        .replace(HTML_REGEX, char => HTML_ENTITIES[char])
        .replace(/`/g, '&#96;')
        .replace(/\//g, '&#47;');
}

/**
 * Sanitize a URL to prevent javascript: and data: attacks
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or empty string if unsafe
 */
export function sanitizeUrl(url) {
    if (url == null) return '';
    
    const trimmed = String(url).trim().toLowerCase();
    
    // Block dangerous protocols
    if (trimmed.startsWith('javascript:') || 
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')) {
        return '';
    }
    
    // Allow relative URLs, http, https, mailto
    if (trimmed.startsWith('/') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('mailto:')) {
        return url;
    }
    
    // For anything else, assume it's a relative path
    if (!trimmed.includes(':')) {
        return url;
    }
    
    // Block unknown protocols
    return '';
}

/**
 * Create a safe HTML string from a template
 * Tagged template literal for automatic escaping
 * @example
 * html`<div>${userInput}</div>` // userInput is automatically escaped
 * @param {TemplateStringsArray} strings - Template strings
 * @param {...*} values - Values to interpolate
 * @returns {string} Safe HTML string
 */
export function html(strings, ...values) {
    return strings.reduce((result, str, i) => {
        const value = values[i - 1];
        const escaped = value != null ? escapeHtml(value) : '';
        return result + escaped + str;
    });
}
