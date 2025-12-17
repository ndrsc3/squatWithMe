/**
 * Event delegation system for dynamic content
 * Allows single listeners to handle events on dynamically created elements
 */

/** @type {Map<string, Function[]>} Store of active delegated handlers */
const delegatedHandlers = new Map();

/**
 * Delegate an event to matching child elements
 * @param {Element|string} container - Container element or selector
 * @param {string} eventType - Event type (e.g., 'click', 'input')
 * @param {string} selector - CSS selector for target elements
 * @param {Function} handler - Handler function (event, matchedElement) => void
 * @returns {Function} Cleanup function to remove the listener
 */
export function delegate(container, eventType, selector, handler) {
    const containerEl = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
    
    if (!containerEl) {
        console.warn(`[Events] Container not found: ${container}`);
        return () => {};
    }
    
    const delegatedHandler = (event) => {
        const target = event.target.closest(selector);
        
        if (target && containerEl.contains(target)) {
            handler(event, target);
        }
    };
    
    containerEl.addEventListener(eventType, delegatedHandler);
    
    // Store for cleanup
    const key = `${eventType}:${selector}`;
    if (!delegatedHandlers.has(key)) {
        delegatedHandlers.set(key, []);
    }
    delegatedHandlers.get(key).push({ container: containerEl, handler: delegatedHandler });
    
    // Return cleanup function
    return () => {
        containerEl.removeEventListener(eventType, delegatedHandler);
    };
}

/**
 * Delegate multiple events at once
 * @param {Element|string} container - Container element or selector
 * @param {Object} eventMap - Map of { 'eventType:selector': handler }
 * @returns {Function} Cleanup function to remove all listeners
 */
export function delegateAll(container, eventMap) {
    const cleanups = [];
    
    for (const [key, handler] of Object.entries(eventMap)) {
        const [eventType, selector] = key.split(':');
        if (eventType && selector) {
            cleanups.push(delegate(container, eventType.trim(), selector.trim(), handler));
        }
    }
    
    return () => cleanups.forEach(cleanup => cleanup());
}

/**
 * One-time event delegation (removes after first match)
 * @param {Element|string} container - Container element or selector
 * @param {string} eventType - Event type
 * @param {string} selector - CSS selector
 * @param {Function} handler - Handler function
 * @returns {Function} Cleanup function
 */
export function delegateOnce(container, eventType, selector, handler) {
    let cleanup;
    
    const wrappedHandler = (event, target) => {
        handler(event, target);
        if (cleanup) cleanup();
    };
    
    cleanup = delegate(container, eventType, selector, wrappedHandler);
    return cleanup;
}

/**
 * Trigger a custom event on an element
 * @param {Element|string} element - Element or selector
 * @param {string} eventName - Custom event name
 * @param {*} detail - Event detail data
 */
export function trigger(element, eventName, detail = null) {
    const el = typeof element === 'string' 
        ? document.querySelector(element) 
        : element;
    
    if (!el) return;
    
    const event = new CustomEvent(eventName, { 
        bubbles: true, 
        cancelable: true,
        detail 
    });
    
    el.dispatchEvent(event);
}
