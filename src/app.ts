import * as apiClient from './api-client';
import type { ApiUser } from './api-client';
import { initAuthScreen } from './views/auth';
import { SquatView } from './views/squat';
import {
    renderListsOverview,
    initListCreate,
    renderListDetail,
    initListDetailUI,
} from './views/lists';

/**
 * Orchestrator: login gate → home (squat tracker + lists) with a hash router
 * for list detail (#/list/<id>). Views own their own DOM sections.
 */
export class SquatApp {
    private user: ApiUser | null = null;
    private currentListId: string | null = null;

    async init(): Promise<void> {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.toggle('light-theme', savedTheme === 'light');
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('logout-button')?.addEventListener('click', () => void this.logout());

        initAuthScreen((user) => void this.enterApp(user));
        initListCreate();
        initListDetailUI(() =>
            this.currentListId && this.user ? { listId: this.currentListId, myUserId: this.user.id } : null,
        );
        window.addEventListener('hashchange', () => void this.route());

        // The login gate: a valid session cookie goes straight in, else auth screen.
        try {
            const { user } = await apiClient.me();
            await this.enterApp(user);
        } catch {
            document.getElementById('auth-screen')!.classList.remove('hidden');
        }
    }

    private async enterApp(user: ApiUser): Promise<void> {
        this.user = user;
        document.getElementById('auth-screen')!.classList.add('hidden');
        document.getElementById('current-username')!.textContent = user.displayName ?? user.username;

        await new SquatView(user.id).init();

        await this.route();
    }

    private async route(): Promise<void> {
        if (!this.user) return;
        const match = /^#\/list\/(.+)$/.exec(window.location.hash);
        const home = document.getElementById('main-app')!;
        const detail = document.getElementById('list-detail')!;
        if (match) {
            this.currentListId = match[1];
            home.classList.add('hidden');
            detail.classList.remove('hidden');
            await renderListDetail(this.currentListId, this.user.id);
        } else {
            this.currentListId = null;
            detail.classList.add('hidden');
            home.classList.remove('hidden');
            await renderListsOverview();
        }
    }

    private async logout(): Promise<void> {
        try {
            await apiClient.logout();
        } finally {
            window.location.hash = '';
            window.location.reload();
        }
    }

    private toggleTheme(): void {
        const isLightTheme = document.documentElement.classList.toggle('light-theme');
        localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    }
}
