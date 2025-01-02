import { verifyAdminAccessToken } from '../../utils/adminJwt';

export function verifyAdminToken(handler) {
    return async (req, res) => {
        console.group('🔵 [Middleware] Admin Authentication');
        
        try {
            // Get token from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                console.warn('🟡 [Middleware] No bearer token provided');
                console.groupEnd();
                return res.status(401).json({ error: 'Admin authentication required' });
            }

            const token = authHeader.split(' ')[1];

            try {
                // Verify token
                const decoded = verifyAdminAccessToken(token);
                
                // Add admin data to request
                req.admin = decoded;
                
                console.debug('🔵 [Middleware] Admin verified:', decoded.username);
                console.groupEnd();
                
                // Call the actual handler
                return handler(req, res);
            } catch (error) {
                if (error.message === 'Token expired') {
                    console.warn('🟡 [Middleware] Admin token expired');
                    console.groupEnd();
                    return res.status(401).json({ 
                        error: 'Token expired',
                        code: 'TOKEN_EXPIRED'
                    });
                }
                
                console.error('🔴 [Middleware] Admin token verification failed:', error);
                console.groupEnd();
                return res.status(401).json({ error: 'Invalid admin token' });
            }
        } catch (error) {
            console.error('🔴 [Middleware] Admin authentication error:', error);
            console.groupEnd();
            return res.status(500).json({ error: 'Authentication failed' });
        }
    };
}

export function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.admin?.permissions?.includes(permission)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required: permission
            });
        }
        return next();
    };
} 