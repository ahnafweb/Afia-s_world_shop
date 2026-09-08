const jwt = require('jsonwebtoken');
const db = require('../database/database');

const secret = () => process.env.JWT_SECRET || 'dev-secret';

function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(token, secret());
        const user = db.prepare('SELECT id, name, email, role, email_verified, created_at FROM users WHERE id = ?').get(payload.userId);

        if (!user) {
            return res.status(401).json({ error: 'User no longer exists' });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function adminRequired(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = {
    authRequired,
    adminRequired,
    secret
};
