import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hashPassword, signToken } from './_lib/auth.js';
import { allowMethods, setTokenCookie } from './_lib/http.js';
import { createUser, findUserByUsername } from './_lib/users-repo.js';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'POST')) return;

    const { username, password, displayName } = (req.body ?? {}) as {
        username?: string;
        password?: string;
        displayName?: string;
    };
    const name = username?.trim() ?? '';
    if (!USERNAME_RE.test(name)) {
        return res.status(400).json({ error: 'Username must be 3–32 chars: letters, digits, _ or -' });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        if (await findUserByUsername(name)) {
            return res.status(409).json({ error: 'Username is taken' });
        }
        const user = await createUser({
            username: name,
            passwordHash: hashPassword(password),
            displayName: displayName?.trim() || null,
        });
        setTokenCookie(res, await signToken({ userId: user.id, username: user.username }));
        res.status(201).json({ user });
    } catch (error) {
        console.error('[api/auth-signup]', error);
        res.status(500).json({ error: 'Signup failed' });
    }
}
