import { verifyUserToken } from '../middleware/userAuth';

async function handler(req, res) {
    // If we get here, the token is valid (middleware already verified it)
    res.status(200).json({ valid: true });
}

// Wrap the handler with user authentication middleware
export default verifyUserToken(handler); 