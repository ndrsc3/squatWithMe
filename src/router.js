/**
 * Hash-based router for single-page navigation
 * Simple, no-dependency routing that works with the existing state system
 */

/** @type {Map<string, Function>} Route handlers */
const routes = new Map();

/** @type {Map<string, RegExp>} Compiled route patterns for param matching */
const patterns = new Map();

/**
 * Register a route handler
 * @param {string} path - Route path (e.g., '/', '/user/:id')
 * @param {Function} handler - Handler function called with params object
 */
export function route(path, handler) {
    routes.set(path, handler);
    
    // Compile pattern for routes with parameters
    if (path.includes(':')) {
        const pattern = path.replace(/:([^/]+)/g, '([^/]+)');
        patterns.set(path, new RegExp(`^${pattern}$`));
    }
}

/**
 * Navigate to a path programmatically
 * @param {string} path - Path to navigate to
 */
export function navigate(path) {
    window.location.hash = path;
}

/**
 * Get the current route path
 * @returns {string} Current path without hash
 */
export function getCurrentPath() {
    return window.location.hash.slice(1) || '/';
}

/**
 * Extract parameters from current route
 * @param {string} routePath - The route pattern (e.g., '/user/:id')
 * @returns {Object} Parameters object (e.g., { id: '123' })
 */
export function getRouteParams(routePath) {
    const currentPath = getCurrentPath();
    const pattern = patterns.get(routePath);
    
    if (!pattern) return {};
    
    const match = currentPath.match(pattern);
    if (!match) return {};
    
    // Extract param names from route
    const paramNames = routePath.match(/:([^/]+)/g)?.map(p => p.slice(1)) || [];
    const params = {};
    
    paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
    });
    
    return params;
}

/**
 * Find matching route and execute handler
 */
function handleRoute() {
    const path = getCurrentPath();
    
    // Try exact match first
    if (routes.has(path)) {
        routes.get(path)({});
        return;
    }
    
    // Try pattern matching for parameterized routes
    for (const [routePath, pattern] of patterns.entries()) {
        if (pattern.test(path)) {
            const params = getRouteParams(routePath);
            routes.get(routePath)(params);
            return;
        }
    }
    
    // Fallback to 404 or root
    const fallback = routes.get('/404') || routes.get('/');
    if (fallback) {
        fallback({});
    }
}

/**
 * Initialize the router
 * Call this after registering all routes
 */
export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    
    // Handle initial route on page load
    handleRoute();
}

/**
 * Clean up router listeners
 */
export function destroyRouter() {
    window.removeEventListener('hashchange', handleRoute);
}
