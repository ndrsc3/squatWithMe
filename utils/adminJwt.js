import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_REFRESH_SECRET = process.env.ADMIN_REFRESH_SECRET;

if (!JWT_SECRET || !ADMIN_REFRESH_SECRET) {
    throw new Error('Missing required JWT environment variables for admin authentication');
}

export function generateAdminAccessToken(admin) {
    return jwt.sign(
        {
            username: admin.username.toLowerCase(),
            role: 'admin',
            permissions: admin.permissions || ['cleanup'],
            lastActive: new Date().toISOString()
        },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

export function generateAdminRefreshToken(admin) {
    return jwt.sign(
        {
            username: admin.username.toLowerCase(),
            role: 'admin'
        },
        ADMIN_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
}

export function verifyAdminAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            throw new Error('Not an admin token');
        }
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        throw new Error('Invalid token');
    }
}

export function verifyAdminRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, ADMIN_REFRESH_SECRET);
        if (decoded.role !== 'admin') {
            throw new Error('Not an admin token');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
}

export function generateAdminTokenPair(admin) {
    return {
        accessToken: generateAdminAccessToken(admin),
        refreshToken: generateAdminRefreshToken(admin)
    };
} 