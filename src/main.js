/**
 * Main entry point - application initialization and event coordination
 */

import { createStore, initialState } from './state.js';
import { storage } from './modules/storage.js';
import { initializeDeviceId, loadSavedUser, registerUser, recoverAccount } from './modules/auth.js';
import { fetchUserData, recordSquat } from './modules/squats.js';
import { debug, logError } from './modules/utils.js';
import { render, renderError, clearError, showRecoveryQuestion, hideRecoveryQuestion } from './ui/render.js';
import { initTheme, setupThemeToggle, toggleTheme } from './ui/theme.js';
import { byId, getInputValue, addClass, removeClass } from './ui/dom.js';

// Create the application store
const store = createStore(initialState);

/**
 * Initialize the application
 */
async function init() {
    debug('App', 'Starting initialization');
    
    try {
        // Initialize theme
        const theme = initTheme();
        store.setState({ theme });
        
        // Initialize device ID
        const deviceId = await initializeDeviceId();
        store.setState({ deviceId });
        
        // Check for saved user
        const savedUser = loadSavedUser();
        
        if (savedUser) {
            store.setState({ 
                user: savedUser,
                view: 'main'
            });
            
            // Fetch user data
            await loadUserData();
        } else {
            store.setState({ view: 'setup' });
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Subscribe render to state changes
        store.subscribe(render);
        
        // Initial render
        render(store.getState());
        
        debug('App', 'Initialization complete');
        
    } catch (error) {
        logError('App', 'Initialization failed', error);
        store.setState({ error: 'Failed to initialize app. Please refresh.' });
        render(store.getState());
    }
}

/**
 * Load user data from API
 */
async function loadUserData() {
    const { user } = store.getState();
    if (!user?.userId) return;
    
    try {
        store.setState({ isLoading: true });
        
        const data = await fetchUserData(user.userId);
        
        store.setState({
            squatData: data,
            squatToday: data.squatToday,
            currentStreak: data.currentUser?.currentStreak || 0,
            isLoading: false
        });
        
    } catch (error) {
        logError('App', 'Failed to load user data', error);
        store.setState({ 
            isLoading: false,
            error: 'Failed to load data. Please try again.'
        });
    }
}

/**
 * Handle username save (registration)
 */
async function handleSaveUsername() {
    const username = getInputValue('username');
    
    if (!username) {
        renderError('Please enter a username', 'username-error');
        return;
    }
    
    clearError('username-error');
    
    // Show recovery question
    showRecoveryQuestion(async (recoveryAnswer) => {
        store.setState({ isLoading: true });
        
        const result = await registerUser(username, recoveryAnswer);
        
        if (result.success) {
            hideRecoveryQuestion();
            store.setState({
                user: { userId: result.userId, username },
                view: 'main',
                isLoading: false
            });
            
            // Load user data
            await loadUserData();
        } else {
            store.setState({ isLoading: false });
            renderError(result.error || 'Registration failed', 'recovery-question-error');
        }
    });
}

/**
 * Handle account recovery
 */
async function handleRecoverAccount() {
    const username = getInputValue('recovery-username');
    const recoveryAnswer = getInputValue('recovery-answer');
    
    if (!username) {
        renderError('Please enter your username', 'recovery-error');
        return;
    }
    
    clearError('recovery-error');
    store.setState({ isLoading: true });
    
    const result = await recoverAccount(username, recoveryAnswer || undefined);
    
    if (result.success) {
        store.setState({
            user: { userId: result.userId, username: result.username },
            view: 'main',
            isLoading: false
        });
        
        // Load user data
        await loadUserData();
    } else if (result.needsAnswer) {
        // Show the recovery answer input
        store.setState({ isLoading: false });
        const container = byId('recovery-code-container');
        if (container) {
            container.classList.remove('hidden');
        }
        renderError(result.error || 'Please answer the recovery question', 'recovery-error');
    } else {
        store.setState({ isLoading: false });
        renderError(result.error || 'Recovery failed', 'recovery-error');
    }
}

/**
 * Handle squat button click
 */
async function handleRecordSquat() {
    const { user, squatToday } = store.getState();
    
    if (!user?.userId || squatToday) {
        return;
    }
    
    const squatButton = byId('squat-button');
    addClass(squatButton, 'loading');
    store.setState({ isLoading: true });
    
    const result = await recordSquat(user.userId);
    
    removeClass(squatButton, 'loading');
    
    if (result.success) {
        store.setState({ 
            squatToday: true,
            isLoading: false
        });
        
        // Refresh data to update grid
        await loadUserData();
    } else {
        store.setState({ 
            isLoading: false,
            error: result.error || 'Failed to record squat'
        });
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Save username button
    const saveButton = byId('save-username');
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveUsername);
    }
    
    // Username input - Enter key
    const usernameInput = byId('username');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveUsername();
            }
        });
        
        // Clear error on input
        usernameInput.addEventListener('input', () => {
            clearError('username-error');
            usernameInput.classList.remove('error');
        });
    }
    
    // Show recovery link
    const showRecoveryLink = byId('show-recovery');
    if (showRecoveryLink) {
        showRecoveryLink.addEventListener('click', (e) => {
            e.preventDefault();
            store.setState({ view: 'recovery' });
            render(store.getState());
        });
    }
    
    // Show signup link (back from recovery)
    const showSignupLink = byId('show-signup');
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            store.setState({ view: 'setup' });
            render(store.getState());
        });
    }
    
    // Recover account button
    const recoverButton = byId('recover-account');
    if (recoverButton) {
        recoverButton.addEventListener('click', handleRecoverAccount);
    }
    
    // Recovery username input - Enter key
    const recoveryUsernameInput = byId('recovery-username');
    if (recoveryUsernameInput) {
        recoveryUsernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleRecoverAccount();
            }
        });
        
        // Clear error on input
        recoveryUsernameInput.addEventListener('input', () => {
            clearError('recovery-error');
        });
    }
    
    // Recovery answer input - Enter key
    const recoveryAnswerInput = byId('recovery-answer');
    if (recoveryAnswerInput) {
        recoveryAnswerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleRecoverAccount();
            }
        });
        
        // Clear error on input
        recoveryAnswerInput.addEventListener('input', () => {
            clearError('recovery-error');
        });
    }
    
    // Squat button
    const squatButton = byId('squat-button');
    if (squatButton) {
        squatButton.addEventListener('click', handleRecordSquat);
    }
    
    // Theme toggle
    setupThemeToggle((newTheme) => {
        store.setState({ theme: newTheme });
    });
}

// Start the application
init();
