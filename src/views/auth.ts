import * as apiClient from '../api-client';
import type { ApiUser } from '../api-client';
import { ApiError } from '../api-client';

/** Login/signup screen. Calls onAuth(user) once a session cookie is established. */
export function initAuthScreen(onAuth: (user: ApiUser) => void): void {
    const loginForm = document.getElementById('login-form')!;
    const signupForm = document.getElementById('signup-form')!;

    const showError = (id: string, message: string) => {
        const el = document.getElementById(id)!;
        el.textContent = message;
        el.classList.remove('hidden');
    };
    const clearErrors = () => {
        document.getElementById('login-error')!.classList.add('hidden');
        document.getElementById('signup-error')!.classList.add('hidden');
    };

    document.getElementById('show-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        clearErrors();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });
    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        clearErrors();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    const submitLogin = async () => {
        const username = (document.getElementById('login-username') as HTMLInputElement).value.trim();
        const password = (document.getElementById('login-password') as HTMLInputElement).value;
        if (!username || !password) return showError('login-error', 'Enter your username and password');
        try {
            const { user } = await apiClient.login(username, password);
            onAuth(user);
        } catch (err) {
            showError('login-error', err instanceof ApiError ? err.message : 'Login failed');
        }
    };

    const submitSignup = async () => {
        const username = (document.getElementById('signup-username') as HTMLInputElement).value.trim();
        const password = (document.getElementById('signup-password') as HTMLInputElement).value;
        const displayName = (document.getElementById('signup-displayname') as HTMLInputElement).value.trim();
        if (!username || !password) return showError('signup-error', 'Choose a username and password');
        try {
            const { user } = await apiClient.signup(username, password, displayName || undefined);
            onAuth(user);
        } catch (err) {
            showError('signup-error', err instanceof ApiError ? err.message : 'Signup failed');
        }
    };

    document.getElementById('login-submit')?.addEventListener('click', () => void submitLogin());
    document.getElementById('signup-submit')?.addEventListener('click', () => void submitSignup());
    for (const [formId, submit] of [
        ['login-form', submitLogin],
        ['signup-form', submitSignup],
    ] as const) {
        document.getElementById(formId)?.addEventListener('keypress', (event) => {
            if ((event as KeyboardEvent).key === 'Enter') {
                event.preventDefault();
                void submit();
            }
        });
    }
}
