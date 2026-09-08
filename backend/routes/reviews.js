const express = require('express');
const db = require('../database/database');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function getProductId(value) {
    const product = db.prepare('SELECT id FROM products WHERE id = ? OR slug = ?').get(value, value);
    return product?.id || null;
}

// Public: reviews + rating summary for a product.
router.get('/:product', (req, res) => {
    try {
        const productId = getProductId(req.params.product);
        if (!productId) return res.status(404).json({ error: 'Product not found' });

        const summary = db.prepare(`
            SELECT COUNT(*) AS count, COALESCE(ROUND(AVG(rating), 1), 0) AS average
            FROM reviews WHERE product_id = ?
        `).get(productId);
        const reviews = db.prepare(`
            SELECT r.id, r.user_id, r.rating, r.title, r.comment, r.created_at,
                   u.name AS user_name
            FROM reviews r
            JOIN users u ON u.id = r.user_id
            WHERE r.product_id = ?
            ORDER BY r.id DESC
        `).all(productId);

        res.json({ summary, reviews });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load reviews' });
    }
});

// Logged-in verified customers can review products they purchased.
router.post('/:product', authRequired, (req, res) => {
    const productId = getProductId(req.params.product);
    if (!productId) return res.status(404).json({ error: 'Product not found' });
    if (req.user.role !== 'admin' && req.user.email_verified !== 1) {
        return res.status(403).json({ error: 'Please verify your email before reviewing' });
    }

    const rating = Number(req.body.rating);
    const title = String(req.body.title || '').trim();
    const comment = String(req.body.comment || '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(422).json({ error: 'Rating must be between 1 and 5' });
    }
    if (title.length > 100) return res.status(422).json({ error: 'Review title is too long' });
    if (comment.length < 3 || comment.length > 1000) {
        return res.status(422).json({ error: 'Review must be between 3 and 1000 characters' });
    }

    // A review is available only after the customer has received the product.
    const purchased = db.prepare(`
        SELECT 1
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
        LIMIT 1
    `).get(req.user.id, productId);
    if (!purchased && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You can review this product after a delivered order' });
    }

    try {
        const result = db.prepare(`
            INSERT INTO reviews (product_id, user_id, rating, title, comment)
            VALUES (?, ?, ?, ?, ?)
        `).run(productId, req.user.id, rating, title, comment);
        const review = db.prepare(`
            SELECT r.id, r.user_id, r.rating, r.title, r.comment, r.created_at, u.name AS user_name
            FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.id = ?
        `).get(result.lastInsertRowid);
        res.status(201).json(review);
    } catch (err) {
        if (String(err.code).includes('SQLITE_CONSTRAINT_UNIQUE')) {
            return res.status(409).json({ error: 'You have already reviewed this product' });
        }
        console.error(err);
        res.status(500).json({ error: 'Could not submit review' });
    }
});

module.exports = router;
