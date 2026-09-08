const express = require('express');
const db = require('../database/database');
const { authRequired, adminRequired } = require('../middleware/auth');
const { validate, rules } = require('../middleware/validation');

const router = express.Router();

// GET /api/categories - List categories with product counts
router.get('/', (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.id
            ORDER BY c.name
        `).all();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/categories - Create category (Admin only)
router.post('/', authRequired, adminRequired, validate([rules.name(), rules.slug()]), (req, res) => {
    const { name, slug } = req.body;

    try {
        const result = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug);
        res.status(201).json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
