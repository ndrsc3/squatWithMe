class SquatApp {
    constructor() {
        this.userId = null;
        this.username = null;
        this.ws = null;
        this.lastSquatDate = null;
        this.currentStreak = 0;
        
        // Enable logging in development
        this.debugEnabled = window.location.hostname === 'localhost';
        
        console.debug('🔵 [Init] Initializing SquatApp');
        this.init();
    }

    async init() {
        console.debug('🔵 [Init] Starting initialization');
        this.setupWebSocket();
        this.setupEventListeners();
        this.loadInitialData();

        await this.setupUser();
        if (this.username) {
            console.debug('🔵 [User] Found user:', this.username);
        } else {
            console.debug('🔵 [User] No user found, showing setup screen');
        }
    }

    async setupUser() {
        console.debug('🔵 Setup User');
        const storedUser = localStorage.getItem('squatUser');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            this.userId = userData.userId;
            this.username = userData.username;
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('current-username').textContent = this.username;
        } else {
            document.getElementById('user-setup').classList.remove('hidden');
        }
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
        console.debug('🔵 Save Username');
        const usernameInput = document.getElementById('username');
        const username = usernameInput.value.trim();
        
        if (!username) {
            console.warn('🟡 [User] Empty username submitted');
            this.showError('Username cannot be empty');
            return;
        }

        console.debug('🔵 [User] Attempting to save username:', username);
        try {
            console.time('usernameCheck');
            const response = await fetch('/api/check-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const responseText = await response.text();
            console.debug('🔵 [User] Raw response:', responseText);
            
            try {
                const data = JSON.parse(responseText);
                console.debug('🔵 [User] Parsed response:', data);
            } catch (parseError) {
                console.error('🔴 [User] JSON parse error:', parseError);
                this.showError('Server returned invalid response');
                return;
            }

            console.timeEnd('usernameCheck');

            if (!response.ok) {
                console.warn('🟡 [User] Username validation failed:', data.error);
                this.showError(data.error || 'Username already taken');
                return;
            }

            this.userId = crypto.randomUUID();
            this.username = username;
            
            console.debug('🔵 [User] Username saved. User ID:', this.userId);
            localStorage.setItem('squatUser', JSON.stringify({
                userId: this.userId,
                username: this.username
            }));

            document.getElementById('current-username').textContent = this.username;

            document.getElementById('user-setup').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            
            this.setupWebSocket();
            this.loadInitialData();
        } catch (error) {
            console.error('🔴 [User] Error saving username:', error);
            this.showError('Error saving username');
        }
    }

    showError(message) {
        const errorElement = document.getElementById('username-error');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    async loadInitialData() {
        console.debug('🔵 Load Initial Data');
        console.group('Loading Initial Data');
        try {
            console.time('dataLoad');
            const response = await fetch('/api/get-users');
            const data = await response.json();
            console.timeEnd('dataLoad');
            
            console.debug('🔵 [Data] Users loaded:', data.users.length);
            this.renderGrid(data.users);
            this.updateStats(data.stats);
        } catch (error) {
            console.error('🔴 [Data] Failed to load initial data:', error);
        }
        console.groupEnd();
    }

    async recordSquat() {
        console.debug('🔵 Record Squat');
        const today = new Date().toISOString().split('T')[0];
        if (this.lastSquatDate === today) {
            console.warn('🟡 [Squat] Already recorded squat for today');
            return;
        }

        console.group('Recording Squat');
        try {
            console.time('squatRecord');
            const response = await fetch('/api/record-squat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    username: this.username,
                    date: today
                })
            });
            console.timeEnd('squatRecord');

            if (response.ok) {
                console.debug('🔵 [Squat] Successfully recorded');
                this.lastSquatDate = today;
                document.getElementById('squat-button').disabled = true;
                
                // Store offline backup
                const offlineSquats = JSON.parse(localStorage.getItem('offlineSquats') || '[]');
                offlineSquats.push({ date: today, synced: true });
                localStorage.setItem('offlineSquats', JSON.stringify(offlineSquats));
            }
        } catch (error) {
            console.warn('🟡 [Squat] Failed to record online, storing offline:', error);
            const offlineSquats = JSON.parse(localStorage.getItem('offlineSquats') || '[]');
            offlineSquats.push({ date: today, synced: false });
            localStorage.setItem('offlineSquats', JSON.stringify(offlineSquats));
            
            this.lastSquatDate = today;
            document.getElementById('squat-button').disabled = true;
        }
        console.groupEnd();
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
        console.debug('🔵 Render Grid', { userCount: users.length, users });
        const grid = document.getElementById('squat-grid');
        grid.innerHTML = '';

        // Ensure we have users to display
        if (!users || users.length === 0) {
            console.debug('🔵 No users to display in grid');
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'No users found';
            emptyMessage.className = 'grid-empty-message';
            grid.appendChild(emptyMessage);
            return;
        }

        // Get unique users by userId
        const uniqueUsers = Array.from(new Map(users.map(user => [user.userId, user])).values());
        console.debug('🔵 Unique users:', uniqueUsers.length);

        // Sort users (current user first, then alphabetically by username)
        const sortedUsers = uniqueUsers.sort((a, b) => {
            if (a.userId === this.userId) return -1;
            if (b.userId === this.userId) return 1;
            return a.username.localeCompare(b.username);
        });

        // Get last 27 days including today
        const today = new Date();
        const dates = Array.from({length: 27}, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (26 - i));
            return date.toISOString().split('T')[0];
        });

        // Setup grid layout
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `minmax(100px, auto) repeat(${dates.length}, 1fr)`;
        grid.style.gridTemplateRows = `auto repeat(${sortedUsers.length}, auto)`;

        // Add header row
        const cornerCell = document.createElement('div');
        cornerCell.className = 'grid-cell corner-header';
        cornerCell.textContent = `Users (${sortedUsers.length})`;
        grid.appendChild(cornerCell);

        // Add date headers
        dates.forEach(date => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell date-header';
            const dateObj = new Date(date);
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

        console.debug('🔵 Grid rendered with', sortedUsers.length, 'users');
    }

    updateStats(stats) {
        console.debug('🔵 Update Stats');
        document.getElementById('user-streak').textContent = stats.userStreak || 0;
        document.getElementById('longest-streak').textContent = stats.longestStreak || 0;
        document.getElementById('streak-holder').textContent = stats.streakHolder || '-';
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