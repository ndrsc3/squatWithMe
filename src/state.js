/**
 * Simple pub/sub state container
 * Provides reactive state management without external dependencies
 */

/**
 * Create a new store with the given initial state
 * @param {Object} initialState - The initial state object
 * @returns {Object} Store with getState, setState, and subscribe methods
 */
export function createStore(initialState) {
    let state = { ...initialState };
    const listeners = new Set();

    return {
        /**
         * Get the current state
         * @returns {Object} Current state
         */
        getState() {
            return state;
        },

        /**
         * Update state with partial updates
         * Notifies all subscribers after update
         * @param {Object} partial - Partial state to merge
         */
        setState(partial) {
            state = { ...state, ...partial };
            listeners.forEach(fn => fn(state));
        },

        /**
         * Subscribe to state changes
         * @param {Function} fn - Callback function called with new state
         * @returns {Function} Unsubscribe function
         */
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        }
    };
}

/**
 * Create a derived value that automatically updates when store changes
 * @param {Object} store - Store created by createStore
 * @param {Function} computeFn - Function that computes derived value from state
 * @returns {Object} Object with get() method to retrieve current value
 */
export function derived(store, computeFn) {
    let value = computeFn(store.getState());
    
    store.subscribe(state => {
        value = computeFn(state);
    });
    
    return {
        /**
         * Get the current derived value
         * @returns {*} Current computed value
         */
        get() {
            return value;
        }
    };
}

/**
 * Create multiple derived values at once
 * @param {Object} store - Store created by createStore
 * @param {Object} computeMap - Map of { name: computeFn }
 * @returns {Object} Object with get(name) method
 */
export function derivedMany(store, computeMap) {
    const derivedValues = {};
    
    for (const [name, computeFn] of Object.entries(computeMap)) {
        derivedValues[name] = derived(store, computeFn);
    }
    
    return {
        /**
         * Get a derived value by name
         * @param {string} name - Name of the derived value
         * @returns {*} Current computed value
         */
        get(name) {
            return derivedValues[name]?.get();
        },
        
        /**
         * Get all derived values as an object
         * @returns {Object} All derived values
         */
        getAll() {
            const result = {};
            for (const [name, d] of Object.entries(derivedValues)) {
                result[name] = d.get();
            }
            return result;
        }
    };
}

/**
 * Initial application state
 */
export const initialState = {
    // User info
    user: null,           // { userId, username }
    deviceId: null,
    
    // App data
    squatData: null,      // { users: [], stats: {} }
    squatToday: false,
    currentStreak: 0,
    
    // UI state
    theme: 'dark',
    isLoading: false,
    error: null,
    
    // View state
    view: 'setup',        // 'setup' | 'recovery' | 'main'
};
