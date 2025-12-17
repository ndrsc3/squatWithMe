/**
 * Render module - central UI rendering based on state
 */

import { byId, show, hide, setText, setHtml, addClass, removeClass } from './dom.js';
import { renderGrid } from './grid.js';
import { debug } from '../modules/utils.js';
import { escapeHtml } from './escape.js';
import { EmptyState, LoadingSpinner } from './components.js';

/**
 * Main render function - updates entire UI based on state
 * Called whenever state changes
 * @param {Object} state - Current application state
 */
export function render(state) {
    debug('Render', 'Updating UI', { view: state.view, hasUser: !!state.user });
    
    // Render based on current view
    switch (state.view) {
        case 'setup':
            renderSetupView(state);
            break;
        case 'recovery':
            renderRecoveryView(state);
            break;
        case 'main':
            renderMainView(state);
            break;
        case 'guidelines':
            renderGuidelinesView(state);
            break;
        case 'points':
            renderPointsView(state);
            break;
        case 'profile':
            renderProfileView(state);
            break;
        case '404':
            render404View(state);
            break;
        default:
            renderSetupView(state);
    }
    
    // Always update loading state
    renderLoadingState(state.isLoading);
    
    // Show error if any
    if (state.error) {
        renderError(state.error);
    }
}

/**
 * Render the setup/welcome view
 * @param {Object} state
 */
function renderSetupView(state) {
    show(byId('user-setup'));
    hide(byId('main-app'));
    
    // Show setup form, hide recovery
    show(byId('user-setup-form'));
    hide(byId('account-recovery'));
    hide(byId('recovery-code-display'));
    
    // Clear any previous errors
    const errorEl = byId('username-error');
    if (errorEl) {
        hide(errorEl);
        setText(errorEl, '');
    }
}

/**
 * Render the account recovery view
 * @param {Object} state
 */
function renderRecoveryView(state) {
    show(byId('user-setup'));
    hide(byId('main-app'));
    
    // Show recovery form, hide setup
    hide(byId('user-setup-form'));
    show(byId('account-recovery'));
    hide(byId('recovery-code-display'));
    
    // Clear any previous errors
    const errorEl = byId('recovery-error');
    if (errorEl) {
        hide(errorEl);
        setText(errorEl, '');
    }
}

/**
 * Render the main application view
 * @param {Object} state
 */
function renderMainView(state) {
    hide(byId('user-setup'));
    show(byId('main-app'));
    
    // Update username display (using escapeHtml for safety)
    if (state.user?.username) {
        const usernameEl = byId('current-username');
        if (usernameEl) {
            usernameEl.textContent = state.user.username; // textContent is safe
        }
    }
    
    // Update stats
    renderStats(state);
    
    // Update squat button state
    renderSquatButton(state.squatToday);
    
    // Render the grid if we have data
    if (state.squatData) {
        renderGrid(state.squatData, state.user?.userId);
    }
}

/**
 * Render the guidelines view (v2 feature placeholder)
 * @param {Object} state
 */
function renderGuidelinesView(state) {
    hide(byId('user-setup'));
    show(byId('main-app'));
    
    // Update username display if logged in
    if (state.user?.username) {
        const usernameEl = byId('current-username');
        if (usernameEl) {
            usernameEl.textContent = state.user.username;
        }
    }
    
    // For now, show placeholder in the grid container
    const gridContainer = byId('grid-container');
    if (gridContainer) {
        setHtml(gridContainer, `
            <div class="view-content">
                <h2>How to Squat Properly</h2>
                ${EmptyState({
                    icon: '🏋️',
                    title: 'Guidelines Coming Soon',
                    message: 'Proper squat form and tips will be available here.',
                    actionText: 'Back to Main',
                    actionId: 'back-to-main'
                })}
            </div>
        `);
        
        // Add back button handler
        const backBtn = byId('back-to-main');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.hash = '/';
            });
        }
    }
}

/**
 * Render the points view (v2 feature placeholder)
 * @param {Object} state
 */
function renderPointsView(state) {
    hide(byId('user-setup'));
    show(byId('main-app'));
    
    // Update username display if logged in
    if (state.user?.username) {
        const usernameEl = byId('current-username');
        if (usernameEl) {
            usernameEl.textContent = state.user.username;
        }
    }
    
    // For now, show placeholder in the grid container
    const gridContainer = byId('grid-container');
    if (gridContainer) {
        setHtml(gridContainer, `
            <div class="view-content">
                <h2>Points & Leaderboard</h2>
                ${EmptyState({
                    icon: '🏆',
                    title: 'Points System Coming Soon',
                    message: 'Earn points for squatting and compete with friends!',
                    actionText: 'Back to Main',
                    actionId: 'back-to-main'
                })}
            </div>
        `);
        
        // Add back button handler
        const backBtn = byId('back-to-main');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.hash = '/';
            });
        }
    }
}

/**
 * Render the profile view (v2 feature placeholder)
 * @param {Object} state
 */
function renderProfileView(state) {
    hide(byId('user-setup'));
    show(byId('main-app'));
    
    // Update username display if logged in
    if (state.user?.username) {
        const usernameEl = byId('current-username');
        if (usernameEl) {
            usernameEl.textContent = state.user.username;
        }
    }
    
    // For now, show placeholder in the grid container
    const gridContainer = byId('grid-container');
    if (gridContainer) {
        const username = state.user?.username || 'User';
        setHtml(gridContainer, `
            <div class="view-content">
                <h2>Profile: ${escapeHtml(username)}</h2>
                ${EmptyState({
                    icon: '👤',
                    title: 'Profile Settings Coming Soon',
                    message: 'Customize your profile and view your stats here.',
                    actionText: 'Back to Main',
                    actionId: 'back-to-main'
                })}
            </div>
        `);
        
        // Add back button handler
        const backBtn = byId('back-to-main');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.hash = '/';
            });
        }
    }
}

/**
 * Render 404 not found view
 * @param {Object} state
 */
function render404View(state) {
    hide(byId('user-setup'));
    show(byId('main-app'));
    
    const gridContainer = byId('grid-container');
    if (gridContainer) {
        setHtml(gridContainer, `
            <div class="view-content">
                ${EmptyState({
                    icon: '🔍',
                    title: 'Page Not Found',
                    message: "The page you're looking for doesn't exist.",
                    actionText: 'Go Home',
                    actionId: 'go-home'
                })}
            </div>
        `);
        
        // Add home button handler
        const homeBtn = byId('go-home');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                window.location.hash = '/';
            });
        }
    }
}

/**
 * Render stats section
 * @param {Object} state
 */
function renderStats(state) {
    const stats = state.squatData?.stats;
    if (!stats) return;
    
    // User's streak
    const userStreak = state.user?.userId 
        ? stats.userStreaks?.[state.user.userId] || 0 
        : 0;
    setText(byId('user-streak'), userStreak);
    
    // Active users today
    setText(byId('active-users'), stats.activeToday || 0);
    
    // Longest streak (if elements exist)
    const longestEl = byId('longest-streak');
    if (longestEl) {
        setText(longestEl, stats.longestStreak || 0);
    }
    
    const holderEl = byId('streak-holder');
    if (holderEl) {
        // Use escapeHtml for username which is user-generated
        setText(holderEl, stats.streakHolder || '-');
    }
}

/**
 * Render squat button state
 * @param {boolean} hasSquatted - Whether user has squatted today
 */
function renderSquatButton(hasSquatted) {
    const squatButton = byId('squat-button');
    const squatStatus = byId('squat-status');
    
    if (hasSquatted) {
        hide(squatButton);
        setText(squatStatus, "You've already done 100 squats today! 💪");
        show(squatStatus);
    } else {
        show(squatButton);
        setText(squatStatus, '');
        hide(squatStatus);
    }
}

/**
 * Render loading state
 * @param {boolean} isLoading
 */
function renderLoadingState(isLoading) {
    const squatButton = byId('squat-button');
    if (squatButton) {
        if (isLoading) {
            addClass(squatButton, 'loading');
        } else {
            removeClass(squatButton, 'loading');
        }
    }
}

/**
 * Show an error message
 * @param {string} message - Error message
 * @param {string} [elementId='username-error'] - Error element ID
 */
export function renderError(message, elementId = 'username-error') {
    const errorEl = byId(elementId);
    if (errorEl) {
        // Use escapeHtml since error messages could potentially contain user input
        errorEl.textContent = message; // textContent is inherently safe
        show(errorEl);
    }
}

/**
 * Clear error message
 * @param {string} [elementId='username-error'] - Error element ID
 */
export function clearError(elementId = 'username-error') {
    const errorEl = byId(elementId);
    if (errorEl) {
        setText(errorEl, '');
        hide(errorEl);
    }
}

/**
 * Show the recovery question input
 * This is used during registration flow
 * @param {Function} onConfirm - Callback when answer is confirmed
 */
export function showRecoveryQuestion(onConfirm) {
    const display = byId('recovery-code-display');
    if (!display) return;
    
    display.innerHTML = `
        <div class="recovery-code-container">
            <h3>🤔 One Last Fun Question</h3>
            <p>If you could shoot a liquid out of your index finger, what would it be?</p>
            <input type="password" id="recovery-answer-input" class="recovery-input" placeholder="Your answer..." autocomplete="new-password">
            <p class="recovery-warning">Remember your answer! You'll need it if you want to recover your account on a new device.</p>
            <button id="confirm-recovery-btn" class="primary-button">Save My Answer</button>
            <p id="recovery-question-error" class="error hidden"></p>
        </div>
    `;
    
    show(display);
    hide(byId('user-setup-form'));
    
    // Set up confirm button handler
    const confirmBtn = byId('confirm-recovery-btn');
    const answerInput = byId('recovery-answer-input');
    
    const handleConfirm = () => {
        const answer = answerInput?.value?.trim();
        if (!answer) {
            renderError('Please enter an answer', 'recovery-question-error');
            return;
        }
        onConfirm(answer);
    };
    
    confirmBtn?.addEventListener('click', handleConfirm);
    answerInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    });
    
    // Focus the input
    answerInput?.focus();
}

/**
 * Hide the recovery question display
 */
export function hideRecoveryQuestion() {
    hide(byId('recovery-code-display'));
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} [type='info'] - Toast type (info, success, error)
 */
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message; // textContent is safe
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
