import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signToken, verifyPassword } from './_lib/auth';
import { allowMethods, setTokenCookie } from './_lib/http';
import { findUserByUsername } from './_lib/users-repo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'POST')) return;

    const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
    if (!username?.trim() || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const found = await findUserByUsername(username.trim());
        if (!found || !verifyPassword(password, found.passwordHash)) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const { passwordHash: _secret, ...user } = found;
        void _secret;
        setTokenCookie(res, await signToken({ userId: user.id, username: user.username }));
        res.status(200).json({ user });
    } catch (error) {
        console.error('[api/auth-login]', error);
        res.status(500).json({ error: 'Login failed' });
    }
}
