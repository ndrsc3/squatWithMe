class SquatApp {

    constructor() {

        // User Data
        this.squatData = null;

        // User Info
        this.userId = null;
        this.username = null;
        this.currentUser = null;
        this.currentStreak = 0;
        this.deviceId = null;

        // Auth tokens
        this.accessToken = null;
        this.refreshToken = null;

        // App Parameters
        this.displayDays = 12;
        this.debugEnabled = window.location.hostname === 'localhost'; // Logging Enabled in Development

        // Variables
        this.squatToday = false;
        this.todaysDate = new Date();
        
        // Get today's date in YYYY-MM-DD format
        const yyyy = this.todaysDate.getFullYear();
        const mm = String(this.todaysDate.getMonth() + 1).padStart(2, '0');
        const dd = String(this.todaysDate.getDate()).padStart(2, '0');
        
        this.ddInt = parseInt(dd);
        this.today = `${yyyy}-${mm}-${dd}`;
        this.monthKey = `${yyyy}-${mm}`;
        
        // Objects
        this.ws = null;

        // Generate or retrieve device ID
        this.initializeDeviceId();

        // Initialize App
        this.init();
    }

    async init() {
        console.debug('🔵 [Init] Starting initialization');
        
        //this.setupWebSocket();
        this.setupEventListeners();

        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.toggle('light-theme', savedTheme === 'light');
        
        // Wait for user setup before loading data
        await this.setupLocalUser();


        if (this.username) {
            console.debug('🔵 [User] Found user:', this.username);
            await this.fetchUserData();
            this.updateUI(this.squatData.users, this.squatData.stats);
        } else {
            console.debug('🔵 [User] No user found, showing setup screen');
        }
    }

    async setupLocalUser() {
        console.group('🔵 [User] Setup Local User');

        try {
            // Get stored auth data
            const storedAuth = localStorage.getItem('authTokens');
            
            if (storedAuth) {
                try {
                    const { accessToken, refreshToken, userId, username } = JSON.parse(storedAuth);
                    
                    // Store tokens and basic user info
                    this.accessToken = accessToken;
                    this.refreshToken = refreshToken;
                    this.userId = userId;
                    this.username = username;
                    
                    // Verify token is still valid
                    const response = await this.fetchWithAuth('/api/auth/verify');
                    if (!response.ok) {
                        throw new Error('Invalid token');
                    }
                    
                    // Update UI
                    document.getElementById('main-app').classList.remove('hidden');
                    document.getElementById('current-username').textContent = this.username;

                } catch (error) {
                    console.error('🔴 [Storage] Auth error:', error);
                    localStorage.removeItem('authTokens');
                    document.getElementById('user-setup').classList.remove('hidden');
                }
            } else {
                console.debug('🔵 [Storage] No stored auth found');
                document.getElementById('user-setup').classList.remove('hidden');
            }
        } catch (error) {
            console.error('🔴 [Storage] Error in setup process:', error);
            document.getElementById('user-setup').classList.remove('hidden');
        }
        console.groupEnd();
    }

    // ToDo:: Handle realtime updates
    setupWebSocket() {
        console.group('🔵 [WebSocket] Setup');
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
            const wsUrl = `${protocol}//${host}/api/ws`;
            
            console.debug('🔵 [WebSocket] Connection details:', {
                protocol,
                host,
                fullUrl: wsUrl,
                currentLocation: window.location.href
            });
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.debug('🔵 [WebSocket] Connection established');
                // Send initial ping
                this.ws.send(JSON.stringify({ type: 'ping' }));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.debug('🔵 [WebSocket] Message received:', data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('🔴 [WebSocket] Error parsing message:', error);
                    console.error('🔴 [WebSocket] Raw message:', event.data);
                }
            };

            this.ws.onerror = (error) => {
                console.error('🔴 [WebSocket] Connection error:', error);
                console.error('🔴 [WebSocket] Error details:', {
                    readyState: this.ws.readyState,
                    url: this.ws.url
                });
            };

            this.ws.onclose = (event) => {
                console.warn('🟡 [WebSocket] Connection closed', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                });
                console.warn('🟡 [WebSocket] Attempting reconnect in 5s');
                setTimeout(() => this.setupWebSocket(), 5000);
            };
        } catch (error) {
            console.error('🔴 [WebSocket] Setup failed:', error);
        }
        console.groupEnd();
    }

    setupEventListeners() {
        // Save Button
        const saveButton = document.getElementById('save-username');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                console.debug('🔵 [Event] Save username button clicked');
                this.saveUsername();
            });
        }
        
        // Username Input - Enter Key
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    console.debug('🔵 [Event] Enter key pressed on username input');
                    this.saveUsername();
                }
            });
        }
        
        // Recovery Answer Input - Enter Key (for initial setup)
        document.addEventListener('click', (event) => {
            if (event.target.id === 'recovery-answer') {
                event.target.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        console.debug('🔵 [Event] Enter key pressed on recovery answer input');
                        const confirmButton = document.getElementById('confirm-recovery');
                        if (confirmButton) {
                            confirmButton.click();
                        }
                    }
                });
            }
        });
        
        // Recovery Answer Input - Enter Key (for account recovery)
        const recoveryAnswerInput = document.getElementById('recovery-answer');
        if (recoveryAnswerInput) {
            recoveryAnswerInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    console.debug('🔵 [Event] Enter key pressed on recovery answer input');
                    const recoverButton = document.getElementById('recover-account');
                    if (recoverButton) {
                        recoverButton.click();
                    }
                }
            });
        }
        
        // Squat Button
        const squatButton = document.getElementById('squat-button');
        if (squatButton) {
            squatButton.addEventListener('click', () => this.recordSquat());
        }

        // Theme Toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Recovery interface event listeners
        document.getElementById('show-recovery').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('user-setup-form').classList.add('hidden');
            document.getElementById('account-recovery').classList.remove('hidden');
        });

        document.getElementById('show-signup').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('account-recovery').classList.add('hidden');
            document.getElementById('user-setup-form').classList.remove('hidden');
        });

        document.getElementById('recover-account').addEventListener('click', () => this.recoverAccount());

        // Clear error messages when inputs change
        document.getElementById('username').addEventListener('input', () => {
            document.getElementById('username-error').classList.add('hidden');
            document.getElementById('username').classList.remove('error');
        });

        document.getElementById('recovery-username').addEventListener('input', () => {
            document.getElementById('recovery-error').classList.add('hidden');
        });

        document.getElementById('recovery-answer').addEventListener('input', () => {
            document.getElementById('recovery-error').classList.add('hidden');
        });
    }

    async saveUsername() {
        console.group('🔵 [User] Save Username Process');
        try {
            // Elements
            const usernameInput = document.getElementById('username');
            const username = usernameInput.value.trim();
            const errorElement = document.getElementById('username-error');
            
            if (!username) {
                console.warn('🟡 [User] Empty username');
                this.showError('Please enter a username');
                return;
            }

            // Check username availability
            const checkResponse = await fetch('/api/check-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (checkResponse.status === 409) {
                console.warn('🟡 [User] Username taken:', username);
                errorElement.textContent = 'Username already taken';
                errorElement.classList.remove('hidden');
                usernameInput.classList.add('error');
                return;
            }

            // Generate userId if not exists
            if (!this.userId) {
                this.userId = crypto.randomUUID();
            }

            // Get device information
            const deviceFingerprint = await this.generateDeviceFingerprint();

            // Show recovery question and get answer
            document.getElementById('user-setup-form').classList.add('hidden');
            const recoveryMessage = `
                <div class="recovery-code-container">
                    <h3>🤔 One Last Fun Question</h3>
                    <p>If you could shoot a liquid out of your index finger, what would it be?</p>
                    <input type="password" id="recovery-answer" class="recovery-input" placeholder="Your answer..." autocomplete="new-password">
                    <p class="recovery-warning">Remember your answer! You'll need it if you want to recover your account on a new device.</p>
                    <button id="confirm-recovery" class="primary-button">Save My Answer</button>
                    <p id="recovery-error" class="error hidden"></p>
                </div>
            `;
            const recoveryDisplay = document.getElementById('recovery-code-display');
            if (!recoveryDisplay) {
                throw new Error('Recovery display element not found');
            }
            recoveryDisplay.innerHTML = recoveryMessage;
            recoveryDisplay.classList.remove('hidden');

            // Wait for user to answer
            const recoveryAnswer = await new Promise((resolve, reject) => {
                const confirmButton = document.getElementById('confirm-recovery');
                if (!confirmButton) {
                    reject(new Error('Confirm button not found'));
                    return;
                }

                const handleClick = () => {
                    const answerInput = document.getElementById('recovery-answer');
                    if (!answerInput) {
                        reject(new Error('Answer input not found'));
                        return;
                    }

                    const answer = answerInput.value.trim();
                    if (!answer) {
                        const recoveryError = document.getElementById('recovery-error');
                        if (recoveryError) {
                            recoveryError.textContent = 'Please enter an answer';
                            recoveryError.classList.remove('hidden');
                        }
                        return;
                    }

                    // Clean up event listener
                    confirmButton.removeEventListener('click', handleClick);
                    resolve(answer);
                };

                confirmButton.addEventListener('click', handleClick);
            });

            // Save user with recovery answer
            const saveResponse = await fetch('/api/save-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    username,
                    deviceId: this.deviceId,
                    deviceFingerprint,
                    recoveryAnswer
                })
            });

            if (!saveResponse.ok) {
                throw new Error(`HTTP error! status: ${saveResponse.status}`);
            }

            const result = await saveResponse.json();

            // Store tokens
            this.accessToken = result.accessToken;
            this.refreshToken = result.refreshToken;
            this.username = username;

            // Update local storage
            localStorage.setItem('authTokens', JSON.stringify({
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                userId: this.userId,
                username: this.username
            }));

            // Update UI
            document.getElementById('recovery-code-display').classList.add('hidden');
            document.getElementById('user-setup').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('current-username').textContent = this.username;

            // Load initial data
            await this.fetchUserData();
        } catch (error) {
            console.error('🔴 [User] Error saving username:', error);
            this.showError('Failed to save username. Please try again.');
        }
        console.groupEnd();
    }

    async recoverAccount() {
        console.group('🔵 [User] Account Recovery Process');
        try {
            const username = document.getElementById('recovery-username').value.trim();
            const recoveryAnswer = document.getElementById('recovery-answer')?.value.trim();

            if (!username) {
                this.showError('Please enter your username', 'recovery-error');
                return;
            }

            // Get device information
            const deviceFingerprint = await this.generateDeviceFingerprint();

            const response = await fetch('/api/recover-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    recoveryAnswer,
                    deviceId: this.deviceId,
                    deviceFingerprint
                })
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401 && !recoveryAnswer) {
                    document.getElementById('recovery-code-container').classList.remove('hidden');
                    document.getElementById('recovery-question').textContent = 
                        'If you could shoot a liquid out of your index finger, what would it be?';
                    this.showError('Please answer the recovery question', 'recovery-error');
                    return;
                }
                this.showError(result.error || 'Recovery failed', 'recovery-error');
                return;
            }

            // Store tokens and user info
            this.accessToken = result.accessToken;
            this.refreshToken = result.refreshToken;
            this.userId = result.userId;
            this.username = result.username;

            localStorage.setItem('authTokens', JSON.stringify({
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
                userId: this.userId,
                username: this.username
            }));

            // Update UI
            document.getElementById('user-setup').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('current-username').textContent = this.username;

            // Load user data
            await this.fetchUserData();
            
            console.debug('🔵 [User] Account recovered successfully');
        } catch (error) {
            console.error('🔴 [User] Error recovering account:', error);
            this.showError('Failed to recover account. Please try again.', 'recovery-error');
        }
        console.groupEnd();
    }

    async fetchUserData() {
        try {
            const response = await this.fetchWithAuth('/api/get-users');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.squatData = await response.json();
            
            this.processUserData(this.squatData);
            
            // Cache the new data
            localStorage.setItem('squatData', JSON.stringify({
                data: this.squatData,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('🔴 [Data] Failed to load data:', error);
            this.showError('Failed to load data. Please try again later.');
        }
    }

    processUserData(data) {
        // Process users and calculate their streaks
        const processedUsers = data.users.map(user => {
            const streak = this.calculateStreak(user.squats || {});
            return {
                ...user,
                currentStreak: streak
            };
        });

        // Calculate global stats
        const stats = {
            longestStreak: 0,
            streakHolder: '',
            userStreaks: {},
            activeToday: processedUsers.filter(user => this.hasSquattedToday(user.squats)).length
        };

        processedUsers.forEach(user => {
            // Store user's streak
            stats.userStreaks[user.userId] = user.currentStreak;
            
            // Update longest streak if necessary
            if (user.currentStreak > stats.longestStreak) {
                stats.longestStreak = user.currentStreak;
                stats.streakHolder = user.username;
            }
        });

        // Store everything back in squatData
        this.squatData = {
            users: processedUsers,
            stats: stats
        };

        // Update current user reference
        this.currentUser = processedUsers.find(u => u.userId === this.userId);
        this.squatToday = this.hasSquattedToday(this.currentUser?.squats);
        
        // Trigger UI update
        this.updateUI();
    }

    hasSquattedToday(squats) {
        if (!squats) {
            console.debug('🔵 [Squat] No squats data available');
            return false;
        }
        
        const hasSquatted = squats[this.monthKey].includes(this.ddInt);
        
        return hasSquatted;
    }

    calculateStreak(squats) {
        if (!squats) return 0;
        
        let streak = 0;
        let checkDate = new Date(this.todaysDate);
        
        // If they haven't squatted today, start checking from yesterday
        if (!this.hasSquattedToday(squats)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        // Count backwards from checkDate to find streak
        while (true) {
            const monthKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
            const dayOfMonth = String(checkDate.getDate()).padStart(2, '0');
            const dayOfMonthInt = parseInt(dayOfMonth);
            
            // Check if the month exists and contains the day
            if (!squats[monthKey] || !squats[monthKey].includes(dayOfMonthInt)) {
                break;
            }
            
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        return streak;
    }

    calculateGlobalStats(users) {
        const stats = {
            longestStreak: 0,
            streakHolder: '',
            userStreaks: {}
        };

        users.forEach(user => {
            // Store user's streak
            stats.userStreaks[user.userId] = user.currentStreak;
            
            // Update longest streak if necessary
            if (user.currentStreak > stats.longestStreak) {
                stats.longestStreak = user.currentStreak;
                stats.streakHolder = user.username;
            }
        });

        return stats;
    }

    updateUI() {
        console.group('🔵 [UI] Updating Interface');
        try {
            // Verify we have data to work with
            if (!this.squatData) {
                console.warn('🟡 [UI] No data available for UI update');
                return;
            }

            // Update squat button state based on today's status
            this.updateSquatButtonState(this.squatToday);

            // Update stats display
            this.updateUIStats(this.squatData.stats);

            // Render the grid with current data
            this.renderGrid();

            console.debug('🔵 [UI] Update complete', {
                squatToday: this.squatToday,
                stats: this.squatData.stats,
                userCount: this.squatData.users.length
            });
        } catch (error) {
            console.error('🔴 [UI] Error updating interface:', error);
            this.showError('Something went wrong updating the display');
        }
        console.groupEnd();
    }

    async recordSquat() {
        console.group('🔵 [Squat] Recording Squat');

        const squatButton = document.getElementById('squat-button');
        const squatStatus = document.getElementById('squat-status');

        try { 
            squatButton.classList.add('loading');
            const response = await this.fetchWithAuth('/api/record-squat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: this.today
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.squatToday = true;
            this.updateSquatButtonState(true);
            
            // Update UI
            await this.fetchUserData();
            console.debug('🔵 [Squat] Successfully recorded');
        } 
        catch (error) {
            console.error('🔴 [Squat] Error recording:', error);
            if (error.name === 'TypeError') {
                this.showError('Network error. Please check your connection.');
            } else {
                this.showError('Failed to record squat: ' + error.message);
            }
        }
        finally {
            squatButton.classList.remove('loading');
            console.groupEnd();
        }
    }

    updateSquatButtonState(hasSquatted) {
        const squatButton = document.getElementById('squat-button');
        const squatStatus = document.getElementById('squat-status');
        
        if (hasSquatted) {
            squatButton.classList.add('hidden');
            squatStatus.textContent = "You've already done 100 squats today! 💪";
            squatStatus.classList.remove('hidden');
        } else {
            squatButton.classList.remove('hidden');
            squatStatus.textContent = '';
            squatStatus.classList.add('hidden');
        }
    }

    handleWebSocketMessage(data) {
        console.group('🔵 [WebSocket] Handling Message');
        try {
            switch (data.type) {
                case 'update':
                    console.debug('🔵 [WebSocket] Received data update');
                    this.squatData = data;
                    this.processUserData(this.squatData);
                    break;
                case 'userRemoved':
                    console.debug('🔵 [WebSocket] User removal notification');
                    this.handleUserRemoval(data.userId);
                    break;
                default:
                    console.warn('🟡 [WebSocket] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('🔴 [WebSocket] Error handling message:', error);
        }
        console.groupEnd();
    }

    updateUIStats(stats) {
        console.debug('🔵 [UI] Updating Stats Display');
        
        // Get all stat elements
        const elements = {
            userStreak: document.getElementById('user-streak'),
            activeUsers: document.getElementById('active-users'),
            longestStreak: document.getElementById('longest-streak'),
            streakHolder: document.getElementById('streak-holder')
        };

        try {
            // Update user's current streak
            if (elements.userStreak) {
                const userStreak = stats.userStreaks?.[this.userId] || 0;
                elements.userStreak.textContent = userStreak;
            }

            // Update longest streak (if element exists)
            if (elements.longestStreak) {
                elements.longestStreak.textContent = stats.longestStreak || 0;
            }

            // Update streak holder (if element exists)
            if (elements.streakHolder) {
                elements.streakHolder.textContent = stats.streakHolder || '-';
            }
                
            // Update active users count
            if (elements.activeUsers) {
                elements.activeUsers.textContent = stats.activeToday || 0;
            }
        } catch (error) {
            console.error('🔴 [UI] Error updating stats:', error);
        }
    }

    handleUserRemoval(userId) {
        console.group('🔵 [User] Handling User Removal');
        try {
            if (userId === this.userId) {
                console.debug('🔵 [User] Current user removed');
                this.showError('Your account has been deactivated due to inactivity');
                localStorage.removeItem('squatUser');
                document.getElementById('user-setup').classList.remove('hidden');
                document.getElementById('main-app').classList.add('hidden');
                
                // Clear app state
                this.squatData = null;
                this.userId = null;
                this.username = null;
            } else {
                console.debug('🔵 [User] Other user removed, refreshing data');
                // Refresh data from server
                this.fetchUserData();
            }
        } catch (error) {
            console.error('🔴 [User] Error handling user removal:', error);
        }
        console.groupEnd();
    }

    renderGrid() {
        console.group('🔵 Grid Rendering');
        
        // Get unique users by userId and sort them by streak
        const sortedUsers = Array.from(
            new Map(this.squatData.users.map(user => [user.userId, user])).values()
        ).sort((a, b) => {
            // Always put current user first
            if (a.userId === this.userId) return -1;
            if (b.userId === this.userId) return 1;
            
            // Then sort by streak (highest to lowest)
            if (a.currentStreak !== b.currentStreak) {
                return b.currentStreak - a.currentStreak;
            }
            
            // If streaks are equal, sort alphabetically
            return a.username.localeCompare(b.username);
        });

        // Get last N days including today, in reverse order (most recent first)
        const dates = Array.from({length: this.displayDays}, (_, i) => {
            const date = new Date(this.today);
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        });

        // Setup grid layout
        const grid = document.getElementById('squat-grid');
        grid.innerHTML = '';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `minmax(100px, auto) minmax(80px, auto) repeat(${dates.length}, 1fr)`;
        grid.style.gridTemplateRows = `auto repeat(${sortedUsers.length}, auto)`;

        // Add headers (same as before)
        this.addGridHeaders(grid, dates, sortedUsers.length);

        // Add user rows with streak and squat data
        sortedUsers.forEach(user => {
            // Username and streak cells (same as before)
            this.addUserCells(grid, user);

            // Squat cells for each date
            dates.forEach(date => {
                const [yyyy, mm, dd] = date.split('-');
                const monthKey = `${yyyy}-${mm}`;
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                if (user.squats?.[monthKey]?.includes(parseInt(dd))) {
                    cell.classList.add('squatted');
                    cell.innerHTML = '✓';
                }
                
                if (date === this.today) {
                    cell.classList.add('today');
                }
                
                grid.appendChild(cell);
            });
        });

        console.groupEnd();
    }

    addGridHeaders(grid, dates, userCount) {
        const cornerCell = document.createElement('div');
        cornerCell.className = 'grid-cell corner-header';
        cornerCell.textContent = `Users (${userCount})`;
        grid.appendChild(cornerCell);

        const streakHeader = document.createElement('div');
        streakHeader.className = 'grid-cell corner-header';
        streakHeader.textContent = 'Streak';
        grid.appendChild(streakHeader);

        // Add date headers
        dates.forEach(date => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell date-header';
            const [year, month, day] = date.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            
            // Format date as MM/DD
            cell.textContent = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            
            // Highlight today's column
            if (date === this.today) {
                cell.classList.add('today');
            }
            
            // Add day of week below date
            const daySpan = document.createElement('span');
            daySpan.className = 'day-of-week';
            daySpan.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            cell.appendChild(daySpan);
            
            grid.appendChild(cell);
        });
    }

    addUserCells(grid, user) {
        const nameCell = document.createElement('div');
        nameCell.className = 'grid-cell user-name';
        if (user.userId === this.userId) {
            nameCell.classList.add('current-user');
        }
        nameCell.textContent = user.username;
        grid.appendChild(nameCell);

        const streakCell = document.createElement('div');
        streakCell.className = 'grid-cell streak-cell';
        if (user.currentStreak > 0) {
            streakCell.textContent = `${user.currentStreak}🔥`;
        } else {
            streakCell.textContent = '0';
        }
        grid.appendChild(streakCell);
    }

    // Offline sync handling
    async syncOfflineSquats() {
        console.debug('🔵 Sync Offline Squats');
        const offlineSquats = JSON.parse(localStorage.getItem('offlineSquats') || '[]');
        const unsyncedSquats = offlineSquats.filter(squat => !squat.synced);

        for (const squat of unsyncedSquats) {
            try {
                await fetch('/api/record-squat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: this.userId,
                        username: this.username,
                        date: squat.date
                    })
                });
                squat.synced = true;
            } catch (error) {
                console.error('Failed to sync squat:', error);
            }
        }

        localStorage.setItem('offlineSquats', JSON.stringify(offlineSquats));
    }

    // Method to calculate streaks for all users
    calculateUserStreaks(users) {
        return users.map(user => {
            let streak = 0;
            if (user.squats && user.squats.length > 0) {
                let checkDate = new Date(this.todaysDate);
                
                // Sort squats to ensure chronological order
                const sortedSquats = [...user.squats].sort();
                
                // Count backwards from today to find streak
                while (sortedSquats.includes(checkDate.toISOString().split('T')[0])) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
            }
            return {
                ...user,
                currentStreak: streak
            };
        });
    }

    showError(message, elementId = 'username-error') {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    toggleTheme() {
        const root = document.documentElement;
        const isLightTheme = root.classList.toggle('light-theme');
        localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    }

    // Add a toast notification system
    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    async initializeDeviceId() {
        // Try to get existing device ID from localStorage
        let storedDeviceId = localStorage.getItem('deviceId');
        
        if (!storedDeviceId) {
            // Generate device fingerprint
            const fingerprint = await this.generateDeviceFingerprint();
            // Create a UUID based on the fingerprint
            storedDeviceId = crypto.randomUUID();
            // Store both values
            localStorage.setItem('deviceId', storedDeviceId);
            localStorage.setItem('deviceFingerprint', fingerprint);
        }
        
        this.deviceId = storedDeviceId;
    }

    async generateDeviceFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            navigator.hardwareConcurrency,
            navigator.deviceMemory,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.platform,
            navigator.vendor
        ].join('|');

        // Create a hash of the components
        const encoder = new TextEncoder();
        const data = encoder.encode(components);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async refreshAccessToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const { accessToken } = await response.json();
            this.accessToken = accessToken;
            return true;
        } catch (error) {
            console.error('🔴 Failed to refresh token:', error);
            return false;
        }
    }

    async fetchWithAuth(url, options = {}) {
        // Add authorization header
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`
        };

        try {
            const response = await fetch(url, { ...options, headers });
            
            // If token expired, try to refresh
            if (response.status === 401) {
                const data = await response.json();
                if (data.code === 'TOKEN_EXPIRED' && await this.refreshAccessToken()) {
                    // Retry with new token
                    headers.Authorization = `Bearer ${this.accessToken}`;
                    return fetch(url, { ...options, headers });
                }
            }
            
            return response;
        } catch (error) {
            console.error('🔴 Request failed:', error);
            throw error;
        }
    }
}

new SquatApp();