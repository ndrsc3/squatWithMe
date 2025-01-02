import { verifyAccessToken } from '../../utils/jwt';

export function verifyUserToken(handler) {
    return async (req, res) => {
        console.group('🔵 [Middleware] User Authentication');
        
        try {
            // Get token from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                console.warn('🟡 [Middleware] No bearer token provided');
                console.groupEnd();
                return res.status(401).json({ error: 'Authentication required' });
            }

            const token = authHeader.split(' ')[1];

            try {
                // Verify token
                const decoded = verifyAccessToken(token);
                
                // Add user data to request
                req.user = decoded;
                
                console.debug('🔵 [Middleware] User verified:', decoded.username);
                console.groupEnd();
                
                // Call the actual handler
                return handler(req, res);
            } catch (error) {
                if (error.message === 'Token expired') {
                    console.warn('🟡 [Middleware] Token expired');
                    console.groupEnd();
                    return res.status(401).json({ 
                        error: 'Token expired',
                        code: 'TOKEN_EXPIRED'
                    });
                }
                
                console.error('🔴 [Middleware] Token verification failed:', error);
                console.groupEnd();
                return res.status(401).json({ error: 'Invalid token' });
            }
        } catch (error) {
            console.error('🔴 [Middleware] Authentication error:', error);
            console.groupEnd();
            return res.status(500).json({ error: 'Authentication failed' });
        }
    };
} 