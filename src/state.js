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
