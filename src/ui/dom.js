/**
 * DOM utilities - query helpers and visibility management
 */

/**
 * Query single element
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Context element
 * @returns {Element|null}
 */
export const $ = (selector, context = document) => context.querySelector(selector);

/**
 * Query multiple elements
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Context element
 * @returns {NodeList}
 */
export const $$ = (selector, context = document) => context.querySelectorAll(selector);

/**
 * Get element by ID
 * @param {string} id - Element ID
 * @returns {Element|null}
 */
export const byId = (id) => document.getElementById(id);

/**
 * Show an element (remove 'hidden' class)
 * @param {Element|string} el - Element or selector
 */
export function show(el) {
    const element = typeof el === 'string' ? $(el) : el;
    element?.classList.remove('hidden');
}

/**
 * Hide an element (add 'hidden' class)
 * @param {Element|string} el - Element or selector
 */
export function hide(el) {
    const element = typeof el === 'string' ? $(el) : el;
    element?.classList.add('hidden');
}

/**
 * Toggle element visibility
 * @param {Element|string} el - Element or selector
 * @param {boolean} [visible] - Force visibility state
 */
export function toggle(el, visible) {
    const element = typeof el === 'string' ? $(el) : el;
    if (!element) return;
    
    if (visible !== undefined) {
        element.classList.toggle('hidden', !visible);
    } else {
        element.classList.toggle('hidden');
    }
}

/**
 * Set text content of an element
 * @param {Element|string} el - Element or selector
 * @param {string} text - Text to set
 */
export function setText(el, text) {
    const element = typeof el === 'string' ? $(el) : el;
    if (element) {
        element.textContent = text;
    }
}

/**
 * Set HTML content of an element
 * @param {Element|string} el - Element or selector
 * @param {string} html - HTML to set
 */
export function setHtml(el, html) {
    const element = typeof el === 'string' ? $(el) : el;
    if (element) {
        element.innerHTML = html;
    }
}

/**
 * Add class to element
 * @param {Element|string} el - Element or selector
 * @param {string} className - Class to add
 */
export function addClass(el, className) {
    const element = typeof el === 'string' ? $(el) : el;
    element?.classList.add(className);
}

/**
 * Remove class from element
 * @param {Element|string} el - Element or selector
 * @param {string} className - Class to remove
 */
export function removeClass(el, className) {
    const element = typeof el === 'string' ? $(el) : el;
    element?.classList.remove(className);
}

/**
 * Check if element has class
 * @param {Element|string} el - Element or selector
 * @param {string} className - Class to check
 * @returns {boolean}
 */
export function hasClass(el, className) {
    const element = typeof el === 'string' ? $(el) : el;
    return element?.classList.contains(className) ?? false;
}

/**
 * Set element attribute
 * @param {Element|string} el - Element or selector
 * @param {string} attr - Attribute name
 * @param {string} value - Attribute value
 */
export function setAttr(el, attr, value) {
    const element = typeof el === 'string' ? $(el) : el;
    element?.setAttribute(attr, value);
}

/**
 * Get input element value
 * @param {string} id - Input element ID
 * @returns {string} Trimmed value
 */
export function getInputValue(id) {
    const input = byId(id);
    return input?.value?.trim() ?? '';
}

/**
 * Clear input element value
 * @param {string} id - Input element ID
 */
export function clearInput(id) {
    const input = byId(id);
    if (input) {
        input.value = '';
    }
}

/**
 * Create and append element
 * @param {string} tag - Element tag name
 * @param {Object} [attrs={}] - Attributes to set
 * @param {string} [text] - Text content
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, text) {
    const el = document.createElement(tag);
    
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else {
            el.setAttribute(key, value);
        }
    });
    
    if (text) {
        el.textContent = text;
    }
    
    return el;
}

/**
 * Remove all children from an element
 * @param {Element|string} el - Element or selector
 */
export function clearChildren(el) {
    const element = typeof el === 'string' ? $(el) : el;
    if (element) {
        element.innerHTML = '';
    }
}
