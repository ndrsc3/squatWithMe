import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
    throw new Error('Missing required JWT environment variables');
}

export function generateAccessToken(user) {
    return jwt.sign(
        {
            userId: user.userId,
            username: user.username,
            deviceId: user.deviceId,
            deviceTrusted: user.deviceTrusted,
            currentStreak: user.currentStreak || 0,
            lastActive: new Date().toISOString()
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

export function generateRefreshToken(user) {
    return jwt.sign(
        {
            userId: user.userId,
            deviceId: user.deviceId
        },
        REFRESH_SECRET,
        { expiresIn: '30d' }
    );
}

export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        throw new Error('Invalid token');
    }
}

export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
}

export function generateTokenPair(user) {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user)
    };
} 