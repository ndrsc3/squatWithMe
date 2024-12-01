class SquatApp {
    constructor() {
        this.userId = null;
        this.username = null;
        this.ws = null;
        this.lastSquatDate = null;
        this.currentStreak = 0;
        this.displayDays = 10;
        
        // Enable logging in development
        this.debugEnabled = window.location.hostname === 'localhost';
        
        console.debug('🔵 [Init] Initializing SquatApp');
        this.init();
    }

    async init() {
        console.debug('🔵 [Init] Starting initialization');
        //this.setupWebSocket();
        this.setupEventListeners();
        
        // Wait for user setup before loading data
        await this.setupUser();
        if (this.username) {
            console.debug('🔵 [User] Found user:', this.username);
            await this.loadInitialData();
        } else {
            console.debug('🔵 [User] No user found, showing setup screen');
        }
    }

    async setupUser() {
        console.group('🔵 [User] Setup Process');
        try {
            // Debug localStorage state
            console.debug('🔵 [Storage] All localStorage keys:', Object.keys(localStorage));
            
            // Get User Stored Locally
            const storedUser = localStorage.getItem('squatUser');
            console.debug('🔵 [Storage] Raw stored user data:', storedUser);
            
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    console.debug('🔵 [Storage] Parsed user data:', userData);
                    
                    if (!userData.userId || !userData.username) {
                        console.warn('🟡 [Storage] Invalid user data structure:', userData);
                        localStorage.removeItem('squatUser');
                        document.getElementById('user-setup').classList.remove('hidden');
                        return;
                    }
                    
                    this.userId   = userData.userId;
                    this.username = userData.username;
                    
                    console.debug('🔵 [User] Successfully loaded user:', {
                        userId: this.userId,
                        username: this.username
                    });
                    
                    document.getElementById('main-app').classList.remove('hidden');
                    document.getElementById('current-username').textContent = this.username;
                } catch (parseError) {
                    console.error('🔴 [Storage] JSON parse error:', parseError);
                    localStorage.removeItem('squatUser');
                    document.getElementById('user-setup').classList.remove('hidden');
                }
            } else {
                console.debug('🔵 [Storage] No stored user found');
                document.getElementById('user-setup').classList.remove('hidden');
            }
        } catch (error) {
            console.error('🔴 [Storage] Error in setup process:', error);
            document.getElementById('user-setup').classList.remove('hidden');
        }
        console.groupEnd();
    }

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
        console.debug('🔵 Setup Event Listeners');
        const saveButton = document.getElementById('save-username');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                console.debug('🔵 [Event] Save username button clicked');
                this.saveUsername();
            });
        } else {
            console.error('🔴 [Event] Save username button not found');
        }
        
        const squatButton = document.getElementById('squat-button');
        if (squatButton) {
            squatButton.addEventListener('click', () => this.recordSquat());
        }
    }

    async saveUsername() {
        console.group('🔵 [User] Save Username Process');
        try {
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

            // Save user
            const saveResponse = await fetch('/api/save-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    username
                })
            });

            if (saveResponse.status === 409) {
                console.warn('🟡 [User] Username taken:', username);
                errorElement.textContent = 'Username already taken';
                errorElement.classList.remove('hidden');
                usernameInput.classList.add('error');
                return;
            }

            if (!saveResponse.ok) {
                throw new Error(`HTTP error! status: ${saveResponse.status}`);
            }

            // Update local storage
            this.username = username;
            localStorage.setItem('squatUser', JSON.stringify({
                userId: this.userId,
                username: this.username
            }));

            // Update UI
            document.getElementById('user-setup').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('current-username').textContent = this.username;

            // Load initial data
            await this.loadInitialData();
        } catch (error) {
            console.error('🔴 [User] Error saving username:', error);
            this.showError('Failed to save username. Please try again.');
        }
        console.groupEnd();
    }

    async verifyStorageAccess() {
        const result = { available: false, reason: [] };
        
        // Check quota
        try {
            const quota = await navigator.storage?.estimate();
            if (quota && quota.quota - quota.usage < 1024) {
                result.reason.push('Storage quota full');
            }
        } catch (e) {
            result.reason.push('Cannot check quota');
        }

        // Check basic access
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
        } catch (e) {
            result.reason.push('Cannot access localStorage');
        }

        result.available = result.reason.length === 0;
        return result;
    }

    showError(message) {
        const errorElement = document.getElementById('username-error');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    async loadInitialData() {
        console.group('🔵 [Data] Loading Initial Data');
        try {
            const response = await fetch('/api/get-users');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            // Update squat button state
            const today = new Date().toISOString().split('T')[0];
            const currentUser = data.users.find(u => u.userId === this.userId);
            const hasSquattedToday = currentUser?.squats?.includes(today) || false;
            this.updateSquatButtonState(hasSquattedToday);
            
            // Calculate user's current streak
            if (currentUser && currentUser.squats) {
                const sortedSquats = [...currentUser.squats].sort();
                let streak = 0;
                const today = new Date().toISOString().split('T')[0];
                let checkDate = new Date(today);

                // Count backwards from today to find streak
                while (sortedSquats.includes(checkDate.toISOString().split('T')[0])) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }

                data.stats.userStreak = streak;
            } else {
                data.stats.userStreak = 0;
            }

            console.debug('🔵 [Data] Received users:', {
                count: data.users.length,
                stats: data.stats
            });

            // Render Grid
            this.renderGrid(data.users);
            this.updateStats(data.stats);
            
        } catch (error) {
            console.error('🔴 [Data] Failed to load initial data:', error);
            this.showError('Failed to load data. Please try again later.');
        }
        console.groupEnd();
    }

    async recordSquat() {
        console.group('🔵 [Squat] Recording Squat');
        const today = new Date().toISOString().split('T')[0];
        const squatButton = document.getElementById('squat-button');
        const squatStatus = document.getElementById('squat-status');

        try {
            // Check if already squatted today
            if (this.lastSquatDate === today) {
                console.debug('🔵 [Squat] Already recorded for today');
                this.updateSquatButtonState(true);
                return;
            }

            const response = await fetch('/api/record-squat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    date: today
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.debug('🔵 [Squat] Successfully recorded');
            this.lastSquatDate = today;
            this.updateSquatButtonState(true);
            
            // Reload data to update UI
            await this.loadInitialData();
        } catch (error) {
            console.error('🔴 [Squat] Failed to record:', error);
            // Store offline
            const offlineSquats = JSON.parse(localStorage.getItem('offlineSquats') || '[]');
            offlineSquats.push({ date: today, synced: false });
            localStorage.setItem('offlineSquats', JSON.stringify(offlineSquats));
            
            this.showError('Failed to record squat. It will sync when you\'re back online.');
        }
        console.groupEnd();
    }

    updateSquatButtonState(hasSquatted) {
        const squatButton = document.getElementById('squat-button');
        const squatStatus = document.getElementById('squat-status');
        
        if (hasSquatted) {
            squatButton.classList.add('hidden');
            squatStatus.textContent = "You've already done your squat today! 💪";
            squatStatus.classList.remove('hidden');
        } else {
            squatButton.classList.remove('hidden');
            squatStatus.textContent = '';
            squatStatus.classList.add('hidden');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'update':
                this.updateUI(data.users, data.stats);
                break;
            case 'userRemoved':
                this.handleUserRemoval(data.userId);
                break;
            default:
                console.warn('Unknown message type:', data.type);
        }
    }

    updateUI(users, stats) {
        console.debug('🔵 Update UI');
        // Update the UI with new data
        if (stats) {
            document.getElementById('longest-streak').textContent = stats.longestStreak;
            document.getElementById('streak-holder').textContent = stats.streakHolder;
        }
        
        // Update user-specific data
        const currentUser = users.find(u => u.userId === this.userId);
        if (currentUser) {
            document.getElementById('user-streak').textContent = this.calculateCurrentStreak(currentUser.squats);
        }
        
        // Update the grid if it exists
        this.updateGrid(users);
    }

    handleUserRemoval(userId) {
        console.debug('🔵 Handle User Removal');
        if (userId === this.userId) {
            // Current user was removed, show appropriate message
            this.showError('Your account has been deactivated due to inactivity');
            localStorage.removeItem('squatUser');
            this.showLoginForm();
        } else {
            // Other user was removed, just update the UI
            this.loadInitialData();
        }
    }

    renderGrid(users) {
        console.group('🔵 Grid Rendering');
        console.debug('Current userId:', this.userId);
        console.debug('All user IDs:', users.map(u => u.userId));

        // Get unique users by userId
        const uniqueUsers = Array.from(new Map(users.map(user => [user.userId, user])).values());
        
        // Sort users (current user first, then alphabetically by username)
        const sortedUsers = uniqueUsers.sort((a, b) => {
            if (a.userId === this.userId) return -1;
            if (b.userId === this.userId) return 1;
            return a.username.localeCompare(b.username);
        });

        // Get last N days including today, in reverse order (most recent first)
        const today = new Date();
        const dates = Array.from({length: this.displayDays}, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - i); // Changed to count backwards from i
            return date.toISOString().split('T')[0];
        });

        // Setup grid layout
        const grid = document.getElementById('squat-grid');
        grid.innerHTML = '';

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `minmax(100px, auto) repeat(${dates.length}, 1fr)`;
        grid.style.gridTemplateRows = `auto repeat(${sortedUsers.length}, auto)`;

        // Add header row
        const cornerCell = document.createElement('div');
        cornerCell.className = 'grid-cell corner-header';
        cornerCell.textContent = `Users (${sortedUsers.length})`;
        grid.appendChild(cornerCell);

        // Add date headers (now in reverse order)
        dates.forEach(date => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell date-header';
            const dateObj = new Date(date);
            
            // Format date as MM/DD
            cell.textContent = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            
            // Highlight today's column
            if (date === today.toISOString().split('T')[0]) {
                cell.classList.add('today');
            }
            
            // Add day of week below date
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const daySpan = document.createElement('span');
            daySpan.className = 'day-of-week';
            daySpan.textContent = dayOfWeek;
            cell.appendChild(daySpan);
            
            grid.appendChild(cell);
        });

        // Add user rows with squat data
        sortedUsers.forEach(user => {
            // Username cell
            const nameCell = document.createElement('div');
            nameCell.className = 'grid-cell user-name';
            if (user.userId === this.userId) {
                nameCell.classList.add('current-user');
            }
            nameCell.textContent = user.username;
            grid.appendChild(nameCell);

            // Squat cells for each date
            dates.forEach(date => {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                // Check if user has squatted on this date
                if (user.squats && user.squats.includes(date)) {
                    cell.classList.add('squatted');
                    cell.innerHTML = '✓';
                }
                
                // Highlight today's column
                if (date === today.toISOString().split('T')[0]) {
                    cell.classList.add('today');
                }
                
                grid.appendChild(cell);
            });
        });

        console.groupEnd();
    }

    updateStats(stats) {
        console.debug('🔵 Update Stats');
        document.getElementById('user-streak').textContent = stats.userStreak || 0;
        //document.getElementById('longest-streak').textContent = stats.longestStreak || 0;
        //document.getElementById('streak-holder').textContent = stats.streakHolder || '-';
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
}

new SquatApp();