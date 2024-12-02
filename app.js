class SquatApp {

    constructor() {

        // User Data
        this.squatData = null;

        // User Info
        this.userId = null;
        this.username = null;
        this.currentUser = null;
        this.currentStreak = 0;

        // App Parameters
        this.displayDays = 10;
        this.debugEnabled = window.location.hostname === 'localhost'; // Logging Enabled in Development

        // Variables
        this.squatToday = false;
        this.todaysDate = new Date();
        var dd = String(this.todaysDate.getDate()).padStart(2, '0');
        var mm = String(this.todaysDate.getMonth() + 1).padStart(2, '0'); // January is 0!
        var yyyy = this.todaysDate.getFullYear();
        
        this.today = yyyy + '-' + mm + '-' + dd;
        this.todaysDate = new Date(this.today);
        
        // Objects
        this.ws = null;

        // Initialize App
        this.init();
    }

    async init() {
        console.debug('🔵 [Init] Starting initialization');
        
        //this.setupWebSocket();
        this.setupEventListeners();
        
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
            
            // Get User Stored Locally
            const storedUser = localStorage.getItem('squatUser');
            
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    console.debug('🔵 [Storage] Loaded Local User Data:', userData);
                    
                    // Check if user data is valid
                    if (!userData.userId || !userData.username) {
                        console.warn('🟡 [Storage] Invalid user data structure:', userData);
                        localStorage.removeItem('squatUser');
                        document.getElementById('user-setup').classList.remove('hidden');
                        return;
                    }
                    
                    // Store user info
                    this.userId   = userData.userId;
                    this.username = userData.username;
                    
                    // Update UI
                    document.getElementById('main-app').classList.remove('hidden');
                    document.getElementById('current-username').textContent = this.username;

                } catch (parseError) {
                    console.error('🔴 [Storage] JSON parse error:', parseError);
                    localStorage.removeItem('squatUser');

                    // Update UI
                    document.getElementById('user-setup').classList.remove('hidden');
                }
            } else {
                console.debug('🔵 [Storage] No stored user found');

                // Update UI
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
        
        // Squat Button
        const squatButton = document.getElementById('squat-button');
        if (squatButton) {
            squatButton.addEventListener('click', () => this.recordSquat());
        }
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
            await this.fetchUserData();
        } catch (error) {
            console.error('🔴 [User] Error saving username:', error);
            this.showError('Failed to save username. Please try again.');
        }
        console.groupEnd();
    }

    async fetchUserData() {
        console.group('🔵 [Data] Fetching Data');
        try {
            // Get User Data from server
            const response = await fetch('/api/get-users');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.squatData = await response.json();
            
            // Process and store data
            this.processUserData(this.squatData);
            
        } catch (error) {
            console.error('🔴 [Data] Failed to load data:', error);
            this.showError('Failed to load data. Please try again later.');
        }
        console.groupEnd();
    }

    processUserData(data) {
        // Process users and calculate their streaks
        const processedUsers = data.users.map(user => {
            const streak = this.calculateStreak(user.squats || []);
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
            activeToday: processedUsers.filter(user => 
                user.squats && user.squats.includes(this.today)
            ).length
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
        this.squatToday = this.currentUser?.squats?.includes(this.today) || false;
        
        // Trigger UI update
        this.updateUI();
    }

    calculateStreak(squats) {
        if (!squats || squats.length === 0) return 0;
        
        let streak = 0;
        let checkDate = new Date(this.today);
        
        // Sort squats to ensure chronological order
        const sortedSquats = [...squats].sort();
        
        // Count backwards from today to find streak
        while (sortedSquats.includes(checkDate.toISOString().split('T')[0])) {
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

        // Get Elements
        const squatButton = document.getElementById('squat-button');
        const squatStatus = document.getElementById('squat-status');

        try {
            const response = await fetch('/api/record-squat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    date: this.today
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.debug('🔵 [Squat] Successfully recorded');
            this.squatToday = true;
            this.updateSquatButtonState(true);
            
            // Update UI
            await this.fetchUserData();

        } catch (error) {
            console.error('🔴 [Squat] Failed to record:', error);
            
            // Store offline
            const offlineSquats = JSON.parse(localStorage.getItem('offlineSquats') || '[]');
            offlineSquats.push({ date: this.today, synced: false });
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
        
        // Get unique users by userId and sort them
        const sortedUsers = Array.from(
            new Map(this.squatData.users.map(user => [user.userId, user])).values()
        ).sort((a, b) => {
            if (a.userId === this.userId) return -1;
            if (b.userId === this.userId) return 1;
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

        // Add header row
        const cornerCell = document.createElement('div');
        cornerCell.className = 'grid-cell corner-header';
        cornerCell.textContent = `Users (${sortedUsers.length})`;
        grid.appendChild(cornerCell);

        // Add streak header
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
            if (date === this.todaysDate.toISOString().split('T')[0]) {
                cell.classList.add('today');
            }
            
            // Add day of week below date
            const daySpan = document.createElement('span');
            daySpan.className = 'day-of-week';
            daySpan.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            cell.appendChild(daySpan);
            
            grid.appendChild(cell);
        });

        // Add user rows with streak and squat data
        sortedUsers.forEach(user => {
            // Username cell
            const nameCell = document.createElement('div');
            nameCell.className = 'grid-cell user-name';
            if (user.userId === this.userId) {
                nameCell.classList.add('current-user');
            }
            nameCell.textContent = user.username;
            grid.appendChild(nameCell);

            // Streak cell
            const streakCell = document.createElement('div');
            streakCell.className = 'grid-cell streak-cell';
            if (user.currentStreak > 0) {
                streakCell.textContent = `${user.currentStreak}🔥`;
            } else {
                streakCell.textContent = '0';
            }
            grid.appendChild(streakCell);

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
                if (date === this.todaysDate.toISOString().split('T')[0]) {
                    cell.classList.add('today');
                }
                
                grid.appendChild(cell);
            });
        });

        console.groupEnd();
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

    showError(message) {
        const errorElement = document.getElementById('username-error');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

new SquatApp();