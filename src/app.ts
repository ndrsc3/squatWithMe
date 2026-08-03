import type { UserRecord, ProcessedSquatData, SquatStats } from './types';
import * as kvClient from './kv-client';
import { initializeDeviceId, generateDeviceFingerprint, setupUser, recoverAccount } from './user';
import { recordSquat, calculateStreak } from './squats';
import { renderGrid } from './leaderboard';

export class SquatApp {
    private squatData: ProcessedSquatData | null = null;
    private userId: string | null = null;
    private username: string | null = null;
    private currentUser: UserRecord | null = null;
    private currentStreak = 0;
    private deviceId: string | null = null;
    private displayDays = 12;
    private squatToday = false;
    private todaysDate: Date;
    private ddInt: number;
    private today: string;
    private monthKey: string;

    constructor() {
        this.todaysDate = new Date();
        const yyyy = this.todaysDate.getFullYear();
        const mm = String(this.todaysDate.getMonth() + 1).padStart(2, '0');
        const dd = String(this.todaysDate.getDate()).padStart(2, '0');
        this.ddInt = parseInt(dd);
        this.today = `${yyyy}-${mm}-${dd}`;
        this.monthKey = `${yyyy}-${mm}`;
    }

    async init(): Promise<void> {
        console.debug('🔵 [Init] Starting initialization');

        this.deviceId = await initializeDeviceId();
        this.setupEventListeners();

        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.toggle('light-theme', savedTheme === 'light');

        await this.setupLocalUser();

        if (this.username) {
            console.debug('🔵 [User] Found user:', this.username);
            await this.fetchUserData();
        } else {
            console.debug('🔵 [User] No user found, showing setup screen');
        }
    }

    private async setupLocalUser(): Promise<void> {
        console.group('🔵 [User] Setup Local User');
        try {
            const storedUser = localStorage.getItem('squatUser');
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser) as { userId?: string; username?: string };
                    if (!userData.userId || !userData.username) {
                        console.warn('🟡 [Storage] Invalid user data structure:', userData);
                        localStorage.removeItem('squatUser');
                        document.getElementById('user-setup')!.classList.remove('hidden');
                        return;
                    }
                    this.userId = userData.userId;
                    this.username = userData.username;
                    document.getElementById('main-app')!.classList.remove('hidden');
                    document.getElementById('current-username')!.textContent = this.username;
                } catch (parseError) {
                    console.error('🔴 [Storage] JSON parse error:', parseError);
                    localStorage.removeItem('squatUser');
                    document.getElementById('user-setup')!.classList.remove('hidden');
                }
            } else {
                console.debug('🔵 [Storage] No stored user found');
                document.getElementById('user-setup')!.classList.remove('hidden');
            }
        } catch (error) {
            console.error('🔴 [Storage] Error in setup process:', error);
            document.getElementById('user-setup')!.classList.remove('hidden');
        }
        console.groupEnd();
    }

    private setupEventListeners(): void {
        document.getElementById('save-username')?.addEventListener('click', () => {
            console.debug('🔵 [Event] Save username button clicked');
            void this.saveUsername();
        });

        document.getElementById('username')?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void this.saveUsername();
            }
        });

        document.getElementById('squat-button')?.addEventListener('click', () => void this.recordSquatHandler());
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());

        document.getElementById('show-recovery')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('user-setup-form')!.classList.add('hidden');
            document.getElementById('account-recovery')!.classList.remove('hidden');
        });

        document.getElementById('show-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('account-recovery')!.classList.add('hidden');
            document.getElementById('user-setup-form')!.classList.remove('hidden');
        });

        document.getElementById('recover-account')?.addEventListener('click', () => void this.recoverAccountHandler());

        document.getElementById('username')?.addEventListener('input', () => {
            document.getElementById('username-error')!.classList.add('hidden');
            document.getElementById('username')!.classList.remove('error');
        });

        document.getElementById('recovery-username')?.addEventListener('input', () => {
            document.getElementById('recovery-error')!.classList.add('hidden');
        });

        document.getElementById('recovery-answer')?.addEventListener('input', () => {
            document.getElementById('recovery-error')!.classList.add('hidden');
        });
    }

    private async saveUsername(): Promise<void> {
        console.group('🔵 [User] Save Username Process');
        try {
            const usernameInput = document.getElementById('username') as HTMLInputElement;
            const username = usernameInput.value.trim();
            const errorElement = document.getElementById('username-error')!;

            if (!username) {
                this.showError('Please enter a username');
                return;
            }

            try {
                await kvClient.checkUsername(username);
            } catch (err) {
                const e = err as { status?: number };
                if (e.status === 409) {
                    errorElement.textContent = 'Username already taken';
                    errorElement.classList.remove('hidden');
                    usernameInput.classList.add('error');
                    return;
                }
                throw err;
            }

            if (!this.userId) {
                this.userId = crypto.randomUUID();
            }

            document.getElementById('user-setup-form')!.classList.add('hidden');
            const recoveryDisplay = document.getElementById('recovery-code-display')!;
            recoveryDisplay.innerHTML = `
                <div class="recovery-code-container">
                    <h3>🤔 One Last Fun Question</h3>
                    <p>If you could shoot a liquid out of your index finger, what would it be?</p>
                    <input type="password" id="recovery-answer" class="recovery-input" placeholder="Your answer..." autocomplete="new-password">
                    <p class="recovery-warning">Remember your answer! You'll need it if you want to recover your account on a new device.</p>
                    <button id="confirm-recovery" class="primary-button">Save My Answer</button>
                    <p id="recovery-error" class="error hidden"></p>
                </div>
            `;
            recoveryDisplay.classList.remove('hidden');

            const recoveryAnswer = await new Promise<string>((resolve, reject) => {
                const confirmButton = document.getElementById('confirm-recovery');
                if (!confirmButton) {
                    reject(new Error('Confirm button not found'));
                    return;
                }

                const handleClick = () => {
                    const answerInput = document.getElementById('recovery-answer') as HTMLInputElement | null;
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
                    confirmButton.removeEventListener('click', handleClick);
                    resolve(answer);
                };

                confirmButton.addEventListener('click', handleClick);
            });

            await setupUser(this.userId, username, this.deviceId, recoveryAnswer);

            this.username = username;

            document.getElementById('recovery-code-display')!.classList.add('hidden');
            document.getElementById('user-setup')!.classList.add('hidden');
            document.getElementById('main-app')!.classList.remove('hidden');
            document.getElementById('current-username')!.textContent = this.username;

            await this.fetchUserData();
        } catch (error) {
            console.error('🔴 [User] Error saving username:', error);
            this.showError('Failed to save username. Please try again.');
            document.getElementById('user-setup-form')?.classList.remove('hidden');
            document.getElementById('recovery-code-display')?.classList.add('hidden');
        }
        console.groupEnd();
    }

    private async recoverAccountHandler(): Promise<void> {
        console.group('🔵 [User] Account Recovery Process');
        try {
            const username = (document.getElementById('recovery-username') as HTMLInputElement).value.trim();
            const recoveryAnswer = (document.getElementById('recovery-answer') as HTMLInputElement | null)?.value.trim();

            if (!username) {
                this.showError('Please enter your username', 'recovery-error');
                return;
            }

            try {
                const result = await recoverAccount(username, recoveryAnswer || undefined, this.deviceId);
                this.userId = result.userId;
                this.username = result.username;

                document.getElementById('user-setup')!.classList.add('hidden');
                document.getElementById('main-app')!.classList.remove('hidden');
                document.getElementById('current-username')!.textContent = this.username;

                await this.fetchUserData();
                console.debug('🔵 [User] Account recovered successfully');
            } catch (err) {
                const e = err as { status?: number; message?: string };
                if (e.status === 401 && !recoveryAnswer) {
                    document.getElementById('recovery-code-container')!.classList.remove('hidden');
                    document.getElementById('recovery-question')!.textContent =
                        'If you could shoot a liquid out of your index finger, what would it be?';
                    this.showError('Please answer the recovery question', 'recovery-error');
                    return;
                }
                this.showError(e.message || 'Recovery failed', 'recovery-error');
            }
        } catch (error) {
            console.error('🔴 [User] Error recovering account:', error);
            this.showError('Failed to recover account. Please try again.', 'recovery-error');
        }
        console.groupEnd();
    }

    private async fetchUserData(): Promise<void> {
        try {
            const data = await kvClient.getUsers();
            this.processUserData(data.users);
        } catch (error) {
            console.error('🔴 [Data] Failed to load data:', error);
            this.showError('Failed to load data. Please try again later.');
        }
    }

    private processUserData(users: UserRecord[]): void {
        const processedUsers = users.map((user) => ({
            ...user,
            currentStreak: calculateStreak(user.squats || {}, this.today),
        }));

        const stats: SquatStats = {
            longestStreak: 0,
            streakHolder: '',
            userStreaks: {},
            activeToday: processedUsers.filter((user) => this.hasSquattedToday(user.squats)).length,
        };

        processedUsers.forEach((user) => {
            stats.userStreaks[user.userId] = user.currentStreak ?? 0;
            if ((user.currentStreak ?? 0) > stats.longestStreak) {
                stats.longestStreak = user.currentStreak ?? 0;
                stats.streakHolder = user.username;
            }
        });

        this.squatData = { users: processedUsers, stats };
        this.currentUser = processedUsers.find((u) => u.userId === this.userId) ?? null;
        this.squatToday = this.hasSquattedToday(this.currentUser?.squats);

        this.updateUI();
    }

    private hasSquattedToday(squats: Record<string, number[]> | undefined): boolean {
        if (!squats) return false;
        return squats[this.monthKey]?.includes(this.ddInt) ?? false;
    }

    private updateUI(): void {
        console.group('🔵 [UI] Updating Interface');
        try {
            if (!this.squatData) {
                console.warn('🟡 [UI] No data available for UI update');
                return;
            }
            this.updateSquatButtonState(this.squatToday);
            this.updateUIStats(this.squatData.stats);
            renderGrid(this.squatData.users, this.userId ?? '', this.today, this.displayDays);
        } catch (error) {
            console.error('🔴 [UI] Error updating interface:', error);
            this.showError('Something went wrong updating the display');
        }
        console.groupEnd();
    }

    private async recordSquatHandler(): Promise<void> {
        console.group('🔵 [Squat] Recording Squat');
        const squatButton = document.getElementById('squat-button')!;
        try {
            squatButton.classList.add('loading');
            await recordSquat(this.userId!, this.today);
            this.squatToday = true;
            this.updateSquatButtonState(true);
            await this.fetchUserData();
            console.debug('🔵 [Squat] Successfully recorded');
        } catch (error) {
            console.error('🔴 [Squat] Error recording:', error);
            const e = error as { name?: string; message?: string };
            if (e.name === 'TypeError') {
                this.showError('Network error. Please check your connection.');
            } else {
                this.showError('Failed to record squat: ' + (e.message ?? ''));
            }
        } finally {
            squatButton.classList.remove('loading');
            console.groupEnd();
        }
    }

    private updateSquatButtonState(hasSquatted: boolean): void {
        const squatButton = document.getElementById('squat-button')!;
        const squatStatus = document.getElementById('squat-status')!;
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

    private updateUIStats(stats: SquatStats): void {
        const userStreak = document.getElementById('user-streak');
        const activeUsers = document.getElementById('active-users');
        const longestStreak = document.getElementById('longest-streak');
        const streakHolder = document.getElementById('streak-holder');

        if (userStreak) userStreak.textContent = String(stats.userStreaks[this.userId ?? ''] ?? 0);
        if (longestStreak) longestStreak.textContent = String(stats.longestStreak || 0);
        if (streakHolder) streakHolder.textContent = stats.streakHolder || '-';
        if (activeUsers) activeUsers.textContent = String(stats.activeToday || 0);
    }

    private showError(message: string, elementId = 'username-error'): void {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    private toggleTheme(): void {
        const isLightTheme = document.documentElement.classList.toggle('light-theme');
        localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    }

    // Generate fingerprint is available via user module; kept here for the
    // recovery flow which calls it inline through setupUser/recoverAccount.
    // Exposed for potential future use:
    generateDeviceFingerprint = generateDeviceFingerprint;
}
