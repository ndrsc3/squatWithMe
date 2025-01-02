import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { config } from 'dotenv';

// Load environment variables
config();

const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
    console.error('Error: ADMIN_SECRET environment variable is required');
    process.exit(1);
}

function hashAdminSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
}

async function setupAdmin() {
    try {
        // Admin user data
        const adminUsername = 'admin';
        const hashedSecret = hashAdminSecret(ADMIN_SECRET);
        
        // Create admin user object
        const adminUser = {
            username: adminUsername,
            secretHash: hashedSecret,
            permissions: ['cleanup', 'users', 'data'],
            createdAt: new Date(),
            lastLogin: null
        };

        // Get existing admin users or create new object
        const adminUsers = await kv.get('admin:users') || {};
        
        // Add/update admin user
        adminUsers[adminUsername] = adminUser;
        
        // Save to database
        await kv.set('admin:users', adminUsers);
        
        console.log('✅ Admin user setup completed successfully');
        console.log('Username:', adminUsername);
        console.log('Secret: [stored in environment variables]');
    } catch (error) {
        console.error('❌ Error setting up admin user:', error);
        process.exit(1);
    }
}

// Run setup
setupAdmin(); 