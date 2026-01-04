const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    // Expecting "Bearer <token>"
    const tokenParts = token.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    jwt.verify(tokenParts[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to authenticate token' });
        }
        // Save to request for use in other routes
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.userRole !== role) {
            return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
        }
        next();
    };
};

module.exports = { verifyToken, requireRole };
