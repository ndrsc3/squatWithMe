import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, clearTokenCookie } from './_lib/http';

export default function handler(req: VercelRequest, res: VercelResponse) {
    if (!allowMethods(req, res, 'POST')) return;
    clearTokenCookie(res);
    res.status(200).json({ success: true });
}
