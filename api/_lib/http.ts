import type { VercelRequest, VercelResponse } from '@vercel/node';

const TOKEN_MAX_AGE_S = 30 * 24 * 60 * 60; // matches the 30d JWT expiry in auth.ts

/** 405 + Allow header unless the request method is one of `methods`. */
export function allowMethods(req: VercelRequest, res: VercelResponse, ...methods: string[]): boolean {
    if (methods.includes(req.method ?? '')) return true;
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({ error: 'Method not allowed' });
    return false;
}

// `Secure` only when deployed — local `vercel dev` serves plain http.
function cookieFlags(): string {
    const secure = process.env.VERCEL_ENV ? '; Secure' : '';
    return `HttpOnly; Path=/; SameSite=Lax${secure}`;
}

export function setTokenCookie(res: VercelResponse, token: string): void {
    res.setHeader(
        'Set-Cookie',
        `token=${encodeURIComponent(token)}; Max-Age=${TOKEN_MAX_AGE_S}; ${cookieFlags()}`,
    );
}

export function clearTokenCookie(res: VercelResponse): void {
    res.setHeader('Set-Cookie', `token=; Max-Age=0; ${cookieFlags()}`);
}
